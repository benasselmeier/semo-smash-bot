# Discord Bot Pi Deployment Guide

## 🎯 **Hardware Recommendation**

### **Best Choice: Raspberry Pi 5**
- **Performance**: Quad-core ARM Cortex-A76 (2.4GHz), 4-8GB RAM
- **Reliability**: Handles Node.js Discord bots smoothly
- **Updates**: Fast Git operations and npm installs
- **Future-proof**: Will handle bot growth easily

### **Good Alternative: Raspberry Pi 4**
- **Performance**: Quad-core ARM Cortex-A72, 4-8GB RAM
- **Proven**: Stable platform for Node.js applications
- **Cost-effective**: Great if you already have one

### **⚠️ Avoid for This Project:**
- **Pi Zero W**: 512MB RAM will cause crashes with Discord.js
- **Pi 3A+**: 512MB RAM insufficient for reliable operation

## Prerequisites on Your Chosen Pi

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (Latest LTS)
```bash
# Install Node.js 20.x (recommended for Discord.js v14)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install Git
```bash
sudo apt install git -y
```

## Deployment Setup

### 1. Clone Repository
```bash
cd /home/pi
git clone <your-repo-url> mb-stands-for-mother-brain
cd mb-stands-for-mother-brain
```

### 2. Install Dependencies
```bash
npm install --production
```

### 3. Create Configuration
```bash
# Copy your bot token and configuration
cp config.js.example config.js
nano config.js
```

### 4. Set Up Service
```bash
# Copy service file to systemd
sudo cp discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable discord-bot
```

### 5. Make Deploy Script Executable
```bash
chmod +x deploy.sh
```

## Usage

### Initial Start
```bash
sudo systemctl start discord-bot
```

### Deploy Updates (Easy!)
```bash
./deploy.sh
```

### Monitor Bot
```bash
# Check status
systemctl status discord-bot

# View live logs
journalctl -u discord-bot -f

# Restart if needed
sudo systemctl restart discord-bot
```

## Development Workflow

### From Your MacBook
1. Make changes to your bot
2. Commit and push to your repository:
   ```bash
   git add .
   git commit -m "Add new features"
   git push origin main
   ```

### On Raspberry Pi
1. Pull and deploy updates:
   ```bash
   ./deploy.sh
   ```

That's it! The script handles everything automatically.

## Features of This Setup

✅ **Auto-restart** on crashes
✅ **Easy updates** with single command
✅ **Config backup** preservation
✅ **Service management** integration
✅ **Logging** through systemd
✅ **Validation** before deployment
✅ **Graceful** service handling

## Troubleshooting

### Check Bot Status
```bash
systemctl status discord-bot
```

### View Error Logs
```bash
journalctl -u discord-bot -n 50
```

### Manual Start (for debugging)
```bash
cd /home/pi/mb-stands-for-mother-brain
node index.js
```

### Reset Service
```bash
sudo systemctl stop discord-bot
sudo systemctl disable discord-bot
sudo systemctl enable discord-bot
sudo systemctl start discord-bot
```

## Security Notes

- Bot runs as `pi` user (not root)
- Limited filesystem access
- No privilege escalation
- Systemd managed restarts

## Performance Tips

- Pi 5 should handle this bot easily
- Monitor with `htop` if you see issues
- Consider USB 3.0 storage for better I/O

## Remote Access

Set up SSH for easy remote management:
```bash
# Enable SSH (if not already)
sudo systemctl enable ssh
sudo systemctl start ssh

# From your MacBook
ssh pi@<pi-ip-address>
cd mb-stands-for-mother-brain
./deploy.sh
```
