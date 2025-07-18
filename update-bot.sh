#!/bin/bash
# Update script for Mother Brain Discord Bot
# Usage: ./update-bot.sh

set -e  # Exit on any error

echo "🤖 Mother Brain Bot Update Script"
echo "=================================="

# Navigate to bot directory
BOT_DIR="$HOME/discord-bots/mb-stands-for-mother-brain"
cd "$BOT_DIR"

# Backup current version (just in case)
BACKUP_DIR="$HOME/discord-bots/mb-backup-$(date +%Y%m%d-%H%M%S)"
echo "💾 Creating backup at $BACKUP_DIR"
cp -r . "$BACKUP_DIR"

# Check if bot is running
if pm2 list | grep -q "mother-brain-bot"; then
    BOT_RUNNING=true
    echo "🔄 Bot is currently running, will restart after update"
else
    BOT_RUNNING=false
    echo "💤 Bot is not currently running"
fi

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install/update dependencies
echo "📦 Installing/updating dependencies..."
npm install --production

# Restart the bot if it was running
if [ "$BOT_RUNNING" = true ]; then
    echo "🔄 Restarting Mother Brain Bot..."
    pm2 restart mother-brain-bot
    echo "✅ Bot restarted successfully!"
else
    echo "▶️  Starting Mother Brain Bot..."
    pm2 start ecosystem.config.js
    echo "✅ Bot started successfully!"
fi

echo ""
echo "🎉 Update complete!"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs mother-brain-bot"
echo "🗂️  Backup saved: $BACKUP_DIR"
