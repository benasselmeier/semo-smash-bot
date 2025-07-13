const sessionManager = require('../utils/sessionManager');
const embedBuilder = require('../utils/embedBuilder');
const { createTournamentAnnouncement } = require('./announcementHandler');
const { askVenueFeeQuestion } = require('../steps/venueFeeStep');
const { askEntryFeeQuestion } = require('../steps/entryFeeStep');
const { askEventsQuestion } = require('../steps/eventsStep');
const { showFieldEditSelection } = require('../steps/fieldEditStep');

async function handleSelectMenuInteraction(interaction, session) {
  const { customId, values } = interaction;
  
  if (customId === 'events_select') {
    if (values.includes('custom')) {
      // Determine if we're in edit mode
      const step = session.step === 'edit_events' ? 'edit_events_custom' : 'events_custom';
      sessionManager.updateSession(session.userId, { step });
      await interaction.deferUpdate();
      const embed = embedBuilder.createStepEmbed(
        session.step === 'edit_events' ? 'Edit Events' : 'Step 8/8',
        'Please type the custom events:\n\n*Example: Ultimate Singles, Tekken 8, Street Fighter 6*'
      );
      await session.botMessage.edit({ embeds: [embed], components: [] });
    } else {
      sessionManager.updateSession(session.userId, {
        data: { ...session.data, events: values.join(', ') }
      });
      await interaction.deferUpdate();
      
      // Check if we're in edit mode
      if (session.step === 'edit_events') {
        await showFieldEditSelection(sessionManager.getSession(session.userId));
      } else {
        await createTournamentAnnouncement(sessionManager.getSession(session.userId));
      }
    }
  } else if (customId === 'role_notifications_select') {
    // Store selected roles and enable the confirm button
    sessionManager.updateSession(session.userId, {
      selectedRoles: values
    });
    
    await interaction.deferUpdate();
    
    // Update the buttons to enable the confirm button
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
    
    // Recreate the role select menu
    const data = session.data;
    const { ROLE_MAPPINGS } = require('../config/constants');
    const availableEnjoyerRoles = session.toRoles.map(toRole => ROLE_MAPPINGS[toRole]).filter(Boolean);
    
    const roleOptions = availableEnjoyerRoles.map(roleName => ({
      label: roleName,
      value: roleName,
      description: `Notify ${roleName} members`,
      emoji: '🔔'
    }));
    
    roleOptions.push({
      label: 'No role notifications',
      value: 'none',
      description: 'Post without notifying any roles',
      emoji: '🔕'
    });
    
    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId('role_notifications_select')
      .setPlaceholder('Choose roles to notify...')
      .setMinValues(1)
      .setMaxValues(roleOptions.length)
      .addOptions(roleOptions);
    
    const selectRow = new ActionRowBuilder().addComponents(roleSelect);
    
    // Create action buttons with confirm enabled
    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('edit_announcement')
          .setLabel('Edit')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId('confirm_announcement')
          .setLabel('Send Announcement')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📢')
          .setDisabled(false) // Now enabled
      );
    
    // Update components
    await session.botMessage.edit({ 
      components: [selectRow, buttonRow]
    });
  } else if (customId === 'field_edit_select') {
    const fieldToEdit = values[0];
    await interaction.deferUpdate();
    
    // Handle different field edits
    switch (fieldToEdit) {
      case 'event_name':
        sessionManager.updateSession(session.userId, { step: 'edit_event_name' });
        const nameEmbed = embedBuilder.createStepEmbed(
          'Edit Event Name',
          `What is the **event name**?\n\n*Current: ${session.data.eventName || 'Not set'}*\n\nEnter new event name:`
        );
        await session.botMessage.edit({ embeds: [nameEmbed], components: [] });
        break;
        
      case 'address':
        sessionManager.updateSession(session.userId, { step: 'edit_address' });
        const addressEmbed = embedBuilder.createStepEmbed(
          'Edit Address',
          `What is the **venue address**?\n\n*Current: ${session.data.address || 'Not set'}*\n\nEnter new address:`
        );
        await session.botMessage.edit({ embeds: [addressEmbed], components: [] });
        break;
        
      case 'to_contact':
        sessionManager.updateSession(session.userId, { step: 'edit_to_contact' });
        const contactEmbed = embedBuilder.createStepEmbed(
          'Edit TO Contact',
          `What is the **TO contact information**?\n\n*Current: ${session.data.toContact || 'Not set'}*\n\nEnter new contact info:`
        );
        await session.botMessage.edit({ embeds: [contactEmbed], components: [] });
        break;
        
      case 'start_time':
        sessionManager.updateSession(session.userId, { step: 'edit_start_time' });
        const timeEmbed = embedBuilder.createStepEmbed(
          'Edit Start Time',
          `What is the **start time and date**?\n\n*Current: ${session.data.startTime || 'Not set'}*\n\nEnter new start time:`
        );
        await session.botMessage.edit({ embeds: [timeEmbed], components: [] });
        break;
        
      case 'venue_fee':
        sessionManager.updateSession(session.userId, { step: 'edit_venue_fee' });
        await askVenueFeeQuestion(sessionManager.getSession(session.userId));
        break;
        
      case 'entry_fee':
        sessionManager.updateSession(session.userId, { step: 'edit_entry_fee' });
        await askEntryFeeQuestion(sessionManager.getSession(session.userId));
        break;
        
      case 'events':
        sessionManager.updateSession(session.userId, { step: 'edit_events' });
        await askEventsQuestion(sessionManager.getSession(session.userId));
        break;
    }
  }
}

module.exports = {
  handleSelectMenuInteraction
};

module.exports = {
  handleSelectMenuInteraction
};

module.exports = {
  handleSelectMenuInteraction
};