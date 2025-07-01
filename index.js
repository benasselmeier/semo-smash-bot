const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions, // Add this for reaction handling
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'], // Add partials for handling uncached reactions
});

// Create collections for commands
client.commands = new Collection();
client.cooldowns = new Collection();

// Load event handlers
const eventsPath = path.join(__dirname, 'src/events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Log in to Discord with your token
client.login(config.token)
  .catch(error => {
    console.error('Error logging in:', error);
    process.exit(1);
  });

// Handle process errors
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});
