'use strict';

const PostProviderTokenTest = require('./post_provider_token_test');

class ExistingRegisteredUserTest extends PostProviderTokenTest {

	get description () {
		return `should be ok to set a ${this.provider} token when a registered user with matching email is already on CodeStream`;
	}


	setTestOptions (callback) {
		super.setTestOptions(() => {
			this.userOptions.numRegistered = 1;
			callback();
		});
	}

	getRequestBody () {
		const body = super.getRequestBody();
		body._mockEmail = this.users[0].user.email;
		return body;
	}
}

module.exports = ExistingRegisteredUserTest;
