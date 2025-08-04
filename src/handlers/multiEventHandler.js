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
      await this.updateExistingAnnouncement(existingAnnouncement, data, selectedRoles, eventType, guild, announcementChannel, session);
    } else {
      // Create new announcement
      await this.createNewAnnouncement(data, selectedRoles, eventType, guild, announcementChannel, session);
    }
    
    // Update session completion message
    await session.botMessage.edit({ 
      content: `✅ **Event added to ${EVENT_TYPE_LABELS[eventType]} announcement!** Check <#${announcementChannel.id}> for the announcement.`, 
      embeds: [], 
      components: [] 
    });
  }
  
  async createNewAnnouncement(data, selectedRoles, eventType, guild, announcementChannel, session) {
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
    
    // Create single event embed(s)
    const embeds = Array.isArray(data)
      ? data.map(event => embedBuilder.createSingleEventAnnouncementEmbed(event, eventType, session.primaryTORole))
      : [embedBuilder.createSingleEventAnnouncementEmbed(data, eventType, session.primaryTORole)];

    // Send the announcement
    const announcementMessage = await announcementChannel.send({
      content: announcementContent,
      embeds: embeds
    });

    // Track this announcement
    configManager.setActiveAnnouncement(guild.id, eventType, {
      messageId: announcementMessage.id,
      channelId: announcementChannel.id,
      events: Array.isArray(data) ? data.map(event => ({ ...event, toRole: session.primaryTORole })) : [{ ...data, toRole: session.primaryTORole }],
      roleMentions: selectedRoles,
      lastUpdated: Date.now(),
      isPlaceholder: false
    });
  }
  
  async updateExistingAnnouncement(existingAnnouncement, newEventData, selectedRoles, eventType, guild, announcementChannel, session) {
    try {
      // Get the existing message
      const channel = guild.channels.cache.get(existingAnnouncement.channelId);
      if (!channel) {
        console.error('Announcement channel not found, creating new announcement');
        await this.createNewAnnouncement(newEventData, selectedRoles, eventType, guild, announcementChannel, session);
        return;
      }
      
      const message = await channel.messages.fetch(existingAnnouncement.messageId);
      if (!message) {
        console.error('Announcement message not found, creating new announcement');
        await this.createNewAnnouncement(newEventData, selectedRoles, eventType, guild, announcementChannel, session);
        return;
      }
      
      // Handle placeholder message (first tournament being added)
      if (existingAnnouncement.isPlaceholder || existingAnnouncement.events.length === 0) {
        // Replace placeholder with first tournament
        const embed = embedBuilder.createSingleEventAnnouncementEmbed(newEventData, eventType, session.primaryTORole);
        
        // For placeholder replacement, just use the header without new role mentions
        // since this is an edit and won't trigger notifications anyway
        const announcementContent = `🎮 **${EVENT_TYPE_LABELS[eventType]}** 🎮`;
        
        await message.edit({
          content: announcementContent,
          embeds: [embed]
        });
        
        // Update tracking data
        configManager.setActiveAnnouncement(guild.id, eventType, {
          messageId: message.id,
          channelId: channel.id,
          events: [{ ...newEventData, toRole: session.primaryTORole }],
          roleMentions: selectedRoles,
          lastUpdated: Date.now(),
          isPlaceholder: false
        });
        
        return;
      }
      
      // Add to existing tournaments (not placeholder)
      const allEvents = [...existingAnnouncement.events, { ...newEventData, toRole: session.primaryTORole }];
      // Merge role mentions (avoid duplicates)
      const combinedRoles = [...new Set([...existingAnnouncement.roleMentions, ...selectedRoles])];

      // Create an array of single-event embeds for each event
      const sortedEvents = embedBuilder.sortEventsByDate([...allEvents]);
      const updatedEmbeds = sortedEvents.map(eventData =>
        embedBuilder.createSingleEventAnnouncementEmbed(eventData, eventType, eventData.toRole || session.primaryTORole)
      );

      // For message edits, just use the header without role mentions
      // since edits don't trigger notifications anyway
      const announcementContent = `🎮 **${EVENT_TYPE_LABELS[eventType]}** 🎮`;

      // Update the message
      await message.edit({
        content: announcementContent,
        embeds: updatedEmbeds
      });

      // Update tracking data
      configManager.setActiveAnnouncement(guild.id, eventType, {
        messageId: message.id,
        channelId: channel.id,
        events: allEvents,
        roleMentions: combinedRoles,
        lastUpdated: Date.now(),
        isPlaceholder: false
      });
      
    } catch (error) {
      console.error('Error updating existing announcement:', error);
      // Fallback to creating new announcement
      await this.createNewAnnouncement(newEventData, selectedRoles, eventType, guild, announcementChannel, session);
    }
  }
  
  // Clean up old announcements (call this periodically or on bot restart)
  async cleanupOldAnnouncements() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [guildId, guildAnnouncements] of configManager.activeAnnouncements.entries()) {
      for (const [eventType, announcementData] of guildAnnouncements.entries()) {
        if (announcementData.lastUpdated < cutoffTime) {
          // If it's a placeholder, reset it instead of removing it
          if (announcementData.isPlaceholder) {
            continue; // Keep placeholders, they don't expire
          }
          
          // For non-placeholder announcements, check if we should reset to placeholder
          try {
            const guild = configManager.client?.guilds.cache.get(guildId);
            if (guild) {
              const channel = guild.channels.cache.get(announcementData.channelId);
              if (channel) {
                const message = await channel.messages.fetch(announcementData.messageId);
                if (message) {
                  // Reset to placeholder content
                  await this.resetToPlaceholder(message, eventType, guildId);
                  continue;
                }
              }
            }
          } catch (error) {
            console.error('Error resetting announcement to placeholder:', error);
          }
          
          // If we can't reset to placeholder, remove the announcement
          configManager.removeActiveAnnouncement(guildId, eventType);
        }
      }
    }
  }
  
  async resetToPlaceholder(message, eventType, guildId) {
    const { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } = require('../config/constants');
    
    const placeholderEmbed = new EmbedBuilder()
      .setDescription('No tournaments currently scheduled. Check back later for updates!')
      .setColor(EVENT_TYPE_COLORS[eventType])
      .setFooter({ text: 'This message will update automatically when tournaments are added.' })
      .setTimestamp();
    
    await message.edit({
      content: `🎮 **${EVENT_TYPE_LABELS[eventType]}** 🎮`,
      embeds: [placeholderEmbed]
    });
    
    // Update tracking to mark as placeholder
    configManager.setActiveAnnouncement(guildId, eventType, {
      messageId: message.id,
      channelId: message.channel.id,
      events: [],
      roleMentions: [],
      lastUpdated: Date.now(),
      isPlaceholder: true
    });
  }
  
  // Scheduled job to remove past events from announcements
  startExpiredEventCleanupJob(client) {
    // Run every 10 minutes
    setInterval(async () => {
      for (const [guildId, guildAnnouncements] of require('../utils/configManager').activeAnnouncements.entries()) {
        for (const [eventType, announcementData] of guildAnnouncements.entries()) {
          if (!announcementData.events || announcementData.events.length === 0) continue;
          const guild = client.guilds.cache.get(guildId);
          if (!guild) continue;
          const channel = guild.channels.cache.get(announcementData.channelId);
          if (!channel) continue;
          let message;
          try {
            message = await channel.messages.fetch(announcementData.messageId);
          } catch (e) { continue; }

          // Filter out events whose date has passed
          const now = new Date();
          const validEvents = announcementData.events.filter(event => {
            const eventDate = require('../utils/embedBuilder').parseEventDate(event.startTime);
            return eventDate > now;
          });

          if (validEvents.length === 0) {
            // Reset to placeholder if no events remain
            await this.resetToPlaceholder(message, eventType, guildId);
            continue;
          }

          // Update the announcement with only valid events
          const session = { primaryTORole: validEvents[0]?.toRole };
          const updatedEmbeds = validEvents.map(eventData =>
            require('../utils/embedBuilder').createSingleEventAnnouncementEmbed(eventData, eventType, eventData.toRole || session.primaryTORole)
          );
          const { EVENT_TYPE_LABELS } = require('../config/constants');
          await message.edit({
            content: `🎮 **${EVENT_TYPE_LABELS[eventType]}** 🎮`,
            embeds: updatedEmbeds
          });

          // Update tracking data
          require('../utils/configManager').setActiveAnnouncement(guildId, eventType, {
            ...announcementData,
            events: validEvents,
            lastUpdated: Date.now(),
            isPlaceholder: false
          });
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
  }
}

module.exports = new MultiEventHandler();
