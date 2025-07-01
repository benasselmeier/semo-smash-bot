const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

// Load commands
const commands = new Map();
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('name' in command && 'execute' in command) {
    commands.set(command.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
  }
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore messages from bots or messages that don't start with the prefix
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    // Extract command name and arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Check for built-in help command
    if (commandName === 'help') {
      const { isModerator } = require('../utils/permissions');
      const isUserMod = message.guild ? isModerator(message.member) : false;
      
      let helpText = `**Smash Community Bot Help**\n\n`;
      
      // General commands
      helpText += `**General Commands:**\n`;
      helpText += `- ${config.prefix}tournament [short-slug] - Look up a tournament by short slug\n`;
      helpText += `- ${config.prefix}bracket [tournament-slug] [event-index] - Show the bracket path for a tournament event\n`;
      helpText += `- ${config.prefix}smasher [player-tag] - Look up a Smash player by tag\n`;
      helpText += `- ${config.prefix}pr [season-id] - Show the current power rankings or a past season\n`;
      helpText += `- ${config.prefix}season - Show information about the current SEMO smash season\n`;
      helpText += `- ${config.prefix}h2h [player1] [player2] - View head-to-head record between two players\n`;
      
      // Moderator commands
      if (isUserMod) {
        helpText += `\n**Moderator Commands:**\n`;
        helpText += `- ${config.prefix}season add [tournament-slug] - Add a tournament to the current season\n`;
        helpText += `- ${config.prefix}season remove [tournament-slug] - Remove a tournament from the current season\n`;
        helpText += `- ${config.prefix}season create [name] - Create a new season\n`;
        helpText += `- ${config.prefix}season end - End the current season\n`;
        helpText += `- ${config.prefix}import [tournament-slug] - Import all matches from a tournament bracket\n`;
        helpText += `- ${config.prefix}report "[winner]" "[loser]" "[score]" "[tournament]" - Report a match result\n`;
        helpText += `- ${config.prefix}ranking-system [system] - Change the ranking system (elo/trueskill)\n`;
      }
      
      await message.reply(helpText);
      return;
    }

    // Look for command in the commands collection
    const command = commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Error executing ${commandName} command:`, error);
      await message.reply('There was an error trying to execute that command!');
    }
  },
};
