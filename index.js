const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { TEXT_STEPS } = require('./src/config/constants');
const sessionManager = require('./src/utils/sessionManager');
const { handleTournamentResponse } = require('./src/handlers/messageHandler');
const { handleButtonInteraction, handleChannelModalSubmit } = require('./src/handlers/buttonHandler');
const { handleSelectMenuInteraction } = require('./src/handlers/selectMenuHandler');
const pingCommand = require('./src/commands/ping');
const tourneyCommand = require('./src/commands/tourney');
const setupCommand = require('./src/commands/setup');
const multiEventHandler = require('./src/handlers/multiEventHandler');
require('dotenv').config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure bot settings and permissions (Administrator only)'),
  new SlashCommandBuilder()
    .setName('tourney')
    .setDescription('Tournament management commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a tournament announcement from Start.gg')
        .addStringOption(option =>
          option
            .setName('slug')
            .setDescription('Start.gg tournament slug or URL (e.g., "kachow-kup" or "https://start.gg/tournament/kachow-kup")')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('manage')
        .setDescription('Open the tournament management interface')
    )
];

// Register slash commands
async function registerCommands() {
  try {
    const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
    
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// When the client is ready, run this code
client.once('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}!`);
  await registerCommands();
  
  // Start cleanup interval for old announcements (every 6 hours)
  setInterval(() => {
    multiEventHandler.cleanupOldAnnouncements();
  }, 6 * 60 * 60 * 1000);
  
  // Run initial cleanup
  multiEventHandler.cleanupOldAnnouncements();
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    
    try {
      if (commandName === 'ping') {
        await pingCommand.execute(interaction);
        return;
      }
      
      if (commandName === 'setup') {
        await setupCommand.execute(interaction);
        return;
      }
      
      if (commandName === 'tourney') {
        const subcommand = interaction.options.getSubcommand();
        const slug = interaction.options.getString('slug');
        
        if (subcommand === 'create') {
          await tourneyCommand.executeCreate(interaction, slug);
        } else if (subcommand === 'manage') {
          await tourneyCommand.execute(interaction);
        }
        return;
      }
    } catch (error) {
      console.error('Error handling slash command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Sorry, something went wrong. Please try again.', ephemeral: true });
      }
    }
  }
  
  if (interaction.isModalSubmit()) {
    if (interaction.customId.includes('_channel_modal')) {
      await handleChannelModalSubmit(interaction);
      return;
    }
  }
  
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const session = sessionManager.getSession(interaction.user.id);
  if (!session) return;

  try {
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction, session);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction, session);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Sorry, something went wrong. Please try again.', ephemeral: true });
    }
  }
});

// Handle errors
client.on('error', console.error);

// Handle tournament creation responses (for text-only steps)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  try {
    // Handle tournament creation responses (for text-only steps)
    if (sessionManager.hasSession(message.author.id)) {
      const session = sessionManager.getSession(message.author.id);
      
      if (TEXT_STEPS.includes(session.step)) {
        await handleTournamentResponse(message, session);
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await message.reply('Sorry, something went wrong. Please try again.');
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);