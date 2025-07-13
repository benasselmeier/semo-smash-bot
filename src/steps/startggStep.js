const apiClient = require('../utils/apiClient');
const embedBuilder = require('../utils/embedBuilder');
const sessionManager = require('../utils/sessionManager');
const { COLORS } = require('../config/constants');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function showApiDataConfirmation(session, formattedData) {
  const embed = embedBuilder.createSessionEmbed(
    '✅ Found tournament on Start.gg! Here\'s what I found:',
    COLORS.SUCCESS
  ).setTitle('🏆 Tournament Data Found!')
   .addFields(
      { name: '📝 Event Name', value: formattedData.eventName, inline: false },
      { name: '📅 Start Time', value: formattedData.startTime, inline: false },
      { name: '🎮 Events', value: formattedData.events, inline: false },
      { name: '📍 Address', value: formattedData.address, inline: false },
      { name: '👤 TO Contact', value: formattedData.toContact, inline: false }
    )
    .setFooter({ text: 'Click "Use This Data" to continue with venue/entry fees, or "Edit Data" to modify some fields' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('use_api_data')
        .setLabel('Use This Data')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('edit_data')
        .setLabel('Edit Data')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️')
    );

  await session.botMessage.edit({ embeds: [embed], components: [row] });
}

async function handleStartggStep(message, session) {
  const response = message.content.trim();
  let fullUrl = response;
  let slug = response;
  
  // Handle different URL formats
  if (!response.startsWith('http')) {
    slug = response.replace(/^(https?:\/\/)?(start\.gg\/)?/, '');
    fullUrl = `https://start.gg/${slug}`;
  } else {
    slug = response.replace(/^https?:\/\/start\.gg\//, '');
  }
  
  sessionManager.updateSession(session.userId, {
    data: {
      ...session.data,
      startggUrl: fullUrl,
      slug: slug
    }
  });
  
  // Show loading message
  const loadingEmbed = embedBuilder.createSessionEmbed(
    '🔍 Checking Start.gg for tournament data...',
    COLORS.WARNING
  );
  await session.botMessage.edit({ embeds: [loadingEmbed], components: [] });
  
  // Try to fetch tournament data
  const tournamentData = await apiClient.fetchTournamentData(slug);
  
  if (tournamentData) {
    // Auto-populate data from Start.gg
    const formattedData = apiClient.formatTournamentData(tournamentData);
    
    // Update session with API data
    sessionManager.updateSession(session.userId, {
      data: {
        ...session.data,
        eventName: formattedData.eventName,
        startTime: formattedData.startTime,
        events: formattedData.events,
        address: formattedData.address,
        toContact: formattedData.toContact,
        apiData: true
      }
    });
    
    // Show confirmation with pre-filled data
    await showApiDataConfirmation(sessionManager.getSession(session.userId), formattedData);
  } else {
    // Tournament not found, ask for manual event name
    sessionManager.updateSession(session.userId, { step: 'event_name_manual' });
    const embed = embedBuilder.createStepEmbed(
      'Step 2/8', 
      '⚠️ Tournament not found on Start.gg. Let\'s continue manually.\n\nWhat is the **event name**?\n\n*Example: Weekly Smash Ultimate Tournament*'
    );
    await session.botMessage.edit({ embeds: [embed], components: [] });
  }
}

module.exports = {
  handleStartggStep,
  showApiDataConfirmation
};