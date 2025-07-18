const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');
const sessionManager = require('../utils/sessionManager');

async function startAnnouncementFlow(session) {
  // Update session to start the announcement creation process
  sessionManager.updateSession(session.userId, {
    step: 'startgg_url',
    flow: 'announcement'
  });
  
  // Create the Start.gg URL request embed
  const embed = new EmbedBuilder()
    .setTitle('🧙 Tournament Creation Wizard')
    .setDescription('Let\'s create a tournament announcement! I\'ll try to auto-import data from Start.gg.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: 'Step 1/6', value: 'What is the **Start.gg tournament slug or URL**?\n\n*Examples:*\n• `kachow-kup` (I\'ll add the https://start.gg/ part)\n• `https://start.gg/tournament/weekly-smash-1`\n• `tournament/weekly-smash-1`' },
      { name: 'Your TO Role(s)', value: session.toRoles.join(', '), inline: true }
    )
    .setFooter({ text: 'Type "cancel" at any time to cancel creation' });
  
  await session.botMessage.edit({ embeds: [embed], components: [] });
}

module.exports = {
  startAnnouncementFlow
};