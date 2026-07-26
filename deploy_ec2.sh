#!/bin/bash
set -e

echo "Updating apt..."
sudo apt-get update -y
sudo apt-get install -y python3-venv nginx

cd /home/ubuntu/anomaly_detection_project

echo "Setting up Python venv..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo "Copying frontend build to Nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r frontend/dist/* /var/www/html/

echo "Configuring systemd for FastAPI..."
cat << 'EOF' | sudo tee /etc/systemd/system/fastapi.service
[Unit]
Description=FastAPI SOC Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/anomaly_detection_project
Environment="PATH=/home/ubuntu/anomaly_detection_project/venv/bin"
ExecStart=/home/ubuntu/anomaly_detection_project/venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable fastapi
sudo systemctl restart fastapi

echo "Configuring Nginx..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/default
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx

echo "Deployment complete!"
