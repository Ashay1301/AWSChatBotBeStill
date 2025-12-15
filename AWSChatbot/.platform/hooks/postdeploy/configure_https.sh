#!/bin/bash
# Configure HTTPS on nginx

# Create SSL certificate directory
sudo mkdir -p /etc/pki/nginx

# Generate self-signed certificate if it doesn't exist
if [ ! -f /etc/pki/nginx/server.crt ]; then
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/pki/nginx/server.key \
        -out /etc/pki/nginx/server.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=*.elasticbeanstalk.com"
    sudo chmod 644 /etc/pki/nginx/server.crt
    sudo chmod 600 /etc/pki/nginx/server.key
fi

# Create HTTPS nginx configuration
sudo tee /etc/nginx/conf.d/https.conf > /dev/null <<'EOF'
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    
    ssl_certificate /etc/pki/nginx/server.crt;
    ssl_certificate_key /etc/pki/nginx/server.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://nodejs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Reload nginx
sudo systemctl reload nginx

echo "HTTPS configuration completed"
