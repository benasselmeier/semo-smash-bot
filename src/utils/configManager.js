const { Collection } = require('discord.js');

class ConfigManager {
  constructor() {
    // In-memory storage for now - in production this would be a database
    this.guildConfigs = new Collection();
    
    // Track active announcement messages for multi-event grouping
    this.activeAnnouncements = new Collection(); // Map<guildId, Map<eventType, messageData>>
    
    // Store client reference for cleanup operations
    this.client = null;
  }

  setClient(client) {
    this.client = client;
  }

  saveGuildConfig(guildId, config) {
    this.guildConfigs.set(guildId, {
      ...config,
      lastUpdated: Date.now()
    });
    console.log(`Saved configuration for guild ${guildId}:`, config);
  }

  getGuildConfig(guildId) {
    return this.guildConfigs.get(guildId) || null;
  }

  hasGuildConfig(guildId) {
    return this.guildConfigs.has(guildId);
  }

  deleteGuildConfig(guildId) {
    return this.guildConfigs.delete(guildId);
  }

  // Get the announcement channel for a guild
  getAnnouncementChannel(guild) {
    const config = this.getGuildConfig(guild.id);
    if (!config || !config.announcementChannelId) {
      return null;
    }
    
    return guild.channels.cache.get(config.announcementChannelId) || null;
  }

  // Get the management channel for a guild
  getManagementChannel(guild) {
    const config = this.getGuildConfig(guild.id);
    if (!config || !config.managementChannelId) {
      return null;
    }
    
    return guild.channels.cache.get(config.managementChannelId) || null;
  }

  // Check if a user has TO permissions
  hasToPermissions(member) {
    const config = this.getGuildConfig(member.guild.id);
    if (!config || !config.toRoles || config.toRoles.length === 0) {
      // If no config, fall back to hardcoded role mappings
      const { ROLE_MAPPINGS } = require('../config/constants');
      return member.roles.cache.some(role => Object.keys(ROLE_MAPPINGS).includes(role.name));
    }
    
    return member.roles.cache.some(role => config.toRoles.includes(role.id));
  }

  // Get available enjoyer roles for notifications
  getEnjoyerRoles(guild) {
    const config = this.getGuildConfig(guild.id);
    if (!config || !config.enjoyerRoles || config.enjoyerRoles.length === 0) {
      return [];
    }
    
    return config.enjoyerRoles.map(roleId => guild.roles.cache.get(roleId)).filter(Boolean);
  }

  // Determine event type based on user's TO role
  getEventTypeFromRole(member) {
    const { EVENT_TYPE_MAPPINGS } = require('../config/constants');
    
    // Check configured roles first
    const config = this.getGuildConfig(member.guild.id);
    if (config && config.toRoles && config.toRoles.length > 0) {
      const userRoles = member.roles.cache.filter(role => config.toRoles.includes(role.id));
      
      // For configured roles, we need to determine the mapping
      // This would need additional configuration in setup, for now fall back to name-based
      for (const role of userRoles.values()) {
        if (EVENT_TYPE_MAPPINGS[role.name]) {
          return EVENT_TYPE_MAPPINGS[role.name];
        }
      }
    }
    
    // Fall back to hardcoded role name mappings
    const userToRoles = member.roles.cache.filter(role => EVENT_TYPE_MAPPINGS[role.name]);
    if (userToRoles.size > 0) {
      const firstRole = userToRoles.first();
      return EVENT_TYPE_MAPPINGS[firstRole.name];
    }
    
    // Default to out of state if no specific mapping found
    return 'out_of_state';
  }
  
  // Get or create active announcement for an event type
  getActiveAnnouncement(guildId, eventType) {
    if (!this.activeAnnouncements.has(guildId)) {
      this.activeAnnouncements.set(guildId, new Collection());
    }
    
    const guildAnnouncements = this.activeAnnouncements.get(guildId);
    return guildAnnouncements.get(eventType) || null;
  }
  
  // Set active announcement for an event type
  setActiveAnnouncement(guildId, eventType, messageData) {
    if (!this.activeAnnouncements.has(guildId)) {
      this.activeAnnouncements.set(guildId, new Collection());
    }
    
    const guildAnnouncements = this.activeAnnouncements.get(guildId);
    guildAnnouncements.set(eventType, messageData);
  }
  
  // Remove active announcement
  removeActiveAnnouncement(guildId, eventType) {
    if (!this.activeAnnouncements.has(guildId)) return;
    
    const guildAnnouncements = this.activeAnnouncements.get(guildId);
    guildAnnouncements.delete(eventType);
    
    // Clean up empty guild collections
    if (guildAnnouncements.size === 0) {
      this.activeAnnouncements.delete(guildId);
    }
  }
}

module.exports = new ConfigManager();
