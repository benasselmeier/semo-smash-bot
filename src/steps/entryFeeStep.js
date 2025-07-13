const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');

async function askEntryFeeQuestion(session) {
  const embed = embedBuilder.createStepEmbed(
    'Step 5/8',
    'What is the **entry fee**?'
  ).setFooter({ text: 'Click a button below or type a custom amount' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('entry_free')
        .setLabel('Free')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🆓'),
      new ButtonBuilder()
        .setCustomId('entry_5')
        .setLabel('$5')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💵'),
      new ButtonBuilder()
        .setCustomId('entry_10')
        .setLabel('$10')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💵'),
      new ButtonBuilder()
        .setCustomId('entry_custom')
        .setLabel('Custom Amount')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️')
    );

  await session.botMessage.edit({ embeds: [embed], components: [row] });
}

module.exports = {
  askEntryFeeQuestion
};