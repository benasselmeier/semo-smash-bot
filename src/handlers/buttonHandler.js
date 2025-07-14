const sessionManager = require('../utils/sessionManager');
const embedBuilder = require('../utils/embedBuilder');
const { askVenueFeeQuestion } = require('../steps/venueFeeStep');
const { askEntryFeeQuestion } = require('../steps/entryFeeStep');
const { createTournamentAnnouncement, postTournamentAnnouncement } = require('./announcementHandler');
const { startAnnouncementFlow } = require('../steps/announcementFlow');
const { startEditFlow } = require('../steps/editFlow');
const { showFieldEditSelection } = require('../steps/fieldEditStep');
const { startSetupFlow, setupEnjoyerRoles, setupManagementChannel, setupAnnouncementChannel } = require('../steps/setupFlow');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { COLORS } = require('../config/constants');
const configManager = require('../utils/configManager');

async function handleButtonInteraction(interaction, session) {
  const { customId } = interaction;
  
  // Handle setup flow buttons
  if (customId === 'start_setup') {
    await interaction.deferUpdate();
    await startSetupFlow(session);
    return;
  }
  
  if (customId === 'cancel_setup') {
    await interaction.deferUpdate();
    const embed = new EmbedBuilder()
      .setTitle('🔧 Setup Cancelled')
      .setDescription('Bot setup has been cancelled. No changes were made.')
      .setColor(COLORS.ERROR);
    
    await session.botMessage.edit({ embeds: [embed], components: [] });
    sessionManager.deleteSession(session.userId);
    return;
  }
  
  // Setup step navigation buttons
  if (customId === 'setup_skip_to_roles') {
    await interaction.deferUpdate();
    // Skip TO roles selection
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, toRoles: [] }
    });
    await setupEnjoyerRoles(sessionManager.getSession(session.userId));
    return;
  }
  
  if (customId === 'setup_continue_to_enjoyer') {
    await interaction.deferUpdate();
    await setupEnjoyerRoles(session);
    return;
  }
  
  if (customId === 'setup_skip_enjoyer_roles') {
    await interaction.deferUpdate();
    // Skip enjoyer roles selection
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, enjoyerRoles: [] }
    });
    await setupManagementChannel(sessionManager.getSession(session.userId));
    return;
  }
  
  if (customId === 'setup_continue_to_management_channel') {
    await interaction.deferUpdate();
    await setupManagementChannel(session);
    return;
  }
  
  if (customId === 'setup_skip_management_channel') {
    await interaction.deferUpdate();
    // Use current channel as management channel
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, managementChannelId: session.channelId }
    });
    await setupAnnouncementChannel(sessionManager.getSession(session.userId));
    return;
  }
  
  if (customId === 'setup_continue_to_announcement_channel') {
    await interaction.deferUpdate();
    await setupAnnouncementChannel(session);
    return;
  }
  
  if (customId === 'setup_skip_announcement_channel') {
    await interaction.deferUpdate();
    // Use current channel as announcement channel
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, announcementChannelId: session.channelId }
    });
    await completeSetup(session);
    return;
  }
  
  if (customId === 'setup_management_channel_manual') {
    await showChannelIdModal(interaction, 'management');
    return;
  }
  
  if (customId === 'setup_announcement_channel_manual') {
    await showChannelIdModal(interaction, 'announcement');
    return;
  }
  
  if (customId === 'setup_complete') {
    await interaction.deferUpdate();
    await completeSetup(session);
    return;
  }
  
  // Handle main selection buttons
  if (customId === 'announce_event') {
    await interaction.deferUpdate();
    await startAnnouncementFlow(session);
    return;
  }
  
  if (customId === 'edit_event') {
    await interaction.deferUpdate();
    await startEditFlow(session);
    return;
  }
  
  // Handle confirmation screen buttons
  if (customId === 'confirm_announcement') {
    if (!session.selectedRoles || session.selectedRoles.length === 0) {
      await interaction.reply({ 
        content: 'Please select roles to notify first.', 
        ephemeral: true 
      });
      return;
    }
    
    await interaction.deferUpdate();
    await postTournamentAnnouncement(session, session.selectedRoles);
    return;
  }
  
  if (customId === 'edit_announcement') {
    await interaction.deferUpdate();
    await startEditFlow(session);
    return;
  }
  
  if (customId === 'back_to_confirmation') {
    await interaction.deferUpdate();
    await createTournamentAnnouncement(session);
    return;
  }
  
  // Handle API data confirmation buttons
  if (customId === 'use_api_data') {
    sessionManager.updateSession(session.userId, { step: 'venue_fee' });
    await interaction.deferUpdate();
    await askVenueFeeQuestion(sessionManager.getSession(session.userId));
    return;
  }
  
  if (customId === 'edit_data') {
    await interaction.deferUpdate();
    // Use the field editing interface instead of sequential editing
    await startEditFlow(session);
    return;
  }
  
  // Handle venue fee buttons (both normal flow and edit flow)
  if (customId.startsWith('venue_')) {
    const feeValues = {
      'venue_free': 'Free',
      'venue_5': '$5',
      'venue_10': '$10'
    };
    
    if (feeValues[customId]) {
      sessionManager.updateSession(session.userId, {
        data: { ...session.data, venueFee: feeValues[customId] }
      });
      
      await interaction.deferUpdate();
      
      // Check if we're in edit mode
      if (session.step === 'edit_venue_fee') {
        await showFieldEditSelection(sessionManager.getSession(session.userId));
      } else {
        sessionManager.updateSession(session.userId, { step: 'entry_fee' });
        await askEntryFeeQuestion(sessionManager.getSession(session.userId));
      }
    } else if (customId === 'venue_custom') {
      const step = session.step === 'edit_venue_fee' ? 'edit_venue_fee_custom' : 'venue_fee_custom';
      sessionManager.updateSession(session.userId, { step });
      await interaction.deferUpdate();
      const embed = embedBuilder.createStepEmbed(
        session.step === 'edit_venue_fee' ? 'Edit Venue Fee' : 'Step 4/8',
        'Please type the custom venue fee amount:\n\n*Example: $15 or $7.50*'
      );
      await session.botMessage.edit({ embeds: [embed], components: [] });
    }
  } else if (customId.startsWith('entry_')) {
    const feeValues = {
      'entry_free': 'Free',
      'entry_5': '$5',
      'entry_10': '$10'
    };
    
    if (feeValues[customId]) {
      sessionManager.updateSession(session.userId, {
        data: { ...session.data, entryFee: feeValues[customId] }
      });
      
      await interaction.deferUpdate();
      
      // Check if we're in edit mode
      if (session.step === 'edit_entry_fee') {
        await showFieldEditSelection(sessionManager.getSession(session.userId));
      } else {
        await createTournamentAnnouncement(sessionManager.getSession(session.userId));
      }
    } else if (customId === 'entry_custom') {
      const step = session.step === 'edit_entry_fee' ? 'edit_entry_fee_custom' : 'entry_fee_custom';
      sessionManager.updateSession(session.userId, { step });
      await interaction.deferUpdate();
      const embed = embedBuilder.createStepEmbed(
        session.step === 'edit_entry_fee' ? 'Edit Entry Fee' : 'Step 5/8',
        'Please type the custom entry fee amount:\n\n*Example: $15 Singles, $5 Doubles*'
      );
      await session.botMessage.edit({ embeds: [embed], components: [] });
    }
  }
}

async function completeSetup(session) {
  const setupData = session.setupData;
  const guild = session.botMessage.guild;
  
  // Get role and channel names for display
  const toRoleNames = setupData.toRoles.map(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : 'Unknown Role';
  });
  
  const enjoyerRoleNames = setupData.enjoyerRoles.map(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : 'Unknown Role';
  });
  
  const managementChannel = setupData.managementChannelId ? 
    guild.channels.cache.get(setupData.managementChannelId) : 
    session.botMessage.channel;
    
  const announcementChannel = setupData.announcementChannelId ? 
    guild.channels.cache.get(setupData.announcementChannelId) : 
    session.botMessage.channel;
  
  // Create completion embed
  const embed = new EmbedBuilder()
    .setTitle('✅ Setup Complete!')
    .setDescription('Bot configuration has been successfully completed. Here\'s a summary of your settings:')
    .setColor(COLORS.SUCCESS)
    .addFields(
      { 
        name: '👥 Tournament Organizer Roles', 
        value: toRoleNames.length > 0 ? toRoleNames.join('\n') : 'None configured', 
        inline: false 
      },
      { 
        name: '🔔 Community Notification Roles', 
        value: enjoyerRoleNames.length > 0 ? enjoyerRoleNames.join('\n') : 'None configured', 
        inline: false 
      },
      { 
        name: '💬 Management Channel', 
        value: `<#${managementChannel.id}>`, 
        inline: true 
      },
      { 
        name: '📢 Announcement Channel', 
        value: `<#${announcementChannel.id}>`, 
        inline: true 
      }
    )
    .addFields(
      { 
        name: '🎯 Next Steps', 
        value: '• Tournament Organizers can now use `/tourney` commands in the management channel\n• Use `/setup` again anytime to reconfigure settings\n• Test the tournament creation flow with `/tourney create`', 
        inline: false 
      }
    )
    .setFooter({ text: 'Configuration saved successfully!' })
    .setTimestamp();
  
  await session.botMessage.edit({ embeds: [embed], components: [] });
  
  // Save the configuration using the config manager
  configManager.saveGuildConfig(guild.id, {
    guildId: guild.id,
    guildName: guild.name,
    toRoles: setupData.toRoles,
    enjoyerRoles: setupData.enjoyerRoles,
    managementChannelId: setupData.managementChannelId,
    announcementChannelId: setupData.announcementChannelId
  });
  
  // Clean up session
  sessionManager.deleteSession(session.userId);
}

async function showChannelIdModal(interaction, channelType) {
  const modal = new ModalBuilder()
    .setCustomId(`setup_${channelType}_channel_modal`)
    .setTitle(`Set ${channelType === 'management' ? 'Management' : 'Announcement'} Channel`);

  const channelInput = new TextInputBuilder()
    .setCustomId('channel_id_input')
    .setLabel('Channel ID or Channel Mention')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#channel-name or 123456789012345678')
    .setRequired(true)
    .setMaxLength(100);

  const actionRow = new ActionRowBuilder().addComponents(channelInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);
}

async function handleChannelModalSubmit(interaction) {
  const modalId = interaction.customId;
  const channelInput = interaction.fields.getTextInputValue('channel_id_input');
  
  const session = sessionManager.getSession(interaction.user.id);
  if (!session || session.flow !== 'setup') {
    await interaction.reply({ 
      content: 'Setup session not found. Please start setup again.', 
      ephemeral: true 
    });
    return;
  }

  // Parse channel input (could be ID, mention, or name)
  let channelId = channelInput.trim();
  
  // Remove # if it's at the start
  if (channelId.startsWith('#')) {
    channelId = channelId.slice(1);
  }
  
  // Extract ID from mention format <#123456789>
  if (channelId.startsWith('<#') && channelId.endsWith('>')) {
    channelId = channelId.slice(2, -1);
  }
  
  // If it's not a numeric ID, try to find by name
  if (!/^\d+$/.test(channelId)) {
    const guild = interaction.guild;
    const channel = guild.channels.cache.find(ch => ch.name === channelId && ch.type === 0);
    if (channel) {
      channelId = channel.id;
    } else {
      await interaction.reply({ 
        content: `❌ Could not find a text channel with the name "${channelInput}". Please use a channel ID or exact channel name.`, 
        ephemeral: true 
      });
      return;
    }
  }
  
  // Validate that the channel exists and is accessible
  const guild = interaction.guild;
  const channel = guild.channels.cache.get(channelId);
  
  if (!channel) {
    await interaction.reply({ 
      content: `❌ Channel not found. Please make sure the channel ID is correct and the bot has access to it.`, 
      ephemeral: true 
    });
    return;
  }
  
  if (channel.type !== 0) {
    await interaction.reply({ 
      content: `❌ Selected channel must be a text channel. "${channel.name}" is not a text channel.`, 
      ephemeral: true 
    });
    return;
  }
  
  await interaction.deferUpdate();
  
  // Update session with the selected channel
  if (modalId === 'setup_management_channel_modal') {
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, managementChannelId: channelId }
    });
    await setupAnnouncementChannel(sessionManager.getSession(session.userId));
  } else if (modalId === 'setup_announcement_channel_modal') {
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, announcementChannelId: channelId }
    });
    await completeSetup(sessionManager.getSession(session.userId));
  }
}

module.exports = {
  handleButtonInteraction,
  handleChannelModalSubmit
};