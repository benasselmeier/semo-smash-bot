const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');
const sessionManager = require('../utils/sessionManager');
const { showFieldEditSelection } = require('./fieldEditStep');

async function startEditFlow(session) {
  // Check if we have tournament data to edit
  if (!session.data || Object.keys(session.data).length === 0) {
    // No data to edit, show error
    const embed = new EmbedBuilder()
      .setTitle('🏆 Tournament Editor')
      .setDescription('No tournament data found to edit. Please create a tournament first.')
      .setColor(COLORS.ERROR)
      .addFields(
        { name: 'What to do next', value: 'Use `/tourney create` to create a new tournament announcement first.' }
      )
      .setFooter({ text: 'This session will be closed automatically' });
    
    await session.botMessage.edit({ embeds: [embed], components: [] });
    
    // Clean up session after showing the message
    setTimeout(() => {
      sessionManager.deleteSession(session.userId);
    }, 5000);
    return;
  }
  
  // Show field selection interface
  await showFieldEditSelection(session);
}

module.exports = {
  startEditFlow
};

module.exports = {
  startEditFlow
};