const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../config/constants');
const sessionManager = require('../utils/sessionManager');

async function startSetupFlow(session) {
  sessionManager.updateSession(session.userId, {
    step: 'setup_to_roles',
    flow: 'setup'
  });

  const guild = session.botMessage.guild;
  // Auto-detect TO roles: names containing 'TO ('
  const autoToRoles = guild.roles.cache
    .filter(role => !role.managed && role.name !== '@everyone' && role.name.includes('TO ('))
    .map(role => role.id);

  // Use auto-detected TO roles as default selection if none set
  if (!session.setupData || !session.setupData.toRoles || session.setupData.toRoles.length === 0) {
    session.setupData = { ...session.setupData, toRoles: autoToRoles };
  }
  const toRoles = session.setupData.toRoles || [];
  const toRoleNames = toRoles.map(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : 'Unknown Role';
  });

  const embed = new EmbedBuilder()
    .setTitle('🔧 Step 1/4: Tournament Organizer Roles')
    .setDescription('Select all roles that should be designated as Tournament Organizer (TO) roles.\n\nThese roles will be able to create and manage tournament announcements.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '📋 Instructions', value: 'Select all roles that tournament organizers should have. You can select multiple roles.' },
      { name: '🎯 Current Selection', value: toRoleNames.length > 0 ? toRoleNames.join(', ') : 'None selected', inline: false }
    )
    .setFooter({ text: 'Select roles from the dropdown below' });

  // Get all roles in the guild (excluding @everyone and bot roles)
  const roles = guild.roles.cache
    .filter(role => !role.managed && role.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .first(25); // Discord limit is 25 options

  if (roles.size === 0) {
    const embed = new EmbedBuilder()
      .setTitle('❌ No Roles Available')
      .setDescription('No suitable roles found in this server. Please create some roles first.')
      .setColor(COLORS.ERROR);
    
    await session.botMessage.edit({ embeds: [embed], components: [] });
    return;
  }

  const roleOptions = roles.map(role => ({
    label: role.name,
    value: role.id,
    description: `Members: ${role.members.size}`,
    emoji: '👥',
    default: toRoles.includes(role.id)
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
        .setDisabled(toRoles.length === 0) // Enable if any roles are selected
    );

  await session.botMessage.edit({ 
    embeds: [embed], 
    components: [selectRow, buttonRow] 
  });
}

async function setupEnjoyerRoles(session) {
  sessionManager.updateSession(session.userId, {
    step: 'setup_enjoyer_roles'
  });

  const guild = session.botMessage.guild;
  const toRoles = session.setupData.toRoles || [];
  // Auto-detect Tournaments roles: names containing ' Tournaments'
  const autoEnjoyerRoles = guild.roles.cache
    .filter(role => !role.managed && role.name !== '@everyone' && role.name.includes(' Tournaments'))
    .map(role => role.id);

  // Use auto-detected enjoyer roles as default if none set
  if (!session.setupData.enjoyerRoles || session.setupData.enjoyerRoles.length === 0) {
    session.setupData = { ...session.setupData, enjoyerRoles: autoEnjoyerRoles };
  }
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
    .setTitle('🔧 Step 2/4: Community Notification Roles')
    .setDescription('Select roles that should receive notifications when tournaments are announced.\n\nThese are typically community roles like "SEMO Enjoyer", "St. Louis Enjoyer", etc.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '✅ TO Roles Selected', value: toRoleNames.length > 0 ? toRoleNames.join(', ') : 'None selected', inline: false },
      { name: '📋 Instructions', value: 'Select roles that should be notified about tournaments. You can select multiple roles.' },
      { name: '🎯 Current Selection', value: enjoyerRoleNames.length > 0 ? enjoyerRoleNames.join(', ') : 'None selected', inline: false }
    )
    .setFooter({ text: 'Select notification roles from the dropdown below' });

  // Get all roles in the guild (excluding @everyone, bot roles, and already selected TO roles)
  const roles = guild.roles.cache
    .filter(role => !role.managed && role.name !== '@everyone' && !toRoles.includes(role.id))
    .sort((a, b) => b.position - a.position)
    .first(25);

  if (roles.size === 0) {
    // No roles available, but continue anyway
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
      );

    await session.botMessage.edit({ 
      embeds: [embed], 
      components: [buttonRow] 
    });
    return;
  }

  const roleOptions = roles.map(role => ({
    label: role.name,
    value: role.id,
    description: `Members: ${role.members.size}`,
    emoji: '🔔',
    default: enjoyerRoles.includes(role.id)
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
        .setDisabled(enjoyerRoles.length === 0) // Enable if any roles are selected
    );

  await session.botMessage.edit({ 
    embeds: [embed], 
    components: [selectRow, buttonRow] 
  });
}

async function setupManagementChannel(session) {
  sessionManager.updateSession(session.userId, {
    step: 'setup_management_channel'
  });

  const toRoles = session.setupData.toRoles || [];
  const enjoyerRoles = session.setupData.enjoyerRoles || [];
  const guild = session.botMessage.guild;

  // Default to current channel if not already set
  if (!session.setupData.managementChannelId) {
    session.setupData.managementChannelId = session.botMessage.channel.id;
  }

  const toRoleNames = toRoles.map(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : 'Unknown Role';
  });
  const enjoyerRoleNames = enjoyerRoles.map(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : 'Unknown Role';
  });

  const currentManagementChannel = guild.channels.cache.get(session.setupData.managementChannelId);

  const embed = new EmbedBuilder()
    .setTitle('🔧 Step 3/4: Tournament Management Channel')
    .setDescription('Select the channel where tournament organizers can use bot commands to create and manage tournaments.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '✅ TO Roles', value: toRoleNames.length > 0 ? toRoleNames.join(', ') : 'None selected', inline: true },
      { name: '✅ Notification Roles', value: enjoyerRoleNames.length > 0 ? enjoyerRoleNames.join(', ') : 'None selected', inline: true },
      { name: '📋 Instructions', value: 'Select the channel where TOs will use `/tourney` commands. This is typically a private or restricted channel.\n\n💡 **Can\'t find your channel?** Click "Enter Channel ID" to manually specify any channel.' },
      { name: '🎯 Current Selection', value: currentManagementChannel ? `<#${currentManagementChannel.id}>` : 'None selected', inline: false }
    )
    .setFooter({ text: 'Select management channel from the dropdown below' });

  // Get text channels in the guild
  const channels = guild.channels.cache
    .filter(channel => channel.type === 0) // Text channels
    .sort((a, b) => a.position - b.position)
    .first(25);

  if (channels.size === 0) {
    const embed = new EmbedBuilder()
      .setTitle('❌ No Channels Available')
      .setDescription('No text channels found in this server.')
      .setColor(COLORS.ERROR);
    
    await session.botMessage.edit({ embeds: [embed], components: [] });
    return;
  }

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
        .setCustomId('setup_management_channel_manual')
        .setLabel('Enter Channel ID')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setCustomId('setup_continue_to_announcement_channel')
        .setLabel('Continue to Announcements')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➡️')
        .setDisabled(true) // Enabled when channel is selected or skipped
    );

  await session.botMessage.edit({ 
    embeds: [embed], 
    components: [selectRow, buttonRow] 
  });
}

async function setupAnnouncementChannel(session) {
  sessionManager.updateSession(session.userId, {
    step: 'setup_announcement_channel'
  });

  const setupData = session.setupData;
  const guild = session.botMessage.guild;

  // Try to auto-select 'upcoming-tournaments' channel
  let announcementChannel = guild.channels.cache.find(
    ch => ch.type === 0 && ch.name === 'upcoming-tournaments'
  );
  if (announcementChannel) {
    // Auto-set and proceed to announcements channel step
    session.setupData.announcementChannelId = announcementChannel.id;
    await require('../steps/setupFlow').setupAnnouncementsChannel(session);
    return;
  }

  const managementChannel = setupData.managementChannelId ? 
    session.botMessage.guild.channels.cache.get(setupData.managementChannelId) : 
    session.botMessage.channel;
  
  const embed = new EmbedBuilder()
    .setTitle('🔧 Step 4/4: Tournament Announcement Channel')
    .setDescription('Select the channel where tournament announcements will be posted for the community to see.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '✅ Management Channel', value: `<#${managementChannel.id}>`, inline: false },
      { name: '📋 Instructions', value: 'Select the channel where tournament announcements will be posted. This is typically a public channel where community members can see upcoming tournaments.\n\n💡 **Can\'t find your channel?** Click "Enter Channel ID" to manually specify any channel.' },
      { name: '🎯 Current Selection', value: 'None selected', inline: false }
    )
    .setFooter({ text: 'Select announcement channel from the dropdown below' });

  // Get text channels in the guild
  const channels = guild.channels.cache
    .filter(channel => channel.type === 0) // Text channels
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
        .setCustomId('setup_announcement_channel_manual')
        .setLabel('Enter Channel ID')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setCustomId('setup_complete')
        .setLabel('Complete Setup')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
        .setDisabled(true) // Enabled when channel is selected or skipped
    );

  await session.botMessage.edit({ 
    embeds: [embed], 
    components: [selectRow, buttonRow] 
  });
}

async function setupAnnouncementsChannel(session) {
  sessionManager.updateSession(session.userId, {
    step: 'setup_announcements_channel'
  });

  const setupData = session.setupData;
  const guild = session.botMessage.guild;

  // Try to auto-select 'announcements' channel
  let announcementsChannel = guild.channels.cache.find(
    ch => ch.type === 0 && ch.name === 'announcements'
  );
  if (announcementsChannel) {
    session.setupData.announcementsChannelId = announcementsChannel.id;
    // Continue to next step (complete setup)
    await require('../handlers/buttonHandler').completeSetup(session);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🔧 Step 5/5: Announcements Channel')
    .setDescription('Select the channel where announcement pings will be posted when a new tournament is created. This is typically a public channel named "announcements".')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '📋 Instructions', value: 'Select the channel for tournament announcement pings. This is where the bot will post a notification when a new event is added.\n\n💡 **Can\'t find your channel?** Click "Enter Channel ID" to manually specify any channel.' },
      { name: '🎯 Current Selection', value: 'None selected', inline: false }
    )
    .setFooter({ text: 'Select announcements channel from the dropdown below' });

  // Get text channels in the guild
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
    .setCustomId('setup_announcements_channel_select')
    .setPlaceholder('Choose announcements channel...')
    .setMinValues(0)
    .setMaxValues(1)
    .addOptions(channelOptions);

  const selectRow = new ActionRowBuilder().addComponents(channelSelect);
  
  const buttonRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_skip_announcements_channel')
        .setLabel('Use Current Channel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📍'),
      new ButtonBuilder()
        .setCustomId('setup_announcements_channel_manual')
        .setLabel('Enter Channel ID')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setCustomId('setup_complete')
        .setLabel('Complete Setup')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
        .setDisabled(true)
    );

  await session.botMessage.edit({ 
    embeds: [embed], 
    components: [selectRow, buttonRow] 
  });
}

module.exports = {
  startSetupFlow,
  setupEnjoyerRoles,
  setupManagementChannel,
  setupAnnouncementChannel,
  setupAnnouncementsChannel
};
