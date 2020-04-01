'use strict';

const RemoveUserTest = require('./remove_user_test');
const BoundAsync = require(process.env.CS_API_TOP + '/server_utils/bound_async');
const Assert = require('assert');
const PubNub = require('pubnub');
const MockPubnub = require(process.env.CS_API_TOP + '/server_utils/pubnub/mock_pubnub');
const PubNubConfig = require(process.env.CS_API_TOP + '/config/pubnub');
const IpcConfig = require(process.env.CS_API_TOP + '/config/ipc');
const PubNubClient = require(process.env.CS_API_TOP + '/server_utils/pubnub/pubnub_client_async');
const SocketClusterConfig = require(process.env.CS_API_TOP + '/config/socketcluster');
const SocketClusterClient = require(process.env.CS_API_TOP + '/server_utils/socketcluster/socketcluster_client');

class TeamSubscriptionRevokedTest extends RemoveUserTest {

	constructor (options) {
		super(options);
		this.usingSocketCluster = SocketClusterConfig.port;
	}

	get description () {
		return 'users removed from a team should no longer be able to subscribe to the team channel for that team';
	}

	after (callback) {
		this.broadcasterClient.unsubscribeAll();
		this.broadcasterClient.disconnect();
		super.after(callback);
	}

	// run the actual test...
	run (callback) {
		// do the normal test, removing the current user, but afterwards try to
		// subscribe to the team channel, which should fail
		BoundAsync.series(this, [
			super.run,
			this.makeBroadcasterClient,
			this.trySubscribeToTeam
		], callback);
	}

	makeBroadcasterClient (callback) {
		// create a pubnub client and attempt to subscribe to the team channel
		this.broadcasterClient = this.createBroadcasterClient();
		(async () => {
			await this.broadcasterClient.init();
			callback();
		})();
	}

	createBroadcasterClient () {
		if (this.usingSocketCluster) {
			return this.createSocketClusterClient();
		}
		else {
			return this.createPubnubClient();
		}
	}

	createSocketClusterClient () {
		const config = Object.assign({}, SocketClusterConfig, {
			uid: this.users[1].user.id,
			authKey: this.users[1].broadcasterToken 
		});
		return new SocketClusterClient(config);
	}

	createPubnubClient () { 
		// we remove the secretKey, which clients should NEVER have, and the publishKey, which we won't be using
		const clientConfig = Object.assign({}, PubNubConfig);
		delete clientConfig.secretKey;
		delete clientConfig.publishKey;
		clientConfig.uuid = this.users[1].user._pubnubUuid || this.users[1].user.id;
		clientConfig.authKey = this.users[1].broadcasterToken;
		if (this.mockMode) {
			clientConfig.ipc = this.ipc;
			clientConfig.serverId = IpcConfig.serverId;
		}
		let client = this.mockMode ? new MockPubnub(clientConfig) : new PubNub(clientConfig);
		return new PubNubClient({
			pubnub: client
		});
	}

	// try to subscribe to the team channel
	trySubscribeToTeam (callback) {
		(async () => {
			try {
				await this.broadcasterClient.subscribe(
					`team-${this.team.id}`,
					() => {
						Assert.fail('message received on team channel');
					}
				);
				Assert.fail('subscription to team channel was successful');
			} 
			catch (error) {
				callback();
			}
		})();
	}
}

module.exports = TeamSubscriptionRevokedTest;
