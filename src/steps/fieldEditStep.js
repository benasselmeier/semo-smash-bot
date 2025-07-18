const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');
const sessionManager = require('../utils/sessionManager');

async function showFieldEditSelection(session) {
  const data = session.data;
  
  // Create an embed showing current values
  const embed = embedBuilder.createSessionEmbed(
    'Choose which field you\'d like to edit:',
    0x00ff00
  ).setTitle('🏆 Field Editor')
   .addFields(
      { name: '📝 Event Name', value: data.eventName || 'Not set', inline: true },
      { name: '📍 Address', value: data.address || 'Not set', inline: true },
      { name: '👤 TO Contact', value: data.toContact || 'Not set', inline: true },
      { name: '📅 Start Time', value: data.startTime || 'Not set', inline: true },
      { name: '🎮 Events', value: data.events || 'Not set', inline: false }
    )
    .setFooter({ text: 'Select a field to edit from the dropdown below' });

  // Create field selection menu
  const fieldSelect = new StringSelectMenuBuilder()
    .setCustomId('field_edit_select')
    .setPlaceholder('Choose a field to edit...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: 'Event Name',
        value: 'event_name',
        description: `Current: ${data.eventName ? data.eventName.substring(0, 50) : 'Not set'}`,
        emoji: '📝'
      },
      {
        label: 'Address',
        value: 'address',
        description: `Current: ${data.address ? data.address.substring(0, 50) : 'Not set'}`,
        emoji: '📍'
      },
      {
        label: 'TO Contact',
        value: 'to_contact',
        description: `Current: ${data.toContact ? data.toContact.substring(0, 50) : 'Not set'}`,
        emoji: '👤'
      },
      {
        label: 'Start Time',
        value: 'start_time',
        description: `Current: ${data.startTime ? data.startTime.substring(0, 50) : 'Not set'}`,
        emoji: '📅'
      },
      {
        label: 'Events',
        value: 'events',
        description: `Current: ${data.events ? data.events.substring(0, 50) : 'Not set'}`,
        emoji: '🎮'
      }
    ]);

  const selectRow = new ActionRowBuilder().addComponents(fieldSelect);
  
  // Add back to confirmation button
  const backButton = new ButtonBuilder()
    .setCustomId('back_to_confirmation')
    .setLabel('Back to Confirmation')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');
    
  const buttonRow = new ActionRowBuilder().addComponents(backButton);
  
  // Update session to field edit mode
  sessionManager.updateSession(session.userId, { 
    step: 'field_edit_selection',
    previousStep: session.step // Store where we came from
  });

  await session.botMessage.edit({ 
    embeds: [embed], 
    components: [selectRow, buttonRow]
  });
}

module.exports = {
  showFieldEditSelection
};
