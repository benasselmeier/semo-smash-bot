module.exports = {
  apps: [{
    name: 'semo-smash-bot',
    script: 'index.js',
    cwd: '/home/pi/discord-bots/semo-smash-bot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart strategies
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
