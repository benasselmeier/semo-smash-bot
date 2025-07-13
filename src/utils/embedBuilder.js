const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');

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
}

module.exports = TournamentEmbedBuilder;