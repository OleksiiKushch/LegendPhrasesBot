require('dotenv').config();

const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  // ModalBuilder,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

const TOKEN = process.env.BOT_TOKEN;
const DATA_FILE_PATH = process.env.DATA_FILE_PATH;
const DISCORD_API_VERSION = process.env.DISCORD_API_VERSION;

let evailableSounds = [];
let currentServerSounds = [];

fs.readFile(DATA_FILE_PATH, 'utf8', async (error, data) => {
  if (error) {
    console.error(`An error occurred while reading the file '${DATA_FILE_PATH}': ${error}`);
    return;
  }
  try {
    evailableSounds = JSON.parse(data);
    console.log(`Sounds from the file '${DATA_FILE_PATH}' were loaded successfully.`);
  } catch (error) {
    console.error(`An error occurred while parsing the file '${DATA_FILE_PATH}': ${error}`);
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}\nBot is ready!`);
});

client.on('messageCreate', async (message) => {
  // TODO: handle starting using a specific command (for example, /start), and not just handle it with a specific message
  if (message.content === '@LegendaryPhrasesBot /start') {
    await start(message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  await interaction.deferReply({ ephemeral: true });

  const soundData = evailableSounds.find((sound) => sound.custom_id === interaction.customId);
  // TODO: check if sound is already present in the current server soundboard.
  //  (may be check it by name, so name should be unique!)
  if (soundData) {
    const guildId = interaction.guild.id;
    try {
      const createResponse = await createSound(guildId, soundData);

      const createResponseData = await createResponse.json();
      if (createResponse.ok) {
        currentServerSounds.push(simplifySoundData(createResponseData));
        console.log(`New soundboard sound added successfully.`);
        await interaction.editReply(`✅ Soundboard sound "${createResponseData.name}" added successfully!`);
      } else {
        console.error(
          `Error adding soundboard sound: ${createResponse.statusText}. Detailed error info: ${JSON.stringify(createResponseData.message)}`
        );

        // maximum number of soundboard sounds reached
        if (createResponseData.code === 30045) {
          let nextReplacementSound = currentServerSounds.shift();

          try {
            const deleteResponse = await deleteSound(guildId, nextReplacementSound.sound_id);

            if (deleteResponse.ok) {
              // TODO: add a reply message for the successful removal of the sound

              try {
                const replaceResponse = await createSound(guildId, soundData);

                const replaceResponseData = await replaceResponse.json();
                if (replaceResponse.ok) {
                  currentServerSounds.push(simplifySoundData(replaceResponseData));
                  await interaction.editReply(
                    `⚠️ Soundboard sound "${nextReplacementSound.name}" removed successfully!\n✅ Soundboard sound "${replaceResponseData.name}" added successfully!`
                  );
                } else {
                  await interaction.editReply(
                    `❌ Failed to add soundboard sound. Error: ${replaceResponse.statusText}. Details: ${JSON.stringify(replaceResponseData.message)}`
                  );
                }
              } catch (replaceResponseError) {
                console.error(`An error occurred during the request to replays (add a new after remove) a soundboard sound: ${replaceResponseError}`);
                await interaction.editReply(`❌ An unexpected error occurred. Please try again later.`);
              }
            } else {
            }
          } catch (deleteResponseError) {
            console.error(`An error occurred during the request to remove a soundboard sound: ${deleteResponseError}`);
            await interaction.editReply(`❌ An unexpected error occurred. Please try again later.`);
          }

          // TODO: added modal with current server soundboard sounds, so user can select sound to replace
          /* const modal = new ModalBuilder()
            .setCustomId('replays-sound-modal')
            .setTitle('Replays soundboard sound')
            .addComponents(); // added current soundboard sounds buttons

          // select

          await interaction.showModal(modal); */
        } else {
          await interaction.editReply(
            `❌ Failed to add soundboard sound. Error: ${createResponse.statusText}. Details: ${JSON.stringify(createResponseData.message)}`
          );
        }
      }
    } catch (createResponseError) {
      console.error(`An error occurred during the request to add a new soundboard sound: ${createResponseError}`);
      await interaction.editReply(`❌ An unexpected error occurred. Please try again later.`);
    }
  } else {
    console.warn(`Sound with id '${interaction.customId}' not found!`);
    await interaction.editReply(`❌ Sound not found. Please try again.`);
  }
});

async function start(interaction) {
  if (evailableSounds.length === 0) {
    interaction.channel.send('No legendary phrases available at the moment.');
    return;
  }

  await updateInfoAboutCurrentSounds(interaction.guild.id);

  renderEvailableSounds(interaction);
}

async function getCurrentSounds(guildId) {
  return await fetch(`https://discord.com/api/v${DISCORD_API_VERSION}/guilds/${guildId}/soundboard-sounds`, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${TOKEN}`,
    },
  });
}

async function createSound(guildId, soundData) {
  return await fetch(`https://discord.com/api/v${DISCORD_API_VERSION}/guilds/${guildId}/soundboard-sounds`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(soundData),
  });
}

async function deleteSound(guildId, soundId) {
  return await fetch(`https://discord.com/api/v${DISCORD_API_VERSION}/guilds/${guildId}/soundboard-sounds/${soundId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${TOKEN}`,
    },
  });
}

async function updateInfoAboutCurrentSounds(guildId) {
  try {
    const response = await getCurrentSounds(guildId);

    const responseData = await response.json();
    if (response.ok) {
      currentServerSounds = responseData.items.map(simplifySoundData);
      // console.log('Current server soundboard sounds successfully loaded:', currentServerSounds);
    } else {
      console.error(
        `Error loading current servler soundboard sounds: ${response.statusText}. Detailed error info: ${JSON.stringify(responseData.message)}`
      );
    }
  } catch (error) {}
}

function simplifySoundData(soundData) {
  const { name, sound_id, emoji_id, emoji_name } = soundData;
  return { name, sound_id, emoji_id, emoji_name };
}

async function renderEvailableSounds(message) {
  const rows = prepareEvailableSounds(); // TODO: improve this implementation
  const firstMessageRows = rows.slice(0, 5);
  const secondMessageRows = rows.slice(5);

  if (firstMessageRows.length > 0) {
    await message.channel.send({
      content: 'Here are available legend phrases:',
      components: firstMessageRows,
    });
  }

  if (secondMessageRows.length > 0) {
    await message.channel.send({
      components: secondMessageRows,
    });
  }

  if (rows.length === 0) {
    message.channel.send('No legendary phrases available at the moment.');
  }
}

function prepareEvailableSounds() {
  const result = [];
  const FIVE_ITEMS_IN_ROW = 5;

  for (let i = 0; i < evailableSounds.length; i += FIVE_ITEMS_IN_ROW) {
    const buttonsChunk = evailableSounds.slice(i, i + FIVE_ITEMS_IN_ROW).map((sound) =>
      new ButtonBuilder()
        .setCustomId(sound.custom_id)
        .setLabel(sound.name)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(sound.emoji_name || null)
    );

    if (buttonsChunk.length > 0 && buttonsChunk.length <= 5) {
      result.push(new ActionRowBuilder().addComponents(buttonsChunk));
    }
  }
  return result;
}

client.login(TOKEN);
