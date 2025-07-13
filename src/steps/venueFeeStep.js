const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');

async function askVenueFeeQuestion(session) {
  const embed = embedBuilder.createStepEmbed(
    'Step 4/8',
    'What is the **venue fee**?'
  ).setFooter({ text: 'Click a button below or type a custom amount' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('venue_free')
        .setLabel('Free')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🆓'),
      new ButtonBuilder()
        .setCustomId('venue_5')
        .setLabel('$5')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💵'),
      new ButtonBuilder()
        .setCustomId('venue_10')
        .setLabel('$10')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💵'),
      new ButtonBuilder()
        .setCustomId('venue_custom')
        .setLabel('Custom Amount')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️')
    );

  await session.botMessage.edit({ embeds: [embed], components: [row] });
}

module.exports = {
  askVenueFeeQuestion
};