const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');

async function askEventsQuestion(session) {
  const embed = embedBuilder.createStepEmbed(
    'Step 8/8',
    'What **events** will be running?'
  ).setFooter({ text: 'Select all events that apply' });

  const eventSelect = new StringSelectMenuBuilder()
    .setCustomId('events_select')
    .setPlaceholder('Choose events...')
    .setMinValues(1)
    .setMaxValues(6)
    .addOptions([
      {
        label: 'Ultimate Singles',
        value: 'Ultimate Singles',
        emoji: '⚔️'
      },
      {
        label: 'Ultimate Doubles',
        value: 'Ultimate Doubles',
        emoji: '👥'
      },
      {
        label: 'Melee Singles',
        value: 'Melee Singles',
        emoji: '🔥'
      },
      {
        label: 'Melee Doubles',
        value: 'Melee Doubles',
        emoji: '🤝'
      },
      {
        label: 'Project M',
        value: 'Project M',
        emoji: '🎮'
      },
      {
        label: 'Other/Custom',
        value: 'custom',
        emoji: '✨'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(eventSelect);
  await session.botMessage.edit({ embeds: [embed], components: [row] });
}

module.exports = {
  askEventsQuestion
};