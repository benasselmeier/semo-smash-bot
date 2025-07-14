const { EmbedBuilder } = require('discord.js');
const { COLORS, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } = require('../config/constants');

class TournamentEmbedBuilder {
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
        { name: '💰 Entry Fee', value: data.entryFee || 'Not set', inline: true },
        { name: '🏢 Venue Fee', value: data.venueFee || 'Not set', inline: true },
        { name: '📍 Address', value: data.address || 'Not set', inline: false },
        { name: '👤 TO Contact', value: data.toContact || 'Not set', inline: true },
        { name: '🔗 Registration', value: data.startggUrl ? `[Register on Start.gg](${data.startggUrl})` : 'Registration link not available', inline: true }
      )
      .setFooter({ text: 'Good luck and have fun!' })
      .setTimestamp();
  }

  static createMultiEventAnnouncementEmbed(eventType, events) {
    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${EVENT_TYPE_LABELS[eventType]}`)
      .setDescription('Join us for exciting tournaments! Register now on Start.gg')
      .setColor(EVENT_TYPE_COLORS[eventType])
      .setFooter({ text: 'Good luck and have fun!' })
      .setTimestamp();

    // Add each event as a field
    events.forEach((eventData, index) => {
      const eventTitle = `🏆 ${eventData.eventName || 'Tournament Event'}`;
      const eventDetails = [
        `📅 **Start Time:** ${eventData.startTime || 'Not set'}`,
        `🎮 **Events:** ${eventData.events || 'Not set'}`,
        `💰 **Entry Fee:** ${eventData.entryFee || 'Not set'}`,
        `🏢 **Venue Fee:** ${eventData.venueFee || 'Not set'}`,
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
      if (index < events.length - 1) {
        embed.addFields({
          name: '\u200b', // Invisible character for spacing
          value: '─────────────────────────────────',
          inline: false
        });
      }
    });

    return embed;
  }

  static createSingleEventAnnouncementEmbed(data, eventType) {
    return new EmbedBuilder()
      .setTitle(`🏆 ${data.eventName || 'Tournament Event'}`)
      .setDescription(`Join us for an exciting tournament! Register now on Start.gg`)
      .setColor(EVENT_TYPE_COLORS[eventType] || COLORS.TOURNAMENT)
      .setURL(data.startggUrl || null)
      .addFields(
        { name: '📅 Start Time', value: data.startTime || 'Not set', inline: true },
        { name: '🎮 Events', value: data.events || 'Not set', inline: true },
        { name: '💰 Entry Fee', value: data.entryFee || 'Not set', inline: true },
        { name: '🏢 Venue Fee', value: data.venueFee || 'Not set', inline: true },
        { name: '📍 Address', value: data.address || 'Not set', inline: false },
        { name: '👤 TO Contact', value: data.toContact || 'Not set', inline: true },
        { name: '🔗 Registration', value: data.startggUrl ? `[Register on Start.gg](${data.startggUrl})` : 'Registration link not available', inline: true }
      )
      .setFooter({ text: 'Good luck and have fun!' })
      .setTimestamp();
  }
}

module.exports = TournamentEmbedBuilder;