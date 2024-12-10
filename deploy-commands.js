require('dotenv').config();

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const testGuildId = process.env.TEST_GUILD_ID;
const prodGuildId = process.env.PROD_GUILD_ID;

const createLogger = require('./loggerFactory');
const logger = createLogger('deploy-commands');

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const commands = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			logger.warn(
				`The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

const rest = new REST().setToken(token);

(async () => {
	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, testGuildId),
			// Routes.applicationGuildCommands(clientId, prodGuildId),
			// Routes.applicationCommands(clientId), // for deploy global commands
			{ body: commands }
		);

		logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		logger.error(error);
	}
})();
