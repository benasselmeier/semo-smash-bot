const { ROLE_MAPPINGS } = require('../config/constants');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');
const sessionManager = require('../utils/sessionManager');
const configManager = require('../utils/configManager');
const multiEventHandler = require('./multiEventHandler');

async function createTournamentAnnouncement(session) {
  const data = session.data;
  
  // Update session to confirmation step
  sessionManager.updateSession(session.userId, { step: 'confirmation' });
  
  // Get the corresponding Enjoyer roles available for notification
  let availableEnjoyerRoles = [];
  
  // First try to get roles from config manager
  const configuredEnjoyerRoles = configManager.getEnjoyerRoles(session.botMessage.guild);
  if (configuredEnjoyerRoles.length > 0) {
    availableEnjoyerRoles = configuredEnjoyerRoles.map(role => role.name);
  } else {
    // Fallback to hardcoded role mappings
    availableEnjoyerRoles = session.toRoles.map(toRole => ROLE_MAPPINGS[toRole]).filter(Boolean);
  }
  
  // Create the tournament announcement embed for preview (with event type color)
  const embed = embedBuilder.createSingleEventAnnouncementEmbed(data, session.eventType);
  
  // Create role selection menu
  const roleOptions = availableEnjoyerRoles.map(roleName => ({
    label: roleName,
    value: roleName,
    description: `Notify ${roleName} members`,
    emoji: '🔔'
  }));
  
  // Add "No notifications" option
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
  
  // Create action buttons
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
        .setDisabled(true) // Disabled until role selection is made
    );
  
  // Update the message with confirmation
  await session.botMessage.edit({ 
    content: `Here's your ${session.eventType} event announcement. Please choose the roles you'd like to notify and confirm to send it in the tournament announcements channel. To edit any information, click the edit action below.`,
    embeds: [embed], 
    components: [selectRow, buttonRow]
  });
}

async function postTournamentAnnouncement(session, selectedRoles) {
  const data = session.data;
  
  // Use the multi-event handler to add this event to announcements
  await multiEventHandler.addEventToAnnouncement(session, data, selectedRoles);
  
  // Clean up session
  sessionManager.deleteSession(session.userId);
}

module.exports = {
  createTournamentAnnouncement,
  postTournamentAnnouncement
};