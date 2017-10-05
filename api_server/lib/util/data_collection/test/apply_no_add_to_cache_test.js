'use strict';

var Bound_Async = require(process.env.CI_API_TOP + '/lib/util/bound_async');
var Update_To_Cache_Test = require('./update_to_cache_test');

class Apply_No_Add_To_Cache_Test extends Update_To_Cache_Test {

	get_description () {
		return 'should get an unchanged model after applying a no-op add update to a cached model';
	}

	update_test_model (callback) {
		var update = {
			array: 4
		};
		this.data.test.apply_op_by_id(
			this.test_model.id,
			{ add: update },
			callback
		);
	}
}

module.exports = Apply_No_Add_To_Cache_Test;
