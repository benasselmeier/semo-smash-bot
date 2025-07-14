const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');
const { EVENT_TYPES } = require('../config/constants');

async function askEventTypeQuestion(session) {
  const embed = embedBuilder.createStepEmbed(
    'Step 9/9',
    'What **type of event** is this?\n\nThis helps organize announcements by category.'
  ).setFooter({ text: 'Select the event type that best describes this tournament' });

  const eventTypeSelect = new StringSelectMenuBuilder()
    .setCustomId('event_type_select')
    .setPlaceholder('Choose event type...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: EVENT_TYPES.LOCAL.name,
        value: EVENT_TYPES.LOCAL.id,
        description: EVENT_TYPES.LOCAL.description,
        emoji: EVENT_TYPES.LOCAL.emoji
      },
      {
        label: EVENT_TYPES.OUT_OF_REGION.name,
        value: EVENT_TYPES.OUT_OF_REGION.id,
        description: EVENT_TYPES.OUT_OF_REGION.description,
        emoji: EVENT_TYPES.OUT_OF_REGION.emoji
      },
      {
        label: EVENT_TYPES.ONLINE.name,
        value: EVENT_TYPES.ONLINE.id,
        description: EVENT_TYPES.ONLINE.description,
        emoji: EVENT_TYPES.ONLINE.emoji
      }
    ]);

  const row = new ActionRowBuilder().addComponents(eventTypeSelect);
  await session.botMessage.edit({ embeds: [embed], components: [row] });
}

module.exports = {
  askEventTypeQuestion
};
