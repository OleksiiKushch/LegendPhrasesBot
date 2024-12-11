# Description

A simple Discord bot, "Legend Phrases Bot", for quickly adding and replacing soundboard sounds when the limit is reached.

# Configuration

## `soundsDataFilePath`

Path to the `.json` file that contains information (data) about your sounds.  
This file includes predefined data (sounds) for adding them to a Discord soundboard.  
It's like a catalog of your sounds.  
Required structure:

```json
[
	{
		"custom_id": "quack_quack",
		"name": "Quack!",
		"category": "fx",
		"sound": "data:audio/ogg;base64,T2dnUwACAAAAAAAAAACUl9Y4AAA...",
		"volume": 0.8,
		"emoji_name": "🦆"
	}
]
```

> **Note:**
>
> - The `name` of a sound **should be unique**. You **cannot add a sound** if a sound with the same name already exists on your current server's soundboard.
> - The `category` **must contain a category ID**, as described below (`categoriesDataFilePath` configuration property).
> - The `sound` contains audio data stored in Base64-encoded format with a MIME type (e.g., audio/ogg).

## `categoriesDataFilePath`

Path to the `.json` file that contains information (data) about your **categories** of sounds, similar to the `soundsDataFilePath`.  
Required structure:

```json
[
	{
		"id": "fx",
		"name": "FX (sound effects)"
	}
]
```

# Required policies (permissions)

- Manage Expressions (`MANAGE_GUILD_EXPRESSIONS`)
- Create Expressions (`CREATE_GUILD_EXPRESSIONS`)

# Useful links

- [`discord.js` guide](https://discordjs.guide/)
- [Discord Soundboard API](https://discord.com/developers/docs/resources/soundboard)
- [Discord API rate limit](https://discord.com/developers/docs/topics/rate-limits#header-format-rate-limit-header-examples)

# TODOs

- [ ] Added a command to check the bot's ping.

- [ ] Added a new strategy for replacing existing soundboard sounds when the limit is reached. The current implementation uses a "queue" approach (the first sound is removed, and a new one is added to the end). A new approach, "stack", has been added (the last sound is removed, and a new one is added to the end). It should also be possible to change the mode using a new command `/replace-mode`. For now, it is fine to just switch between these two modes when calling this command. However, it would be a good idea to add predefined arguments, allowing the command to be called like `/replace-mode stack` or `/replace-mode queue`.

- [ ] Added the possibility to upload a sound using a specific command. The arguments could include `sound_file`, `sound_name`, and `sound_emoji`. If it's not possible to provide all of them upfront, consider generating the name and emoji randomly for speed, or setting them later through additional chat messages. Alternatively, use a command like `/create-sound <name> <emoji>` and then upload the file in the next message (or pass it as an argument, if possible). Save the sound in a separate JSON file (as predefined sounds) under a specific category (by default). You could also allow the category to be set as an argument during creation.
      Added the ability to export saved data in JSON format. Also introduced the option to upload new sounds to the sound catalog using these exported files.
