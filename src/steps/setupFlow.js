const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../config/constants');
const sessionManager = require('../utils/sessionManager');

async function startSetupFlow(session) {
  sessionManager.updateSession(session.userId, {
    step: 'setup_to_roles',
    flow: 'setup'
  });

  const guild = session.botMessage.guild;
  // Only look for SEMO TO role
  const semoToRole = guild.roles.cache.find(role => !role.managed && role.name === 'TO (SEMO)');
  const autoToRoles = semoToRole ? [semoToRole.id] : [];

  // Use SEMO TO role as default selection if none set
  session.setupData = { ...session.setupData, toRoles: autoToRoles };
  const toRoles = session.setupData.toRoles || [];
  const toRoleNames = toRoles.map(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : 'Unknown Role';
  });

  const embed = new EmbedBuilder()
    .setTitle('🔧 Step 1/2: SEMO Tournament Organizer Role')
    .setDescription('Select the SEMO TO role. Only this role will be able to create and manage tournament announcements for this trial.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '📋 Instructions', value: 'Select the SEMO TO role. You can only select one role.' },
      { name: '🎯 Current Selection', value: toRoleNames.length > 0 ? toRoleNames.join(', ') : 'None selected', inline: false }
    )
    .setFooter({ text: 'Select the SEMO TO role from the dropdown below' });

  // Only show SEMO TO role in dropdown
  const roles = semoToRole ? [semoToRole] : [];
  if (roles.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('❌ SEMO TO Role Not Found')
      .setDescription('No SEMO TO role found in this server. Please create a role named "TO (SEMO)" first.')
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
    .setPlaceholder('Choose SEMO TO role...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(roleOptions);

  const selectRow = new ActionRowBuilder().addComponents(roleSelect);
  const buttonRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_continue_to_enjoyer')
        .setLabel('Continue to Next Step')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➡️')
        .setDisabled(toRoles.length === 0)
    );

  await session.botMessage.edit({ embeds: [embed], components: [selectRow, buttonRow] });
}

async function setupEnjoyerRoles(session) {
  sessionManager.updateSession(session.userId, {
    step: 'setup_enjoyer_roles'
  });

  const guild = session.botMessage.guild;
  // Only look for SEMO Tournaments role
  const semoTournamentsRole = guild.roles.cache.find(role => !role.managed && role.name === 'SEMO Tournaments');
  const autoEnjoyerRoles = semoTournamentsRole ? [semoTournamentsRole.id] : [];
  session.setupData = { ...session.setupData, enjoyerRoles: autoEnjoyerRoles };
  const enjoyerRoles = session.setupData.enjoyerRoles || [];
  const enjoyerRoleNames = enjoyerRoles.map(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? role.name : 'Unknown Role';
  });

  const embed = new EmbedBuilder()
    .setTitle('🔧 Step 2/2: SEMO Notification Role')
    .setDescription('Select the SEMO Tournaments role. Only this role will receive notifications for new SEMO events.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '📋 Instructions', value: 'Select the SEMO Tournaments role. You can only select one role.' },
      { name: '🎯 Current Selection', value: enjoyerRoleNames.length > 0 ? enjoyerRoleNames.join(', ') : 'None selected', inline: false }
    )
    .setFooter({ text: 'Select the SEMO Tournaments role from the dropdown below' });

  // Only show SEMO Tournaments role in dropdown
  const roles = semoTournamentsRole ? [semoTournamentsRole] : [];
  if (roles.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('❌ SEMO Tournaments Role Not Found')
      .setDescription('No SEMO Tournaments role found in this server. Please create a role named "SEMO Tournaments" first.')
      .setColor(COLORS.ERROR);
    await session.botMessage.edit({ embeds: [embed], components: [] });
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
    .setPlaceholder('Choose SEMO Tournaments role...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(roleOptions);

  const selectRow = new ActionRowBuilder().addComponents(roleSelect);
  const buttonRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_continue_to_management_channel')
        .setLabel('Continue to Channels')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➡️')
        .setDisabled(enjoyerRoles.length === 0)
    );

  await session.botMessage.edit({ embeds: [embed], components: [selectRow, buttonRow] });
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

  // Do NOT auto-select 'upcoming-tournaments' channel
  // Always prompt user to choose the upcoming tournaments channel
  const managementChannel = setupData.managementChannelId ? 
    guild.channels.cache.get(setupData.managementChannelId) : 
    session.botMessage.channel;
  
  const embed = new EmbedBuilder()
    .setTitle('🔧 Step 4/4: Upcoming Tournaments Channel')
    .setDescription('Select the channel where upcoming tournaments will be posted for the community to see.')
    .setColor(COLORS.PRIMARY)
    .addFields(
      { name: '✅ Management Channel', value: `<#${managementChannel.id}>`, inline: false },
      { name: '📋 Instructions', value: 'Select the channel where upcoming tournaments will be posted. This is typically a public channel where community members can see upcoming tournaments.\n\n💡 **Can\'t find your channel?** Click "Enter Channel ID" to manually specify any channel.' },
      { name: '🎯 Current Selection', value: 'None selected', inline: false }
    )
    .setFooter({ text: 'Select upcoming tournaments channel from the dropdown below' });

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
    .setPlaceholder('Choose upcoming tournaments channel...')
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

  // Do NOT auto-select 'announcements' channel
  // Always prompt user to choose the announcements channel
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

async function createPlaceholderMessages(upcomingTournamentsChannel) {
  // Only send SEMO local event placeholder for trial
  const { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } = require('../config/constants');
  const eventType = { key: 'local', label: EVENT_TYPE_LABELS.local, color: EVENT_TYPE_COLORS.local };
  try {
    const permissions = upcomingTournamentsChannel.permissionsFor(upcomingTournamentsChannel.guild.members.me);
    if (!permissions.has('SendMessages')) return;
    if (!permissions.has('EmbedLinks')) return;

    // Delete any existing non-SEMO placeholder messages
    const messages = await upcomingTournamentsChannel.messages.fetch({ limit: 50 });
    const nonSemoPlaceholders = messages.filter(msg =>
      msg.author.id === upcomingTournamentsChannel.client.user.id &&
      (
        msg.content.includes('Missouri Events') ||
        msg.content.includes('Out of State Events') ||
        msg.content.includes('Online Events')
      )
    );
    for (const msg of nonSemoPlaceholders.values()) {
      await msg.delete().catch(() => {});
    }

    // Post SEMO placeholder only
    const placeholderEmbed = new EmbedBuilder()
      .setDescription('No SEMO tournaments currently scheduled. Check back later for updates!')
      .setColor(eventType.color)
      .setFooter({ text: 'This message will update automatically when SEMO tournaments are added.' })
      .setTimestamp();
    const placeholderMessage = await upcomingTournamentsChannel.send({
      content: `🎮 **${eventType.label} (SEMO)** 🎮`,
      embeds: [placeholderEmbed]
    });
    require('../utils/configManager').setActiveAnnouncement(upcomingTournamentsChannel.guild.id, eventType.key, {
      messageId: placeholderMessage.id,
      channelId: upcomingTournamentsChannel.id,
      events: [],
      roleMentions: [],
      lastUpdated: Date.now(),
      isPlaceholder: true
    });
  } catch (error) {
    console.error('Error creating SEMO placeholder message:', error);
  }
}

module.exports = {
  startSetupFlow,
  setupEnjoyerRoles,
  setupManagementChannel,
  setupAnnouncementChannel,
  setupAnnouncementsChannel
};
