const { ROLE_MAPPINGS } = require('../config/constants');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embedBuilder = require('../utils/embedBuilder');
const sessionManager = require('../utils/sessionManager');

async function createTournamentAnnouncement(session) {
  const data = session.data;
  
  // Update session to confirmation step
  sessionManager.updateSession(session.userId, { step: 'confirmation' });
  
  // Get the corresponding Enjoyer roles available for notification
  const availableEnjoyerRoles = session.toRoles.map(toRole => ROLE_MAPPINGS[toRole]).filter(Boolean);
  
  // Create the tournament announcement embed for preview
  const embed = embedBuilder.createAnnouncementEmbed(data);
  
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
    content: "Here's your announcement. Please choose the roles you'd like to notify and confirm to send it in the tournament announcements channel. To edit any information, click the edit action below.",
    embeds: [embed], 
    components: [selectRow, buttonRow]
  });
}

async function postTournamentAnnouncement(session, selectedRoles) {
  const data = session.data;
  
  // Create role mentions based on selection
  let roleMentions = [];
  if (!selectedRoles.includes('none')) {
    const guild = session.botMessage.guild;
    roleMentions = selectedRoles.map(roleName => {
      const role = guild.roles.cache.find(r => r.name === roleName);
      return role ? `<@&${role.id}>` : null;
    }).filter(Boolean);
  }
  
  // Create the tournament announcement embed
  const embed = embedBuilder.createAnnouncementEmbed(data);
  
  // Create the final announcement message with role pings
  const announcementContent = roleMentions.length > 0 
    ? `🎮 **Tournament Announcement** 🎮\n\n${roleMentions.join(' ')} - A new tournament has been announced!`
    : '🎮 **Tournament Announcement** 🎮';
  
  // Update the creation message to show completion
  await session.botMessage.edit({ 
    content: '✅ **Tournament announcement posted successfully!**', 
    embeds: [], 
    components: [] 
  });
  
  // Send the actual tournament announcement as a new message
  await session.botMessage.channel.send({
    content: announcementContent,
    embeds: [embed]
  });
  
  // Clean up session
  sessionManager.deleteSession(session.userId);
}

module.exports = {
  createTournamentAnnouncement,
  postTournamentAnnouncement
};