'use strict';

module.exports = {
	sendgrid: {
		url: '/v3/mail/send',
		api_key: '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',
		divert_to: process.env.CI_DIVERT_EMAILS_TO,
		block: process.env.CI_BLOCK_EMAILS
	},
	sender_email: 'colin_stryker@hotmail.com',	 // Just for test purposes!!!
	confirmation_email_template_id: '300934c5-3a9c-46f8-a905-b801c23439ab',
};
