const createLogger = require('../loggerFactory');
const logger = createLogger('bot');

const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
	},
};
