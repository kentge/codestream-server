'use strict';

var Authentication_Test = require('./authentication_test');
var JSON_Web_Token = require('jsonwebtoken');
var Secrets_Config = require(process.env.CI_API_TOP + '/config/secrets.js');

const DESCRIPTION = 'should prevent access to resources when the user found in the payload of the access token does not exist';

class Authentication_User_Not_Found_Test extends Authentication_Test {

	get_description () {
		return DESCRIPTION;
	}

	get_expected_error () {
 		return {
 			code: 'AUTH-1004'
 		};
 	}
	before (callback) {
		this.alter_user_id_in_token(() => {
			super.before(callback);
		});
	}

	alter_user_id_in_token (callback) {
		var payload;
		const secret = Secrets_Config.auth;
		try {
			payload = JSON_Web_Token.verify(this.token, secret);
		}
		catch(error) {
			return callback('invalid token: ' + error);
		}
		payload.user_id = 'xxx';
		this.token = JSON_Web_Token.sign(payload, secret);
		callback();
	}
}

module.exports = Authentication_User_Not_Found_Test;
