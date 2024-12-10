const {
	defaultInteractionCooldown,
	discordSoundboardNoBoostLimit,
} = require('../config.json');

const discordSoundboardTierLimits = require('../constants.js');

const createLogger = require('../loggerFactory');
const logger = createLogger('bot');

const { createSound, deleteSound, simplifySoundData } = require('../api/soundboard');

const { Events, MessageFlags, Collection } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			await processChatInputCommandInteraction(interaction);
		} else if (interaction.isButton()) {
			await processButtonInteraction(interaction);
		}
	},
};

async function processChatInputCommandInteraction(interaction) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		logger.error(`No command matching \`${interaction.commandName}\` was found.`);
		return;
	}

	const { cooldowns } = interaction.client;

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.data.name);
	const cooldownAmount = (command.cooldown ?? defaultInteractionCooldown) * 1000;

	if (timestamps.has(interaction.user.id)) {
		const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1000);
			return interaction.reply({
				content: `⚠️ Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

	try {
		await command.execute(interaction);
	} catch (error) {
		logger.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: '❌ An error occurred while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: '❌ An error occurred while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}

async function processButtonInteraction(interaction) {
	const evailableSounds = interaction.client.evailableSounds;

	const soundData = evailableSounds.find(
		(sound) => sound.custom_id === interaction.customId
	);

	if (soundData) {
		const currentServerSounds = interaction.client.currentServerSounds;
		const isAlreadyPresent = currentServerSounds.find(
			(sound) => sound.name === soundData.name
		);
		if (isAlreadyPresent) {
			logger.warn(`Sound with name "${soundData.name}" already exists.`);
			await interaction.reply({
				content: `⚠️ The sound \`${soundData.name}\` already exists in the current server's soundboard!`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const guildId = interaction.guild.id;
		const premiumTier = interaction.guild.premiumTier;
		const soundboardLimit =
			discordSoundboardTierLimits[premiumTier] || discordSoundboardNoBoostLimit;
		logger.debug(
			`Server Premium Tier: '${premiumTier}', Soundboard Limit: '${soundboardLimit}'.`
		);
		if (currentServerSounds.length <= soundboardLimit) {
			addSound(guildId, soundData, interaction);
		} else {
			logger.warn(
				`The server has reached its soundboard limit. Tier: '${premiumTier}', Limit: '${soundboardLimit}'.`
			);
			await interaction.reply({
				content: `⚠️ The current server has reached its soundboard sound limit. The server's premium tier (boost level) is \`${premiumTier}\`, which sets the limit to \`${soundboardLimit}\` sounds.`,
				flags: MessageFlags.Ephemeral,
			});
			replaceSound(guildId, soundData, interaction);
		}
	} else {
		logger.error(`Sound with id '${interaction.customId}' not found!`);
		await interaction.reply({
			content: `❌ Sound not found. Please restart the command by sending \`/start\` again and try once more.`,
			flags: MessageFlags.Ephemeral,
		});
	}
}

async function addSound(guildId, soundData, interaction, isAfterRemove = false) {
	try {
		const response = await createSound(guildId, soundData);

		const responseData = await response.json();
		if (response.ok) {
			interaction.client.currentServerSounds.push(simplifySoundData(responseData));
			logger.info(`Sound with name "${soundData.name}" added successfully.`);
			const replyMessage = `✅ Sound \`${responseData.name}\` was successfully **added** to the current server's soundboard!`;
			if (isAfterRemove) {
				await interaction.followUp({
					content: replyMessage,
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: replyMessage,
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			logger.error(
				`An error occurred while adding soundboard sound with name "${soundData.name}". Status: ${
					response.statusText
				}. Message: ${JSON.stringify(responseData.message)}`
			);

			// maximum number of soundboard sounds reached
			if (responseData.code === 30045) {
				const replyMessage = `⚠️ The current server has reached its soundboard sound limit!`;
				if (isAfterRemove) {
					await interaction.followUp({
						content: replyMessage,
						flags: MessageFlags.Ephemeral,
					});
				} else {
					await interaction.reply({
						content: replyMessage,
						flags: MessageFlags.Ephemeral,
					});
				}
				replaceSound(guildId, soundData, interaction);
			} else {
				const replyMessage = `❌ An unexpected error occurred. Please restart the command using \`/start\` and try again. If the issue persists, please try again later.`;
				if (isAfterRemove) {
					await interaction.followUp({
						content: replyMessage,
						flags: MessageFlags.Ephemeral,
					});
				} else {
					await interaction.reply({
						content: replyMessage,
						flags: MessageFlags.Ephemeral,
					});
				}
			}
		}
	} catch (error) {
		logger.error(
			`An error occurred while processing the request to add a new soundboard sound: ${error}`
		);
		const replyMessage = `❌ An unexpected error occurred. Please restart the command using \`/start\` and try again. If the issue persists, please try again later.`;
		if (isAfterRemove) {
			await interaction.followUp({
				content: replyMessage,
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: replyMessage,
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}

async function replaceSound(guildId, soundData, interaction) {
	let nextReplacementSound = interaction.client.currentServerSounds.shift();

	try {
		const response = await deleteSound(guildId, nextReplacementSound.sound_id);

		if (response.ok) {
			logger.info(
				`Sound with name "${nextReplacementSound.name}" removed successfully.`
			);
			await interaction.followUp({
				content: `⚠️ Sound \`${nextReplacementSound.name}\` was successfully **removed** from the current server's soundboard!`,
				flags: MessageFlags.Ephemeral,
			});

			addSound(guildId, soundData, interaction, true);
		} else {
			const responseData = await response.json();
			logger.error(
				`An error occurred while removing soundboard sound with name "${nextReplacementSound.name}". Status: ${
					response.statusText
				}. Message: ${JSON.stringify(responseData.message)}`
			);
			await interaction.followUp({
				content: `❌ An unexpected error occurred. Please restart the command using \`/start\` and try again. If the issue persists, please try again later.`,
				flags: MessageFlags.Ephemeral,
			});
		}
	} catch (error) {
		logger.error(
			`An error occurred while processing the request to remove a soundboard sound: ${error}`
		);
		await interaction.followUp({
			content: `❌ An unexpected error occurred. Please restart the command using \`/start\` and try again. If the issue persists, please try again later.`,
			flags: MessageFlags.Ephemeral,
		});
	}
}
