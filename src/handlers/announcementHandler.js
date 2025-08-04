const { ROLE_MAPPINGS } = require('../config/constants');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');
const sessionManager = require('../utils/sessionManager');
const configManager = require('../utils/configManager');
const multiEventHandler = require('./multiEventHandler');

async function createTournamentAnnouncement(session) {
  const data = session.data;

  // If selectedRoles is already set (auto-selected), skip role selection UI and go straight to confirmation
  if (session.selectedRoles && session.selectedRoles.length > 0) {
    // Directly call postTournamentAnnouncement with the pre-selected roles
    await module.exports.postTournamentAnnouncement(session, session.selectedRoles);
    return;
  }
  
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
  const embed = embedBuilder.createSingleEventAnnouncementEmbed(data, session.eventType, session.primaryTORole);
  
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
        .setCustomId('edit_events')
        .setLabel('Edit Events')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🗂️'),
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
  // Use the multi-event handler to add this event to upcoming tournaments
  await multiEventHandler.addEventToAnnouncement(session, data, selectedRoles);

  // --- Announcements Channel Message ---
  const guild = session.botMessage.guild;
  const config = configManager.getGuildConfig(guild.id);
  const announcementsChannel = configManager.getAnnouncementsChannel(guild);
  // FIX: Use correct config key for upcoming tournaments channel
  const upcomingTournamentsChannel = config && config.announcementChannelId
    ? guild.channels.cache.get(config.announcementChannelId)
    : null;

  if (announcementsChannel && upcomingTournamentsChannel) {
    try {
      // Find the correct Tournament role to mention based on the TO role the invoker has
      let tournamentRoleMention = null;
      if (session.primaryTORole) {
        const toRole = guild.roles.cache.get(session.primaryTORole);
        if (toRole) {
          // Look for a role with the same region but ending in 'Tournaments'
          const regionName = toRole.name.replace(/TO \((.+)\)/, '$1').trim();
          const tournamentsRole = guild.roles.cache.find(r => r.name.toLowerCase().includes(regionName.toLowerCase()) && r.name.toLowerCase().includes('tournaments'));
          if (tournamentsRole) {
            tournamentRoleMention = `<@&${tournamentsRole.id}>`;
          }
        }
      }
      // Fallback: use first enjoyer role if no match
      if (!tournamentRoleMention && config.enjoyerRoles && config.enjoyerRoles.length > 0) {
        const fallbackRole = guild.roles.cache.get(config.enjoyerRoles[0]);
        if (fallbackRole) tournamentRoleMention = `<@&${fallbackRole.id}>`;
      }
      // Fallback: no mention
      if (!tournamentRoleMention) tournamentRoleMention = '';

      // Tournament title and link
      const eventTitle = data.title || data.name || 'Tournament';
      const startggUrl = data.startggUrl || data.url || data.registrationUrl || '';
      const upcomingChannelMention = `<#${upcomingTournamentsChannel.id}>`;
      const msg = `${tournamentRoleMention} a new event has been added to ${upcomingChannelMention}: [${eventTitle}](${startggUrl})! Click the title to go to the event page or see more details in ${upcomingChannelMention}.`;
      await announcementsChannel.send({ content: msg, allowedMentions: { parse: ['roles'] } });
    } catch (err) {
      console.error('Failed to send announcement to announcements channel:', err);
    }
  } else {
    if (!announcementsChannel) console.error('Announcements channel not found or not configured.');
    if (!upcomingTournamentsChannel) console.error('Upcoming tournaments channel not found or not configured.');
  }

  // Clean up session
  sessionManager.deleteSession(session.userId);
}

module.exports = {
  createTournamentAnnouncement,
  postTournamentAnnouncement
};