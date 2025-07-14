const sessionManager = require('../utils/sessionManager');
const embedBuilder = require('../utils/embedBuilder');
const { createTournamentAnnouncement } = require('./announcementHandler');
const { askVenueFeeQuestion } = require('../steps/venueFeeStep');
const { askEntryFeeQuestion } = require('../steps/entryFeeStep');
const { askEventsQuestion } = require('../steps/eventsStep');
const { showFieldEditSelection } = require('../steps/fieldEditStep');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');

async function handleSelectMenuInteraction(interaction, session) {
  const { customId, values } = interaction;
  
  // Handle setup role selections
  if (customId === 'setup_to_roles_select') {
    await interaction.deferUpdate();
    
    // Store selected TO roles
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, toRoles: values }
    });
    
    // Update the embed to show current selection
    const guild = session.botMessage.guild;
    const selectedRoleNames = values.map(roleId => {
      const role = guild.roles.cache.get(roleId);
      return role ? role.name : 'Unknown Role';
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 Step 1/4: Tournament Organizer Roles')
      .setDescription('Select all roles that should be designated as Tournament Organizer (TO) roles.\n\nThese roles will be able to create and manage tournament announcements.')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '📋 Instructions', value: 'Select all roles that tournament organizers should have. You can select multiple roles.' },
        { name: '🎯 Current Selection', value: selectedRoleNames.length > 0 ? selectedRoleNames.join(', ') : 'None selected', inline: false }
      )
      .setFooter({ text: 'Select roles from the dropdown below' });
    
    // Enable the continue button
    const roles = guild.roles.cache
      .filter(role => !role.managed && role.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .first(25);
    
    const roleOptions = roles.map(role => ({
      label: role.name,
      value: role.id,
      description: `Members: ${role.members.size}`,
      emoji: '👥'
    }));
    
    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId('setup_to_roles_select')
      .setPlaceholder('Choose TO roles...')
      .setMinValues(0)
      .setMaxValues(roleOptions.length)
      .addOptions(roleOptions);
    
    const selectRow = new ActionRowBuilder().addComponents(roleSelect);
    
    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_skip_to_roles')
          .setLabel('Skip (No TO Roles)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏭️'),
        new ButtonBuilder()
          .setCustomId('setup_continue_to_enjoyer')
          .setLabel('Continue to Next Step')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➡️')
          .setDisabled(false) // Now enabled
      );
    
    await session.botMessage.edit({ 
      embeds: [embed], 
      components: [selectRow, buttonRow] 
    });
    return;
  }
  
  if (customId === 'setup_enjoyer_roles_select') {
    await interaction.deferUpdate();
    
    // Store selected enjoyer roles
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, enjoyerRoles: values }
    });
    
    // Update the embed to show current selection
    const guild = session.botMessage.guild;
    const toRoles = session.setupData.toRoles || [];
    const toRoleNames = toRoles.map(roleId => {
      const role = guild.roles.cache.get(roleId);
      return role ? role.name : 'Unknown Role';
    });
    
    const selectedRoleNames = values.map(roleId => {
      const role = guild.roles.cache.get(roleId);
      return role ? role.name : 'Unknown Role';
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 Step 2/4: Community Notification Roles')
      .setDescription('Select roles that should receive notifications when tournaments are announced.\n\nThese are typically community roles like "SEMO Enjoyer", "St. Louis Enjoyer", etc.')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '✅ TO Roles Selected', value: toRoleNames.length > 0 ? toRoleNames.join(', ') : 'None selected', inline: false },
        { name: '📋 Instructions', value: 'Select roles that should be notified about tournaments. You can select multiple roles.' },
        { name: '🎯 Current Selection', value: selectedRoleNames.length > 0 ? selectedRoleNames.join(', ') : 'None selected', inline: false }
      )
      .setFooter({ text: 'Select notification roles from the dropdown below' });
    
    // Enable the continue button and recreate components
    const roles = guild.roles.cache
      .filter(role => !role.managed && role.name !== '@everyone' && !toRoles.includes(role.id))
      .sort((a, b) => b.position - a.position)
      .first(25);
    
    const roleOptions = roles.map(role => ({
      label: role.name,
      value: role.id,
      description: `Members: ${role.members.size}`,
      emoji: '🔔'
    }));
    
    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId('setup_enjoyer_roles_select')
      .setPlaceholder('Choose notification roles...')
      .setMinValues(0)
      .setMaxValues(roleOptions.length)
      .addOptions(roleOptions);
    
    const selectRow = new ActionRowBuilder().addComponents(roleSelect);
    
    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_skip_enjoyer_roles')
          .setLabel('Skip (No Notification Roles)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏭️'),
        new ButtonBuilder()
          .setCustomId('setup_continue_to_management_channel')
          .setLabel('Continue to Channels')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➡️')
          .setDisabled(false) // Now enabled
      );
    
    await session.botMessage.edit({ 
      embeds: [embed], 
      components: [selectRow, buttonRow] 
    });
    return;
  }
  
  if (customId === 'setup_management_channel_select') {
    await interaction.deferUpdate();
    
    const channelId = values[0];
    
    // Store selected management channel
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, managementChannelId: channelId }
    });
    
    // Update the embed to show current selection
    const guild = session.botMessage.guild;
    const selectedChannel = guild.channels.cache.get(channelId);
    
    const toRoles = session.setupData.toRoles || [];
    const enjoyerRoles = session.setupData.enjoyerRoles || [];
    
    const toRoleNames = toRoles.map(roleId => {
      const role = guild.roles.cache.get(roleId);
      return role ? role.name : 'Unknown Role';
    });
    
    const enjoyerRoleNames = enjoyerRoles.map(roleId => {
      const role = guild.roles.cache.get(roleId);
      return role ? role.name : 'Unknown Role';
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 Step 3/4: Tournament Management Channel')
      .setDescription('Select the channel where tournament organizers can use bot commands to create and manage tournaments.')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '✅ TO Roles', value: toRoleNames.length > 0 ? toRoleNames.join(', ') : 'None selected', inline: true },
        { name: '✅ Notification Roles', value: enjoyerRoleNames.length > 0 ? enjoyerRoleNames.join(', ') : 'None selected', inline: true },
        { name: '📋 Instructions', value: 'Select the channel where TOs will use `/tourney` commands. This is typically a private or restricted channel.' },
        { name: '🎯 Current Selection', value: selectedChannel ? `<#${selectedChannel.id}>` : 'None selected', inline: false }
      )
      .setFooter({ text: 'Select management channel from the dropdown below' });
    
    // Enable the continue button and recreate components
    const channels = guild.channels.cache
      .filter(channel => channel.type === 0)
      .sort((a, b) => a.position - b.position)
      .first(25);
    
    const channelOptions = channels.map(channel => ({
      label: `#${channel.name}`,
      value: channel.id,
      description: channel.topic ? channel.topic.substring(0, 100) : 'No description',
      emoji: '💬'
    }));
    
    const channelSelect = new StringSelectMenuBuilder()
      .setCustomId('setup_management_channel_select')
      .setPlaceholder('Choose management channel...')
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(channelOptions);
    
    const selectRow = new ActionRowBuilder().addComponents(channelSelect);
    
    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_skip_management_channel')
          .setLabel('Use Current Channel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📍'),
        new ButtonBuilder()
          .setCustomId('setup_continue_to_announcement_channel')
          .setLabel('Continue to Announcements')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➡️')
          .setDisabled(false) // Now enabled
      );
    
    await session.botMessage.edit({ 
      embeds: [embed], 
      components: [selectRow, buttonRow] 
    });
    return;
  }
  
  if (customId === 'setup_announcement_channel_select') {
    await interaction.deferUpdate();
    
    const channelId = values[0];
    
    // Store selected announcement channel
    sessionManager.updateSession(session.userId, {
      setupData: { ...session.setupData, announcementChannelId: channelId }
    });
    
    // Update the embed to show current selection
    const guild = session.botMessage.guild;
    const selectedChannel = guild.channels.cache.get(channelId);
    const managementChannel = session.setupData.managementChannelId ? 
      guild.channels.cache.get(session.setupData.managementChannelId) : 
      session.botMessage.channel;
    
    const embed = new EmbedBuilder()
      .setTitle('🔧 Step 4/4: Tournament Announcement Channel')
      .setDescription('Select the channel where tournament announcements will be posted for the community to see.')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '✅ Management Channel', value: `<#${managementChannel.id}>`, inline: false },
        { name: '📋 Instructions', value: 'Select the channel where tournament announcements will be posted. This is typically a public channel where community members can see upcoming tournaments.' },
        { name: '🎯 Current Selection', value: selectedChannel ? `<#${selectedChannel.id}>` : 'None selected', inline: false }
      )
      .setFooter({ text: 'Select announcement channel from the dropdown below' });
    
    // Enable the complete button and recreate components
    const channels = guild.channels.cache
      .filter(channel => channel.type === 0)
      .sort((a, b) => a.position - b.position)
      .first(25);
    
    const channelOptions = channels.map(channel => ({
      label: `#${channel.name}`,
      value: channel.id,
      description: channel.topic ? channel.topic.substring(0, 100) : 'No description',
      emoji: '📢'
    }));
    
    const channelSelect = new StringSelectMenuBuilder()
      .setCustomId('setup_announcement_channel_select')
      .setPlaceholder('Choose announcement channel...')
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(channelOptions);
    
    const selectRow = new ActionRowBuilder().addComponents(channelSelect);
    
    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_skip_announcement_channel')
          .setLabel('Use Current Channel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📍'),
        new ButtonBuilder()
          .setCustomId('setup_complete')
          .setLabel('Complete Setup')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
          .setDisabled(false) // Now enabled
      );
    
    await session.botMessage.edit({ 
      embeds: [embed], 
      components: [selectRow, buttonRow] 
    });
    return;
  }
  
  if (customId === 'events_select') {
    if (values.includes('custom')) {
      // Determine if we're in edit mode
      const step = session.step === 'edit_events' ? 'edit_events_custom' : 'events_custom';
      sessionManager.updateSession(session.userId, { step });
      await interaction.deferUpdate();
      const embed = embedBuilder.createStepEmbed(
        session.step === 'edit_events' ? 'Edit Events' : 'Step 8/8',
        'Please type the custom events:\n\n*Example: Ultimate Singles, Tekken 8, Street Fighter 6*'
      );
      await session.botMessage.edit({ embeds: [embed], components: [] });
    } else {
      sessionManager.updateSession(session.userId, {
        data: { ...session.data, events: values.join(', ') }
      });
      await interaction.deferUpdate();
      
      // Check if we're in edit mode
      if (session.step === 'edit_events') {
        await showFieldEditSelection(sessionManager.getSession(session.userId));
      } else {
        await createTournamentAnnouncement(sessionManager.getSession(session.userId));
      }
    }
  } else if (customId === 'role_notifications_select') {
    // Store selected roles and enable the confirm button
    sessionManager.updateSession(session.userId, {
      selectedRoles: values
    });
    
    await interaction.deferUpdate();
    
    // Update the buttons to enable the confirm button
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
    
    // Recreate the role select menu
    const data = session.data;
    const { ROLE_MAPPINGS } = require('../config/constants');
    const availableEnjoyerRoles = session.toRoles.map(toRole => ROLE_MAPPINGS[toRole]).filter(Boolean);
    
    const roleOptions = availableEnjoyerRoles.map(roleName => ({
      label: roleName,
      value: roleName,
      description: `Notify ${roleName} members`,
      emoji: '🔔'
    }));
    
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
    
    // Create action buttons with confirm enabled
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
          .setDisabled(false) // Now enabled
      );
    
    // Update components
    await session.botMessage.edit({ 
      components: [selectRow, buttonRow]
    });
  } else if (customId === 'field_edit_select') {
    const fieldToEdit = values[0];
    await interaction.deferUpdate();
    
    // Handle different field edits
    switch (fieldToEdit) {
      case 'event_name':
        sessionManager.updateSession(session.userId, { step: 'edit_event_name' });
        const nameEmbed = embedBuilder.createStepEmbed(
          'Edit Event Name',
          `What is the **event name**?\n\n*Current: ${session.data.eventName || 'Not set'}*\n\nEnter new event name:`
        );
        await session.botMessage.edit({ embeds: [nameEmbed], components: [] });
        break;
        
      case 'address':
        sessionManager.updateSession(session.userId, { step: 'edit_address' });
        const addressEmbed = embedBuilder.createStepEmbed(
          'Edit Address',
          `What is the **venue address**?\n\n*Current: ${session.data.address || 'Not set'}*\n\nEnter new address:`
        );
        await session.botMessage.edit({ embeds: [addressEmbed], components: [] });
        break;
        
      case 'to_contact':
        sessionManager.updateSession(session.userId, { step: 'edit_to_contact' });
        const contactEmbed = embedBuilder.createStepEmbed(
          'Edit TO Contact',
          `What is the **TO contact information**?\n\n*Current: ${session.data.toContact || 'Not set'}*\n\nEnter new contact info:`
        );
        await session.botMessage.edit({ embeds: [contactEmbed], components: [] });
        break;
        
      case 'start_time':
        sessionManager.updateSession(session.userId, { step: 'edit_start_time' });
        const timeEmbed = embedBuilder.createStepEmbed(
          'Edit Start Time',
          `What is the **start time and date**?\n\n*Current: ${session.data.startTime || 'Not set'}*\n\nEnter new start time:`
        );
        await session.botMessage.edit({ embeds: [timeEmbed], components: [] });
        break;
        
      case 'venue_fee':
        sessionManager.updateSession(session.userId, { step: 'edit_venue_fee' });
        await askVenueFeeQuestion(sessionManager.getSession(session.userId));
        break;
        
      case 'entry_fee':
        sessionManager.updateSession(session.userId, { step: 'edit_entry_fee' });
        await askEntryFeeQuestion(sessionManager.getSession(session.userId));
        break;
        
      case 'events':
        sessionManager.updateSession(session.userId, { step: 'edit_events' });
        await askEventsQuestion(sessionManager.getSession(session.userId));
        break;
    }
  }
}

module.exports = {
  handleSelectMenuInteraction
};