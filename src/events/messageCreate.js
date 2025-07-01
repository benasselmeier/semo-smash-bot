const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

// Load commands
const commands = new Map();
const commandsPath = path.join(__dirname, '../commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('name' in command && 'execute' in command) {
      commands.set(command.name, command);
      if (Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          commands.set(alias, command);
        }
      }
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
    }
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
      let helpText;
      if (commands.size === 0) {
        helpText = `**Smash Community Bot Help**\n\nNo commands are currently registered.`;
      } else {
        const unique = [...new Set(Array.from(commands.values()).map(c => c.name))];
        helpText = `**Smash Community Bot Help**\n\nAvailable commands: ${unique.map(n => `${config.prefix}${n}`).join(', ')}`;
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
