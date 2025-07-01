require('dotenv').config();

const config = {
  // Bot token from Discord Developer Portal
  token: process.env.DISCORD_TOKEN,
  
  // Command prefix for traditional command handling
  prefix: process.env.PREFIX || '!',
  
  // Client ID for slash commands
  clientId: process.env.CLIENT_ID,
  
  // Optional test guild for development
  testGuildId: process.env.TEST_GUILD_ID,
  
  // Start.gg API key
  startggApiKey: process.env.STARTGG_API_KEY,
};

module.exports = config;
