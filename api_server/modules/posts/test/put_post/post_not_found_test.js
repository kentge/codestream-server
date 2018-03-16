'use strict';

var PutPostTest = require('./put_post_test');
var ObjectID = require('mongodb').ObjectID;

class PostNotFoundTest extends PutPostTest {

	get description () {
		return 'should return an error when trying to update a post that doesn\'t exist';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'post'
		};
	}

	// before the test runs...
	before (callback) {
		super.before(error => {
			if (error) { return callback(error); }
			this.path = '/posts/' + ObjectID(); // substitute an ID for a non-existent post
			callback();
		});
	}
}

module.exports = PostNotFoundTest;
