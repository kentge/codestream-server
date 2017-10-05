'use strict';

var API_Server_Module = require(process.env.CI_API_TOP + '/lib/api_server/api_server_module.js');

const DEPENDENCIES = [
	'authenticator',
	'request_id'
];

class Access_Logger extends API_Server_Module {

	get_dependencies () {
		return DEPENDENCIES;
	}

	middlewares () {
		return (request, response, next) => {
			var start_timer = +new Date();
			this.log_request(request, response, 'BEGIN', start_timer);
			response.on('finish', () => {
				this.log_request(request, response, 'COMPLETE', start_timer);
			});
			response.on('close', () => {
				this.log_request(request, response, 'ABORTED', start_timer);
			});
			response.on('complete', () => {
				this.log_request(request, response, 'DONE', start_timer);
			});
			process.nextTick(next);
		};
	}

	log_request (request, response, status, start_timer) {
		var elapsed_time = new Date().getTime() - start_timer;  // more like elapsed time until event loop gets to here
		var user_id = (request.user && request.user._id) || '???';
		this.logger.log(
			request.id                     + ' '   +
			status                         + ' '   +
			request.method                 + ' '   + 
			request.url                    + ' '   + 
			user_id                        + ' '   + 
			response.statusCode            + ' '   + 
			response.get('content-length') + ' '   + 
			elapsed_time                   + ' '   +
			request.headers.host           + ' "'  +
			request.headers.referer        + '" "' +
			request.headers['user-agent']  + '"'
		);
	}
}

module.exports = Access_Logger;