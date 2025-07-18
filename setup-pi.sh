#!/bin/bash
# Quick deployment script to set up the bot on a fresh Pi
# Run this after cloning the repo to your Pi

set -e

echo "🚀 Mother Brain Bot - Quick Setup"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the bot directory"
    echo "Expected: /home/pi/discord-bots/mb-stands-for-mother-brain"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cat > .env << 'EOF'
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_guild_id_here

# Start.gg API Configuration  
STARTGG_API_TOKEN=your_startgg_token_here

# Environment
NODE_ENV=production
EOF
    echo "📝 Created .env file - please edit it with your tokens:"
    echo "   nano .env"
    echo ""
    echo "Required tokens:"
    echo "   - DISCORD_TOKEN: Your Discord bot token"
    echo "   - STARTGG_API_TOKEN: Your Start.gg API token"
    echo "   - GUILD_ID: Your Discord server ID (optional)"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
fi

# Start the bot with PM2
echo "🔄 Starting bot with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Set up PM2 to start on boot (if not already done)
if ! pm2 startup | grep -q "already"; then
    echo "🔧 Setting up PM2 to start on boot..."
    pm2 startup
    echo ""
    echo "⚠️  Please run the command shown above as sudo to complete the setup"
    echo "   Then run: pm2 save"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status                    # Check bot status"
echo "   pm2 logs mother-brain-bot    # View logs"
echo "   pm2 restart mother-brain-bot # Restart bot"
echo "   ./update-bot.sh              # Update to latest version"
echo ""
echo "🔗 The bot should now be online in your Discord server!"
