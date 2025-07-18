const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ROLE_MAPPINGS, COLORS } = require('../config/constants');
const sessionManager = require('../utils/sessionManager');
const { startAnnouncementFlow } = require('../steps/announcementFlow');
const configManager = require('../utils/configManager');

async function checkTOPermissions(interaction) {
  // Check if user has any TO roles
  const member = interaction.member;
  if (!member) {
    await interaction.reply({ 
      content: 'Could not verify your permissions. Please try again.', 
      flags: 64 // EPHEMERAL flag
    });
    return null;
  }
  
  // First check using config manager
  if (configManager.hasToPermissions(member)) {
    const config = configManager.getGuildConfig(member.guild.id);
    if (config && config.toRoles && config.toRoles.length > 0) {
      const userTORoles = member.roles.cache.filter(role => config.toRoles.includes(role.id));
      if (userTORoles.size > 0) {
        return userTORoles;
      }
    }
  }
  
  // Fallback to hardcoded role mappings if no config exists
  const userTORoles = member.roles.cache.filter(role => 
    Object.keys(ROLE_MAPPINGS).includes(role.name)
  );
  
  if (userTORoles.size === 0) {
    const hasConfig = configManager.hasGuildConfig(member.guild.id);
    const errorMessage = hasConfig 
      ? '❌ You need to have a configured Tournament Organizer role to use the tournament manager.\n\nAsk an administrator to run `/setup` to configure TO roles.'
      : '❌ You need to have a Tournament Organizer role to use the tournament manager.\n\nAvailable TO roles: ' + Object.keys(ROLE_MAPPINGS).join(', ') + '\n\nOr ask an administrator to run `/setup` to configure custom roles.';
    
    await interaction.reply({ 
      content: errorMessage, 
      flags: 64 // EPHEMERAL flag
    });
    return null;
  }
  
  return userTORoles;
}

async function executeCreate(interaction, slug = null) {
  try {
    // Check if user already has an active session
    if (sessionManager.hasSession(interaction.user.id)) {
      return await interaction.reply({ 
        content: 'You already have an active tournament session. Please complete it first or type `cancel` to cancel.', 
        flags: 64 // EPHEMERAL flag
      });
    }
    
    const userTORoles = await checkTOPermissions(interaction);
    if (!userTORoles) return;
    
    const primaryTORole = userTORoles.first();
    
    // Create initial embed
    const embed = new EmbedBuilder()
      .setTitle('🧙 Tournament Creation Wizard')
      .setDescription(slug ? 
        `Creating tournament announcement for: \`${slug}\`\n\nI'll try to auto-import data from Start.gg.` :
        'Let\'s create a tournament announcement! I\'ll try to auto-import data from Start.gg.'
      )
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: 'Invoked by', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'TO Role', value: `<@&${primaryTORole.id}>`, inline: true }
      )
      .setFooter({ text: 'Type "cancel" at any time to cancel creation' });
    
    const botMessage = await interaction.reply({ 
      embeds: [embed], 
      fetchReply: true 
    });
    
    // Initialize session
    const session = sessionManager.createSession(interaction.user.id, {
      channelId: interaction.channel.id,
      botMessageId: botMessage.id,
      botMessage: botMessage,
      step: slug ? 'startgg_url' : 'startgg_url',
      flow: 'announcement',
      data: {},
      toRoles: userTORoles.map(role => role.name),
      primaryTORole: primaryTORole.name,
      eventType: configManager.getEventTypeFromRole(interaction.member) // Auto-detect event type
    });
    
    if (slug) {
      // If slug is provided, simulate a message with the slug and process it
      const fakeMessage = {
        content: slug,
        author: { id: interaction.user.id },
        delete: () => Promise.resolve() // Mock delete function
      };
      
      // Import the step handler and process the slug
      const { handleStartggStep } = require('../steps/startggStep');
      await handleStartggStep(fakeMessage, session);
    } else {
      // Start the normal flow
      await startAnnouncementFlow(session);
    }
    
  } catch (error) {
    console.error('Error starting tournament creation:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: 'Sorry, I couldn\'t start the tournament creation. Please try again.', 
        flags: 64 // EPHEMERAL flag
      });
    }
  }
}

module.exports = {
  name: 'tourney',
  description: 'Tournament management commands',
  
  async execute(interaction) {
    try {
      // Check if user already has an active session
      if (sessionManager.hasSession(interaction.user.id)) {
        return await interaction.reply({ 
          content: 'You already have an active tournament session. Please complete it first or type `cancel` to cancel.', 
          flags: 64 // EPHEMERAL flag
        });
      }
      
      const userTORoles = await checkTOPermissions(interaction);
      if (!userTORoles) return;
      
      const primaryTORole = userTORoles.first();
      
      // Create the main selection embed
      const embed = new EmbedBuilder()
        .setTitle('🏆 Tournament Manager')
        .setDescription(`Hello <@${interaction.user.id}>, would you like to create a tournament announcement or edit the info for an existing event?`)
        .setColor(COLORS.PRIMARY)
        .addFields(
          { name: 'Invoked by', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'TO Role', value: `<@&${primaryTORole.id}>`, inline: true }
        )
        .setFooter({ text: 'Select an option below to continue' });
      
      // Create action buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('edit_event')
            .setLabel('Edit an event')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✏️'),
          new ButtonBuilder()
            .setCustomId('announce_event')
            .setLabel('Announce an event')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📢')
        );
      
      const botMessage = await interaction.reply({ 
        embeds: [embed], 
        components: [row], 
        fetchReply: true 
      });
      
      // Initialize session with the initial selection step
      sessionManager.createSession(interaction.user.id, {
        channelId: interaction.channel.id,
        botMessageId: botMessage.id,
        botMessage: botMessage,
        step: 'main_selection',
        data: {},
        toRoles: userTORoles.map(role => role.name),
        primaryTORole: primaryTORole.name,
        eventType: configManager.getEventTypeFromRole(interaction.member) // Auto-detect event type
      });
      
    } catch (error) {
      console.error('Error starting tournament manager:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'Sorry, I couldn\'t start the tournament manager. Please try again.', 
          flags: 64 // EPHEMERAL flag
        });
      }
    }
  },
  
  executeCreate
};