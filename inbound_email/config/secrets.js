// secrets, never let these out beyond the server!!!

'use strict';

module.exports = {
	mailSecret: process.env.CS_INBOUND_EMAIL_SECRET, // for internal comms with API server
	confirmationCheat: 'H5(bt#@QkMz$'	// for bypassing email confirmation, used for unit testing
};
