const createLogger = require('../../loggerFactory');
const logger = createLogger('bot');

const { getCurrentSounds, simplifySoundData } = require('../../api/soundboard');

const {
	SlashCommandBuilder,
	MessageFlags,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
} = require('discord.js');

module.exports = {
	category: 'utility',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription(
			'Start the main function of the bot (quick replacement of soundboard sounds).'
		),
	async execute(interaction) {
		await start(interaction);
	},
};

async function start(interaction) {
	const evailableSounds = interaction.client.evailableSounds;

	if (evailableSounds.length === 0) {
		interaction.reply({
			content: '⚠️ No legendary phrases available at the moment!',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// TODO: Maybe change this solution to update the information about the current server's soundboard sounds
	//  after each request to add or replace a sound (e.g., when a button is clicked). This is a better solution
	//  in terms of consistency compared to the current approach, where the information is only updated when
	//  the main process starts. However, a drawback is that it increases the number of requests to the Discord API,
	//  which could impact performance and potentially lead to issues with the API's rate limits.
	const isUpdated = await updateInfoAboutCurrentSounds(interaction);
	if (!isUpdated) {
		interaction.reply({
			content:
				"❌ Unable to load information about the current server's soundboard sounds. Please try again later.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.reply('Here are available legend phrases:');

	const soundsByCategory = evailableSounds.reduce((acc, sound) => {
		const { category } = sound;
		if (!acc[category]) {
			acc[category] = [];
		}
		acc[category].push(sound);
		return acc;
	}, {});

	for (const [category, sounds] of Object.entries(soundsByCategory)) {
		const rowsMatrix = prepareAvailableSounds(sounds);

		const categoryData = interaction.client.evailableCategories.find(
			(cat) => cat.id === category
		);
		const categoryName = categoryData ? categoryData.name : category;
		await interaction.channel.send(`## ${categoryName}:`);
		for (const row of rowsMatrix) {
			await interaction.channel.send({
				components: row,
			});
		}
	}
}

async function updateInfoAboutCurrentSounds(interaction) {
	try {
		const response = await getCurrentSounds(interaction.guild.id);

		const responseData = await response.json();
		if (response.ok) {
			interaction.client.currentServerSounds =
				responseData.items.map(simplifySoundData);

			logger.debug(
				"Current server's soundboard sounds successfully loaded:",
				interaction.client.currentServerSounds
			);
			return true;
		} else {
			logger.error(
				`An error occurred while loading current server's soundboard sounds. Status: ${
					response.statusText
				}. Message: ${JSON.stringify(responseData.message)}`
			);
			return false;
		}
	} catch (error) {
		logger.error(
			`An error occurred while processing the request to get the current server's soundboard sounds: ${error}`
		);
		return false;
	}
}

function prepareAvailableSounds(evailableSounds) {
	const result = [];
	const MAX_BUTTONS_PER_ROW = 5;
	const MAX_ROWS_PER_MESSAGE = 5;

	for (
		let i = 0;
		i < evailableSounds.length;
		i += MAX_ROWS_PER_MESSAGE * MAX_BUTTONS_PER_ROW
	) {
		const messageRows = [];

		for (
			let j = i;
			j < i + MAX_ROWS_PER_MESSAGE * MAX_BUTTONS_PER_ROW;
			j += MAX_BUTTONS_PER_ROW
		) {
			const buttonsChunk = evailableSounds
				.slice(j, j + MAX_BUTTONS_PER_ROW)
				.map((sound) =>
					new ButtonBuilder()
						.setCustomId(sound.custom_id)
						.setLabel(sound.name)
						.setStyle(ButtonStyle.Secondary)
						.setEmoji(sound.emoji_name || null)
				);

			if (buttonsChunk.length > 0) {
				messageRows.push(new ActionRowBuilder().addComponents(buttonsChunk));
			}
		}

		if (messageRows.length > 0) {
			result.push(messageRows);
		}
	}

	return result;
}
