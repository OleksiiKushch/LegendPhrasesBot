require('dotenv').config();

const token = process.env.BOT_TOKEN;

const { soundsDataFilePath, categoriesDataFilePath } = require('./config.json');

const createLogger = require('./loggerFactory');
const logger = createLogger('bot');

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
client.cooldowns = new Collection();

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
			client.commands.set(command.data.name, command);
		} else {
			logger.warn(
				`The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.evailableSounds = [];
client.evailableCategories = [];
client.currentServerSounds = [];

fs.readFile(soundsDataFilePath, 'utf8', async (error, data) => {
	if (error) {
		logger.error(
			`An error occurred while reading the file '${soundsDataFilePath}': ${error}`
		);
		return;
	}

	logger.info(
		`Sounds data from the file '${soundsDataFilePath}' were loaded successfully.`
	);

	try {
		client.evailableSounds = JSON.parse(data);
	} catch (error) {
		logger.error(
			`An error occurred while parsing data from the file '${soundsDataFilePath}': ${error}`
		);
	}
});

fs.readFile(categoriesDataFilePath, 'utf8', async (error, data) => {
	if (error) {
		logger.error(
			`An error occurred while reading the file '${categoriesDataFilePath}': ${error}`
		);
		return;
	}

	logger.info(
		`Categories of sounds data from the file '${categoriesDataFilePath}' were loaded successfully.`
	);

	try {
		client.evailableCategories = JSON.parse(data);
	} catch (error) {
		logger.error(
			`An error occurred while parsing data from the file '${categoriesDataFilePath}': ${error}`
		);
	}
});

client.login(token);
