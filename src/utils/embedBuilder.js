const { EmbedBuilder } = require('discord.js');
const { COLORS, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, MISSOURI_REGIONS } = require('../config/constants');

class TournamentEmbedBuilder {
  // Helper function to get Missouri region from TO role
  static getMissouriRegion(toRole) {
    return MISSOURI_REGIONS[toRole] || null;
  }

  // Helper function to parse date from start time string for sorting
  static parseEventDate(startTime) {
    if (!startTime || startTime === 'Not set') {
      return new Date(0); // Default to earliest date if no time set
    }
    
    // Try to parse the date string
    try {
      const dateString = startTime.toLowerCase().trim();
      const now = new Date();
      
      // Handle relative dates
      if (dateString.includes('today')) {
        return new Date();
      } else if (dateString.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      }
      
      // Handle day of week patterns (e.g., "Saturday, July 15th at 2:00 PM")
      const dayOfWeekPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
      const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;
      
      // Try to extract month and day
      const monthMatch = dateString.match(monthPattern);
      const dayMatch = dateString.match(/(\d{1,2})(st|nd|rd|th)?/);
      
      if (monthMatch && dayMatch) {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                          'july', 'august', 'september', 'october', 'november', 'december'];
        const month = monthNames.indexOf(monthMatch[1]);
        const day = parseInt(dayMatch[1]);
        
        if (month !== -1 && day >= 1 && day <= 31) {
          const year = now.getFullYear();
          const eventDate = new Date(year, month, day);
          
          // If the event date is in the past, assume it's for next year
          if (eventDate < now) {
            eventDate.setFullYear(year + 1);
          }
          
          return eventDate;
        }
      }
      
      // Try to parse as a regular date
      const parsed = new Date(startTime);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      
      // If all else fails, return a default date
      return new Date(0);
    } catch (error) {
      console.warn('Error parsing event date:', startTime, error);
      return new Date(0);
    }
  }

  // Helper function to sort events chronologically
  static sortEventsByDate(events) {
    return events.sort((a, b) => {
      const dateA = this.parseEventDate(a.startTime);
      const dateB = this.parseEventDate(b.startTime);
      return dateA - dateB;
    });
  }

  static createStepEmbed(step, question) {
    return new EmbedBuilder()
      .setTitle('🏆 Tournament Announcement Creator')
      .setDescription('Creating tournament announcement...')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: step, value: question }
      )
      .setFooter({ text: 'Type "cancel" at any time to cancel creation' });
  }

  static createSessionEmbed(content, color = COLORS.PRIMARY) {
    return new EmbedBuilder()
      .setTitle('🏆 Tournament Announcement Creator')
      .setDescription(content)
      .setColor(color);
  }

  static createAnnouncementEmbed(data) {
    return new EmbedBuilder()
      .setTitle(`🏆 ${data.eventName || 'Tournament Event'}`)
      .setDescription(`Join us for an exciting tournament! Register now on Start.gg`)
      .setColor(COLORS.TOURNAMENT)
      .setURL(data.startggUrl || null)
      .addFields(
        { name: '📅 Start Time', value: data.startTime || 'Not set', inline: true },
        { name: '🎮 Events', value: data.events || 'Not set', inline: true },
        { name: '📍 Address', value: data.address || 'Not set', inline: false },
        { name: '👤 TO Contact', value: data.toContact || 'Not set', inline: true },
        { name: '🔗 Registration', value: data.startggUrl ? `[Register on Start.gg](${data.startggUrl})` : 'Registration link not available', inline: true }
      )
      .setFooter({ text: 'Good luck and have fun!' })
      .setTimestamp();
  }

  static createMultiEventAnnouncementEmbed(eventType, events, defaultToRole = null) {
    const embed = new EmbedBuilder()
      .setDescription('Join us for exciting tournaments! Register now on Start.gg')
      .setColor(EVENT_TYPE_COLORS[eventType])
      .setFooter({ text: 'Good luck and have fun!' })
      .setTimestamp();

    // Sort events chronologically by date
    const sortedEvents = this.sortEventsByDate([...events]);

    // Add each event as a field
    sortedEvents.forEach((eventData, index) => {
      // For Missouri events, check if we have TO role info to display region
      let eventTitle = `🏆 ${eventData.eventName || 'Tournament Event'}`;
      
      if (eventType === 'missouri') {
        // Use the TO role from the event data, or fall back to default
        const toRole = eventData.toRole || defaultToRole;
        if (toRole) {
          const region = this.getMissouriRegion(toRole);
          if (region) {
            eventTitle = `**[${region}]** ${eventTitle}`;
          }
        }
      }

      const eventDetails = [
        `📅 **Start Time:** ${eventData.startTime || 'Not set'}`,
        `🎮 **Events:** ${eventData.events || 'Not set'}`,
        `📍 **Address:** ${eventData.address || 'Not set'}`,
        `👤 **TO Contact:** ${eventData.toContact || 'Not set'}`,
        `🔗 **Registration:** ${eventData.startggUrl ? `[Register on Start.gg](${eventData.startggUrl})` : 'Registration link not available'}`
      ].join('\n');

      embed.addFields({
        name: eventTitle,
        value: eventDetails,
        inline: false
      });

      // Add separator between events (except for the last one)
      if (index < sortedEvents.length - 1) {
        embed.addFields({
          name: '\u200b', // Invisible character for spacing
          value: '─────────────────────────────────',
          inline: false
        });
      }
    });

    return embed;
  }

  static createSingleEventAnnouncementEmbed(data, eventType, toRoleInfo = null) {
    // For Missouri events, check if we have TO role info to display region
    let eventTitle = `🏆 ${data.eventName || 'Tournament Event'}`;
    
    if (eventType === 'missouri' && toRoleInfo) {
      const region = this.getMissouriRegion(toRoleInfo);
      if (region) {
        eventTitle = `**[${region}]** ${eventTitle}`;
      }
    }

    return new EmbedBuilder()
      .setTitle(eventTitle)
      .setDescription(`Join us for an exciting tournament! Register now on Start.gg`)
      .setColor(EVENT_TYPE_COLORS[eventType] || COLORS.TOURNAMENT)
      .setURL(data.startggUrl || null)
      .addFields(
        { name: '📅 Start Time', value: data.startTime || 'Not set', inline: true },
        { name: '🎮 Events', value: data.events || 'Not set', inline: true },
        { name: '📍 Address', value: data.address || 'Not set', inline: false },
        { name: '👤 TO Contact', value: data.toContact || 'Not set', inline: true },
        { name: '🔗 Registration', value: data.startggUrl ? `[Register on Start.gg](${data.startggUrl})` : 'Registration link not available', inline: true }
      )
      .setFooter({ text: 'Good luck and have fun!' })
      .setTimestamp();
  }
}

module.exports = TournamentEmbedBuilder;