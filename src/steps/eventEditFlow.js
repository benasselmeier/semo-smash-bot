const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const configManager = require('../utils/configManager');
const embedBuilder = require('../utils/embedBuilder');

/**
 * Launches the event edit menu for a given announcement type.
 * Allows: Remove, Edit, Reorder events.
 */
async function startEventEditFlow(session) {
  const guild = session.botMessage.guild;
  const eventType = session.eventType;
  const announcement = configManager.getActiveAnnouncement(guild.id, eventType);

  if (!announcement || !announcement.events || announcement.events.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('No Events to Edit')
      .setDescription('There are no events in this announcement to edit.')
      .setColor(0xff0000);
    await session.botMessage.edit({ embeds: [embed], components: [] });
    return;
  }

  // Build select menu for events
  const eventOptions = announcement.events.map((event, idx) => ({
    label: event.eventName || `Event #${idx + 1}`,
    value: idx.toString(),
    description: event.startTime ? `Start: ${event.startTime}` : undefined,
    emoji: '🎮'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('event_edit_select')
    .setPlaceholder('Select an event to edit/remove/reorder')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(eventOptions);

  // Action buttons
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('event_edit_remove').setLabel('Remove').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    new ButtonBuilder().setCustomId('event_edit_edit').setLabel('Edit Details').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
    new ButtonBuilder().setCustomId('event_edit_up').setLabel('Move Up').setStyle(ButtonStyle.Secondary).setEmoji('⬆️'),
    new ButtonBuilder().setCustomId('event_edit_down').setLabel('Move Down').setStyle(ButtonStyle.Secondary).setEmoji('⬇️'),
    new ButtonBuilder().setCustomId('event_edit_done').setLabel('Done').setStyle(ButtonStyle.Success).setEmoji('✅')
  );

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setTitle('Edit Events')
    .setDescription('Select an event and choose an action below.')
    .setColor(0x00ff00);

  await session.botMessage.edit({ embeds: [embed], components: [selectRow, buttonRow] });
}

// --- Event Edit Handlers ---

/**
 * Handles event edit actions: remove, move up/down, edit details.
 * @param {object} session - The user session
 * @param {string} action - One of 'remove', 'edit', 'up', 'down'
 * @param {number} selectedIdx - Index of the selected event
 */
async function handleEventEditAction(session, action, selectedIdx) {
  const guild = session.botMessage.guild;
  const eventType = session.eventType;
  const announcement = configManager.getActiveAnnouncement(guild.id, eventType);
  if (!announcement || !announcement.events || !announcement.events[selectedIdx]) return;
  let events = [...announcement.events];

  if (action === 'remove') {
    events.splice(selectedIdx, 1);
  } else if (action === 'up' && selectedIdx > 0) {
    [events[selectedIdx - 1], events[selectedIdx]] = [events[selectedIdx], events[selectedIdx - 1]];
  } else if (action === 'down' && selectedIdx < events.length - 1) {
    [events[selectedIdx], events[selectedIdx + 1]] = [events[selectedIdx + 1], events[selectedIdx]];
  } else if (action === 'edit') {
    // Launch field edit for this event (reuse fieldEditStep.js logic, but for a specific event)
    // You'd need to implement a per-event edit flow, e.g. showFieldEditSelectionForEvent(session, selectedIdx)
    // For now, just show a placeholder message
    const embed = new EmbedBuilder()
      .setTitle('Edit Event Details')
      .setDescription('Event editing coming soon!')
      .setColor(0x00ff00);
    await session.botMessage.edit({ embeds: [embed], components: [] });
    return;
  }

  // Update announcement or reset to placeholder if no events left
  if (events.length === 0) {
    const multiEventHandler = require('../handlers/multiEventHandler');
    const channel = guild.channels.cache.get(announcement.channelId);
    if (channel) {
      const message = await channel.messages.fetch(announcement.messageId);
      await multiEventHandler.resetToPlaceholder(message, eventType, guild.id);
    }
    return;
  }

  // Update the announcement embed
  const multiEventHandler = require('../handlers/multiEventHandler');
  const channel = guild.channels.cache.get(announcement.channelId);
  if (channel) {
    const message = await channel.messages.fetch(announcement.messageId);
    const updatedEmbed = embedBuilder.createMultiEventAnnouncementEmbed(eventType, events);
    await message.edit({
      content: `🎮 **${require('../config/constants').EVENT_TYPE_LABELS[eventType]}** 🎮`,
      embeds: [updatedEmbed]
    });
    // Update tracking
    configManager.setActiveAnnouncement(guild.id, eventType, {
      ...announcement,
      events,
      lastUpdated: Date.now(),
      isPlaceholder: false
    });
  }
  // Refresh the edit UI
  await startEventEditFlow(session);
}

module.exports = { startEventEditFlow, handleEventEditAction };
