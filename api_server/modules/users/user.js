// provides the User model for handling users

'use strict';

var CodeStreamModel = require(process.env.CS_API_TOP + '/lib/models/codestream_model');
var UserValidator = require('./user_validator');
var ArrayUtilities = require(process.env.CS_API_TOP + '/server_utils/array_utilities.js');
var DeepClone = require(process.env.CS_API_TOP + '/server_utils/deep_clone');
const UserAttributes = require('./user_attributes');
const Path = require('path');

class User extends CodeStreamModel {

	getValidator () {
		return new UserValidator();
	}

	// right before a user is saved...
	preSave (callback, options) {
		if (this.attributes.email) {	// searchable email is a lowercase form for case-insensitive matching
			this.attributes.searchableEmail = this.attributes.email.toLowerCase();
		}
		// ensure all stored IDs are lowercase
		this.lowerCase('teamIds');
		this.lowerCase('companyIds');
		super.preSave(callback, options);
	}

	// is the user a member of all of these companies?
	hasCompanies (ids) {
		return ArrayUtilities.hasAllElements(
			this.get('companyIds') || [],
			ids
		);
	}

	// is the user a member of the given company?
	hasCompany (id) {
		return (this.get('companyIds') || []).indexOf(id) !== -1;
	}

	// is the user a member of all these teams?
	hasTeams (ids) {
		return ArrayUtilities.hasAllElements(
			this.get('teamIds') || [],
			ids
		);
	}

	// is the user a member of the given team?
	hasTeam (id) {
		return (this.get('teamIds') || []).indexOf(id) !== -1;
	}

	// authorize the user to "access" the given model, based on type
	authorizeModel (modelName, id, request, callback) {
		switch (modelName) {
		case 'company':
			return this.authorizeCompany(id, request, callback);
		case 'team':
			return this.authorizeTeam(id, request, callback);
		case 'repo':
			return this.authorizeRepo(id, request, callback);
		case 'stream':
			return this.authorizeStream(id, request, callback);
		case 'post':
			return this.authorizePost(id, request, callback);
		case 'marker':
			return this.authorizeMarker(id, request, callback);
		case 'user':
			return this.authorizeUser(id, request, callback);
		default:
			return callback(null, false);
		}
	}

	// authorize the user to "access" a company model, based on ID
	authorizeCompany (id, request, callback) {
		return callback(null, this.hasCompany(id));
	}

	// authorize the user to "access" a team model, based on ID
	authorizeTeam (id, request, callback) {
		return callback(null, this.hasTeam(id));
	}

	// authorize the user to "access" a repo model, based on ID
	authorizeRepo (id, request, callback) {
		// a repo is authorized if the user is a member of the team that owns it
		request.data.repos.getById(
			id,
			(error, repo) => {
				if (error) { return callback(error); }
				if (!repo) {
					return callback(request.errorHandler.error('notFound', { info: 'repo' }));
				}
				this.authorizeTeam(
					repo.get('teamId'),
					request,
					(error, authorized) => {
						callback(error, authorized ? repo : false);
					}
				);
			}
		);
	}

	// authorize the user to "access" a stream model, based on ID
	authorizeStream (id, request, callback) {
		// a stream is authorized depending on its type ... for file-type streams,
		// the user must be a member of the team that owns it ... for channel and
		// direct streams, the user must be an explicit member of the stream
		request.data.streams.getById(
			id,
			(error, stream) => {
				if (error) { return callback(error); }
				if (!stream) {
					return callback(request.errorHandler.error('notFound', { info: 'stream' }));
				}
				if (
					stream.get('type') !== 'file' &&
					stream.get('memberIds').indexOf(this.id) === -1
				) {
					return callback(null, false);
				}
				this.authorizeTeam(
					stream.get('teamId'),
					request,
					(error, authorized) => {
						callback(error, authorized ? stream : false);
					}
				);
			}
		);
	}

	// authorize the user to "access" a post model, based on ID
	authorizePost (id, request, callback) {
		// to access a post, the user must have access to the stream it belongs to
		// (this is for read access)
		request.data.posts.getById(
			id,
			(error, post) => {
				if (error) { return callback(error); }
				if (!post) {
					return callback(request.errorHandler.error('notFound', { info: 'post' }));
				}
				this.authorizeStream(
					post.get('streamId'),
					request,
					(error, authorized) => {
						callback(error, authorized ? post : false);
					}
				);
			}
		);
	}

	// authorize the user to "access" a marker model, based on ID
	authorizeMarker (id, request, callback) {
		// to access a marker, the user must have access to the stream it belongs to
		// (this is for read access)
		request.data.markers.getById(
			id,
			(error, marker) => {
				if (error) { return callback(error); }
				if (!marker) {
					return callback(request.errorHandler.error('notFound', { info: 'marker' }));
				}
				this.authorizeStream(
					marker.get('streamId'),
					request,
					(error, authorized) => {
						callback(error, authorized ? marker : false);
					}
				);
			}
		);
	}

	// authorize the user to "access" a user model, based on ID
	authorizeUser (id, request, callback) {
		// user can always access their own me-object
		if (
			id === request.user.id ||
			id.toLowerCase() === 'me'
		) {
			return callback(null, request.user);
		}
		// users are authorized to access only other users on their teams
		request.data.users.getById(
			id,
			(error, otherUser) => {
				if (error) { return callback(error); }
				if (!otherUser) {
					return callback(request.errorHandler.error('notFound', { info: 'user' }));
				}
				// the current user and the user they are trying to access must have
				// at least one team in common
				let authorized = ArrayUtilities.hasCommonElement(
					request.user.get('teamIds') || [],
					otherUser.get('teamIds') || []
				);
				return callback(null, authorized ? otherUser : false);
			}
		);
	}

	// authorize the current user for access to a team, as given by IDs in the request
	authorizeFromTeamId (input, request, callback, options = {}) {
		if (!input.teamId) {
			return callback(request.errorHandler.error('parameterRequired', { info: 'teamId' }));
		}
		let teamId = decodeURIComponent(input.teamId).toLowerCase();
		this.authorizeTeam(
			teamId,
			request,
			(error, authorized) => {
				if (error) { return callback(error); }
				if (!authorized) {
					return callback(request.errorHandler.error(options.error || 'readAuth'));
				}
				return process.nextTick(callback);
			}
		);
	}

	// authorize the current user for access to a stream owned by a team, as given
	// by IDs in a request
	authorizeFromTeamIdAndStreamId (input, request, callback, options = {}) {
		let info = {};
		// team ID and stream ID are required, and the user must have access to the stream
		if (!input.teamId) {
			return callback(request.errorHandler.error('parameterRequired', { info: 'teamId' }));
		}
		else if (typeof input.teamId !== 'string') {
			return callback(request.errorHandler.error('invalidParameter', { info: 'teamId' }));
		}
		info.teamId = input.teamId.toLowerCase();
		if (!input.streamId) {
			return callback(request.errorHandler.error('parameterRequired', { info: 'streamId' }));
		}
		else if (typeof input.streamId !== 'string') {
			return callback(request.errorHandler.error('invalidParameter', { info: 'streamId' }));
		}
		info.streamId = input.streamId.toLowerCase();
		this.authorizeStream(info.streamId, request, (error, stream) => {
			if (error) { return callback(error); }
			if (!stream || (options.mustBeFileStream && stream.get('type') !== 'file')) {
				return callback(request.errorHandler.error(options.error || 'readAuth', { reason: 'not a file stream' }));
			}
			if (stream.get('teamId') !== info.teamId) {
				// stream must be owned by the given team, this anticipates sharding where this query
				// may not return a valid stream even if it exists but is not owned by the same team
				return callback(request.errorHandler.error('notFound', { info: 'stream' }));
			}
			info.stream = stream;
			process.nextTick(() => { callback(null, info); });
		});
	}

	// get the me-only attributes present in this user's attributes ... me-only attributes
	// are attributes only the user those attributes belongs to can see ... other users
	// can never see them
	getMeOnlyAttributes () {
		let meOnlyAttributes = {};
		let meAttributes = Object.keys(UserAttributes).filter(attribute => UserAttributes[attribute].forMe);
		meAttributes.forEach(attribute => {
			if (typeof this.attributes[attribute] !== 'undefined') {
				meOnlyAttributes[attribute] = DeepClone(this.attributes[attribute]);
			}
		});
		return meOnlyAttributes;
	}

	// determine if this user wants an email notification for a post in the given
	// stream, which may depend on whether they are mentioned in the post
	wantsEmail (stream, mentioned) {
		// first, look for a general email preference of 'off'
		let preferences = this.get('preferences') || {};
		if (
			preferences &&
			(
				preferences.emailNotifications === 'off' ||
				(
					preferences.emailNotifications === 'mentions' &&
					!mentioned
				)
			)
		) {
			return false;
		}

		// now look for individual stream treatments for the repo,
		// paths can be muted
		let streamTreatments = typeof preferences.streamTreatments === 'object' &&
			preferences.streamTreatments[stream.get('repoId')];
		if (!streamTreatments) {
			return true;
		}

		let n = 0;	// failsafe to prevent infinite loop
		// walk up the path tree looking for any muted directories
		let path = stream.get('file');
		do {
			let starryPath = path.replace(/\./g, '*');
			if (streamTreatments[starryPath] === 'mute') {
				return false;
			}
			path = (path === '/' || path === '.') ? null : Path.dirname(path);
			n++;
		} while (path && n < 100);	// god help them if they have paths with 100 levels

		// no muted directories that are parents to this file, we are free to
		// send a notification!
		return true;
	}

	// get a sanitized me-object ... we normally "sanitize" server-only attributes
	// out of an object, but for the user's own me-object, there are attributes that
	// they are allowed to see, but no others 
	getSanitizedObjectForMe () {
		let meOnlyAttributes = this.getMeOnlyAttributes();
		let sanitizedAttributes = this.getSanitizedObject();
		return Object.assign(sanitizedAttributes, meOnlyAttributes);
	}
}

module.exports = User;
