'use strict';

var CodeStreamAPITest = require(process.env.CS_API_TOP + '/lib/test_base/codestream_api_test');
var BoundAsync = require(process.env.CS_API_TOP + '/server_utils/bound_async');

class ACLTest extends CodeStreamAPITest {

	get description () {
		return `should return an error when trying to create a ${this.type} stream in a team that i'm not a member of`;
	}

	get method () {
		return 'post';
	}

	get path () {
		return '/streams';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1011'
		};
	}

	// before the test runs...
	before (callback) {
		BoundAsync.series(this, [
			this.createOtherUser,	// create another registered user
			this.createOtherRepo,	// create a team and repo, but the current user is not a member
			this.makeStreamData		// make the stream data to pass in the test request
		], callback);
	}

	// create a second registered user
	createOtherUser (callback) {
		this.userFactory.createRandomUser(
			(error, response) => {
				if (error) { return callback(error); }
				this.otherUserData = response;
				callback();
			}
		);
	}

	// create a repo and team, but the current user is not a member
	createOtherRepo (callback) {
		this.repoFactory.createRandomRepo(
			(error, response) => {
				if (error) { return callback(error); }
				this.team = response.team;
				this.repo = response.repo;
				callback();
			},
			{
				withRandomEmails: 2,	// add a few random unregistered users for good measure
				token: this.otherUserData.accessToken	// "other" user creates the repo and team
			}
		);
	}

	// make the stream data to pass in the test request
	makeStreamData (callback) {
		this.streamFactory.getRandomStreamData(
			(error, data) => {
				if (error) { return callback(error); }
				this.data = data;
				callback();
			},
			{
				type: this.type,
				teamId: this.team._id,
				repoId: this.type === 'file' ? this.repo._id : null	// file-type streams require a repo ID
			}
		);
	}
}

module.exports = ACLTest;
