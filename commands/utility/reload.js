const createLogger = require('../../loggerFactory');
const logger = createLogger('bot');

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a command.')
		.addStringOption((option) =>
			option
				.setName('command')
				.setDescription('The command to reload.')
				.setRequired(true)
		),
	async execute(interaction) {
		const commandName = interaction.options.getString('command', true).toLowerCase();
		const command = interaction.client.commands.get(commandName);

		if (!command) {
			return interaction.reply(
				`⚠️ There is no command with name \`${commandName}\`!`
			);
		}

		delete require.cache[
			require.resolve(`../${command.category}/${command.data.name}.js`)
		];

		try {
			const newCommand = require(`../${command.category}/${command.data.name}.js`);
			interaction.client.commands.set(newCommand.data.name, newCommand);
			await interaction.reply(
				`✅ Command \`${newCommand.data.name}\` was successfully reloaded!`
			);
		} catch (error) {
			logger.error(error);
			await interaction.reply(
				`❌ An error occurred while reloading a command \`${command.data.name}\`:\n\`${error.message}\``
			);
		}
	},
};
