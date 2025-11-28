#!/bin/bash
# DevForge Agent API - Server Deployment Script
# Run this on a fresh Hetzner CPX21 server

set -e

echo "=== DevForge Agent API Server Setup ==="

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install essentials
apt install -y curl wget git build-essential

# Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Redis
echo "Installing Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Install Docker
echo "Installing Docker..."
apt install -y docker.io
systemctl enable docker
systemctl start docker

# Install Azure CLI
echo "Installing Azure CLI..."
curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
apt update && apt install -y google-cloud-sdk

# Install Claude Code
echo "Installing Claude Code..."
npm install -g @anthropic-ai/claude-code

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Create devforge user
echo "Creating devforge system user..."
useradd -r -s /bin/bash -m devforge || true

# Create application directory
echo "Setting up application directory..."
mkdir -p /opt/devforge-agent-api
chown devforge:devforge /opt/devforge-agent-api

# Clone/copy application (replace with actual deployment method)
echo "Application directory created at /opt/devforge-agent-api"
echo "Copy your built application files here"

# Create systemd service
cat > /etc/systemd/system/devforge-agent-api.service << 'EOF'
[Unit]
Description=DevForge Agent API
After=network.target redis.service

[Service]
Type=simple
User=devforge
WorkingDirectory=/opt/devforge-agent-api
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Setup firewall
echo "Configuring firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 8080/tcp  # Agent API port
ufw --force enable

# Setup logrotate
cat > /etc/logrotate.d/devforge-agent-api << 'EOF'
/opt/devforge-agent-api/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0640 devforge devforge
}
EOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Copy your built application to /opt/devforge-agent-api"
echo "2. Create /opt/devforge-agent-api/.env with your configuration"
echo "3. Run: systemctl enable devforge-agent-api"
echo "4. Run: systemctl start devforge-agent-api"
echo ""
echo "Or use PM2:"
echo "1. pm2 start dist/index.js --name devforge-agent-api"
echo "2. pm2 save"
echo "3. pm2 startup"
