require('dotenv').config();

const token = process.env.BOT_TOKEN;

const createLogger = require('../loggerFactory');
const logger = createLogger('rate-limit');

const { discordApiVersion } = require('../config.json');

async function getCurrentSounds(guildId) {
	const requestOptions = {
		method: 'GET',
		headers: {
			Authorization: `Bot ${token}`,
		},
	};
	const response = await fetch(
		`https://discord.com/api/v${discordApiVersion}/guilds/${guildId}/soundboard-sounds`,
		requestOptions
	);
	logRateLimit(response, requestOptions);
	return response;
}

async function createSound(guildId, soundData) {
	const requestOptions = {
		method: 'POST',
		headers: {
			Authorization: `Bot ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(soundData),
	};
	const response = await fetch(
		`https://discord.com/api/v${discordApiVersion}/guilds/${guildId}/soundboard-sounds`,
		requestOptions
	);
	logRateLimit(response, requestOptions);
	return response;
}

async function deleteSound(guildId, soundId) {
	const requestOptions = {
		method: 'DELETE',
		headers: {
			Authorization: `Bot ${token}`,
		},
	};
	const response = await fetch(
		`https://discord.com/api/v${discordApiVersion}/guilds/${guildId}/soundboard-sounds/${soundId}`,
		requestOptions
	);
	logRateLimit(response, requestOptions);
	return response;
}

function logRateLimit(response, requestOptions) {
	const rateLimit = response.headers.get('X-RateLimit-Limit');
	const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
	const rateLimitReset = response.headers.get('X-RateLimit-Reset');
	const rateLimitResetAfter = response.headers.get('X-RateLimit-Reset-After');
	const rateLimitBucket = response.headers.get('X-RateLimit-Bucket');

	logger.info(
		`Rate limit response data for ${requestOptions.method} request to ${response.url}:\n` +
			`X-RateLimit-Limit:\t\t\t${rateLimit}\n` +
			`X-RateLimit-Remaining:\t\t${rateLimitRemaining}\n` +
			`X-RateLimit-Reset:\t\t\t${rateLimitReset}\n` +
			`X-RateLimit-Reset-After:\t${rateLimitResetAfter}\n` +
			`X-RateLimit-Bucket:\t\t\t${rateLimitBucket}`
	);
}

function simplifySoundData(soundData) {
	const { name, sound_id, emoji_id, emoji_name } = soundData;
	return { name, sound_id, emoji_id, emoji_name };
}

module.exports = {
	getCurrentSounds,
	createSound,
	deleteSound,
	simplifySoundData,
};
