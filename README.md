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

> - The `name` of a sound **should be unique**.
> - You **cannot add a sound** if a sound with the same name already exists on your current server's soundboard.

> - The `category` **must contain a category ID**, as described below.

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

Manage Expressions (`MANAGE_GUILD_EXPRESSIONS`)
Create Expressions (`CREATE_GUILD_EXPRESSIONS`)

# Useful links

- [`discord.js` guide](https://discordjs.guide/)
- [Discord Soundboard API](https://discord.com/developers/docs/resources/soundboard)
- [Discord API rate limit](https://discord.com/developers/docs/topics/rate-limits#header-format-rate-limit-header-examples)
