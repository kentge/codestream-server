// provides an analytics service to the API server, allowing analytics events to be
// tracked server-side
'use strict';

const APIServerModule = require(process.env.CS_API_TOP + '/lib/api_server/api_server_module');
const AnalyticsClient = require('./analytics_client');

const ROUTES = [
	{
		method: 'get',
		path: '/no-auth/telemetry-key',
		func: 'handleTelemetryKey',
		describe: 'describeTelemetryKey'
	}
];

class Analytics extends APIServerModule {

	getRoutes () {
		return ROUTES;
	}

	services () {
		// return a function that, when invoked, returns a service structure with the 
		// segment analytics client as the analytics service
		return async () => {
			this.api.log('Connecting to Segment Analytics...');
			const config = Object.assign({}, this.api.config.segment, {
				testCallback: this.testCallback.bind(this),
				logger: this.api
			});
			this.analyticsClient = new AnalyticsClient(config);
			return { analytics: this.analyticsClient };
		};
	}

	// when testing tracking, we'll get the event data that would otherwise be sent to
	// the segment analytics server through this callback, we'll send it along through the
	// user's me-channel, which the test client should be listening to
	async testCallback (type, data, user, request) {
		if (!user || !this.api.services.messager) { return; }
		const channel = request.request.headers['x-cs-track-channel'] || `user-${user.id}`;
		const message = { type, data };
		await this.api.services.messager.publish(
			message,
			channel,
			request
		);
	}
	
	// handle request to fetch telemetry keys, one level of indirection used to retrieve
	// the keys the client will use for telemetry (this is a write key and can not be used 
	// to read anything)
	handleTelemetryKey (request, response) {
		if (request.query.secret !== this.api.config.secrets.telemetry) {
			return response.status(403).send({ error: 'incorrect telemetry secret' });
		}
		const token = this.api.config.segment.token;
		if (!token) {
			return response.status(403).send({ error: 'no telemetry token available' });
		}
		response.send({
			key: this.api.config.segment.token
		});
	}

	describeTelemetryKey () {
		return {
			tag: 'telemetry-key',
			summary: 'Retrieve telemetry key',
			description: 'Retrieve telemetry key for use with telemetry service',
			access: 'User must provide the secret',
			input: 'Specify the secret in the query parameter "secret"',
			returns: {
				summary: 'The telemetry key to use when making client-side telemetry calls',
				looksLike: {
					key: '<The key>'
				}
			}
		};
	}

}

module.exports = Analytics;
