const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { COLORS } = require('../config/constants');
const sessionManager = require('../utils/sessionManager');

module.exports = {
  name: 'setup',
  description: 'Configure bot settings and permissions',
  
  async execute(interaction) {
    try {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({ 
          content: '❌ You need Administrator permissions to use the setup command.', 
          ephemeral: true 
        });
      }
      
      // Check if user already has an active session
      if (sessionManager.hasSession(interaction.user.id)) {
        return await interaction.reply({ 
          content: 'You already have an active session. Please complete it first or type `cancel` to cancel.', 
          ephemeral: true 
        });
      }
      
      // Create the main setup embed
      const embed = new EmbedBuilder()
        .setTitle('🔧 Bot Setup & Configuration')
        .setDescription('Welcome to the bot setup! Configure roles and channels for tournament management.')
        .setColor(COLORS.PRIMARY)
        .addFields(
          { name: '⚙️ What will be configured:', value: '• Tournament Organizer (TO) roles\n• Community "Enjoyer" notification roles\n• Tournament management channel\n• Announcement posting channel', inline: false },
          { name: '👤 Setup initiated by:', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🏛️ Server:', value: interaction.guild.name, inline: true }
        )
        .setFooter({ text: 'Click "Start Setup" to begin configuration' });
      
      // Create setup buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('start_setup')
            .setLabel('Start Setup')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🚀'),
          new ButtonBuilder()
            .setCustomId('cancel_setup')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
        );
      
      const botMessage = await interaction.reply({ 
        embeds: [embed], 
        components: [row], 
        fetchReply: true 
      });
      
      // Initialize setup session
      sessionManager.createSession(interaction.user.id, {
        channelId: interaction.channel.id,
        botMessageId: botMessage.id,
        botMessage: botMessage,
        step: 'setup_main',
        flow: 'setup',
        data: {
          guildId: interaction.guild.id,
          guildName: interaction.guild.name
        },
        setupData: {
          toRoles: [],
          enjoyerRoles: [],
          managementChannelId: null,
          announcementChannelId: null
        }
      });
      
    } catch (error) {
      console.error('Error starting setup:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'Sorry, I couldn\'t start the setup process. Please try again.', 
          ephemeral: true 
        });
      }
    }
  }
};
