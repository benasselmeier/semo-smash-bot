#!/bin/bash

# Discord Bot Deployment Script
# Run this on your Pi 5 to pull and deploy updates

echo "🤖 Discord Bot Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BOT_DIR="/home/pi/mb-stands-for-mother-brain"
SERVICE_NAME="discord-bot"
BACKUP_DIR="/home/pi/bot-backups"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if bot directory exists
if [ ! -d "$BOT_DIR" ]; then
    print_error "Bot directory not found: $BOT_DIR"
    print_status "Please clone the repository first:"
    echo "  git clone <your-repo-url> $BOT_DIR"
    exit 1
fi

cd "$BOT_DIR"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup current config (if exists)
if [ -f "config.js" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    cp config.js "$BACKUP_DIR/config_$TIMESTAMP.js"
    print_status "Backed up config.js to $BACKUP_DIR/config_$TIMESTAMP.js"
fi

# Stop the bot service (if running)
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "Stopping Discord bot service..."
    sudo systemctl stop "$SERVICE_NAME"
fi

# Pull latest changes
print_status "Pulling latest changes from repository..."
git fetch origin
git pull origin main

if [ $? -ne 0 ]; then
    print_error "Failed to pull latest changes"
    exit 1
fi

# Install/update dependencies
print_status "Installing dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

# Check if config needs to be restored
if [ ! -f "config.js" ] && [ -f "$BACKUP_DIR/config_*.js" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/config_*.js | head -n1)
    print_warning "config.js not found, restoring from backup: $LATEST_BACKUP"
    cp "$LATEST_BACKUP" config.js
fi

# Validate bot can start (dry run)
print_status "Validating bot configuration..."
timeout 10s node -c index.js

if [ $? -ne 0 ]; then
    print_error "Bot validation failed - check your configuration"
    exit 1
fi

# Start the bot service
print_status "Starting Discord bot service..."
sudo systemctl start "$SERVICE_NAME"
sleep 3

# Check if service started successfully
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "✅ Bot deployed and running successfully!"
    print_status "Service status:"
    systemctl status "$SERVICE_NAME" --no-pager -l
else
    print_error "❌ Failed to start bot service"
    print_status "Check logs with: journalctl -u $SERVICE_NAME -f"
    exit 1
fi

print_status "🚀 Deployment complete!"
echo ""
echo "Useful commands:"
echo "  Check status: systemctl status $SERVICE_NAME"
echo "  View logs: journalctl -u $SERVICE_NAME -f"
echo "  Restart bot: sudo systemctl restart $SERVICE_NAME"
echo "  Stop bot: sudo systemctl stop $SERVICE_NAME"
