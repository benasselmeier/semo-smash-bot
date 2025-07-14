const { EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const embedBuilder = require('../utils/embedBuilder');
const { EVENT_TYPE_LABELS } = require('../config/constants');

class MultiEventHandler {
  
  async addEventToAnnouncement(session, data, selectedRoles) {
    const guild = session.botMessage.guild;
    const eventType = session.eventType;
    const announcementChannel = configManager.getAnnouncementChannel(guild);
    
    if (!announcementChannel) {
      await session.botMessage.edit({ 
        content: `❌ **No announcement channel configured!** Please run \`/setup\` to configure your tournament announcement channel first.`, 
        embeds: [], 
        components: [] 
      });
      return;
    }
    
    // Get existing announcement for this event type
    const existingAnnouncement = configManager.getActiveAnnouncement(guild.id, eventType);
    
    if (existingAnnouncement) {
      // Add to existing announcement
      await this.updateExistingAnnouncement(existingAnnouncement, data, selectedRoles, eventType, guild, announcementChannel);
    } else {
      // Create new announcement
      await this.createNewAnnouncement(data, selectedRoles, eventType, guild, announcementChannel);
    }
    
    // Update session completion message
    await session.botMessage.edit({ 
      content: `✅ **Event added to ${EVENT_TYPE_LABELS[eventType]} announcement!** Check <#${announcementChannel.id}> for the announcement.`, 
      embeds: [], 
      components: [] 
    });
  }
  
  async createNewAnnouncement(data, selectedRoles, eventType, guild, announcementChannel) {
    // Create role mentions
    let roleMentions = [];
    if (!selectedRoles.includes('none')) {
      roleMentions = selectedRoles.map(roleName => {
        const role = guild.roles.cache.find(r => r.name === roleName);
        return role ? `<@&${role.id}>` : null;
      }).filter(Boolean);
    }
    
    // Create announcement content
    const announcementContent = roleMentions.length > 0 
      ? `🎮 **${EVENT_TYPE_LABELS[eventType]}** 🎮\n\n${roleMentions.join(' ')} - New tournament(s) announced!`
      : `🎮 **${EVENT_TYPE_LABELS[eventType]}** 🎮`;
    
    // Create single event embed
    const embed = embedBuilder.createSingleEventAnnouncementEmbed(data, eventType);
    
    // Send the announcement
    const announcementMessage = await announcementChannel.send({
      content: announcementContent,
      embeds: [embed]
    });
    
    // Track this announcement
    configManager.setActiveAnnouncement(guild.id, eventType, {
      messageId: announcementMessage.id,
      channelId: announcementChannel.id,
      events: [data],
      roleMentions: selectedRoles,
      lastUpdated: Date.now()
    });
  }
  
  async updateExistingAnnouncement(existingAnnouncement, newEventData, selectedRoles, eventType, guild, announcementChannel) {
    try {
      // Get the existing message
      const channel = guild.channels.cache.get(existingAnnouncement.channelId);
      if (!channel) {
        console.error('Announcement channel not found, creating new announcement');
        await this.createNewAnnouncement(newEventData, selectedRoles, eventType, guild, announcementChannel);
        return;
      }
      
      const message = await channel.messages.fetch(existingAnnouncement.messageId);
      if (!message) {
        console.error('Announcement message not found, creating new announcement');
        await this.createNewAnnouncement(newEventData, selectedRoles, eventType, guild, announcementChannel);
        return;
      }
      
      // Combine existing events with new event
      const allEvents = [...existingAnnouncement.events, newEventData];
      
      // Merge role mentions (avoid duplicates)
      const combinedRoles = [...new Set([...existingAnnouncement.roleMentions, ...selectedRoles])];
      
      // Create updated embed with all events
      const updatedEmbed = embedBuilder.createMultiEventAnnouncementEmbed(eventType, allEvents);
      
      // Update role mentions if there are new ones
      let updatedContent = message.content;
      if (selectedRoles.length > 0 && !selectedRoles.includes('none')) {
        const newRoleMentions = selectedRoles.map(roleName => {
          const role = guild.roles.cache.find(r => r.name === roleName);
          return role ? `<@&${role.id}>` : null;
        }).filter(Boolean);
        
        if (newRoleMentions.length > 0) {
          updatedContent += `\n\n${newRoleMentions.join(' ')} - Another tournament has been added!`;
        }
      }
      
      // Update the message
      await message.edit({
        content: updatedContent,
        embeds: [updatedEmbed]
      });
      
      // Update tracking data
      configManager.setActiveAnnouncement(guild.id, eventType, {
        messageId: message.id,
        channelId: channel.id,
        events: allEvents,
        roleMentions: combinedRoles,
        lastUpdated: Date.now()
      });
      
    } catch (error) {
      console.error('Error updating existing announcement:', error);
      // Fallback to creating new announcement
      await this.createNewAnnouncement(newEventData, selectedRoles, eventType, guild, announcementChannel);
    }
  }
  
  // Clean up old announcements (call this periodically or on bot restart)
  cleanupOldAnnouncements() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [guildId, guildAnnouncements] of configManager.activeAnnouncements.entries()) {
      for (const [eventType, announcementData] of guildAnnouncements.entries()) {
        if (announcementData.lastUpdated < cutoffTime) {
          configManager.removeActiveAnnouncement(guildId, eventType);
        }
      }
    }
  }
}

module.exports = new MultiEventHandler();
