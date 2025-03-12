# Installationsanleitung für tms.helpchat.care

## 1. Systemvoraussetzungen

```bash
# System-Pakete aktualisieren
sudo apt update
sudo apt upgrade -y

# Benötigte Pakete installieren
sudo apt install -y curl git build-essential nginx
```

## 2. Node.js Installation (Version 20)

```bash
# Node.js Repository hinzufügen
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js installieren
sudo apt install -y nodejs

# Überprüfen der Installation
node --version  # Sollte v20.x.x anzeigen
npm --version   # Sollte 10.x.x anzeigen
```

## 3. PostgreSQL Installation

```bash
# PostgreSQL installieren
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL-Service starten
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Datenbank und Benutzer erstellen
sudo -u postgres psql -c "CREATE DATABASE typeform_webhook;"
sudo -u postgres psql -c "CREATE USER typeform_user WITH PASSWORD 'IhrSicheresPasswort';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE typeform_webhook TO typeform_user;"
```

## 4. Projekt-Setup

```bash
# Verzeichnis erstellen
sudo mkdir -p /var/www/tms.helpchat.care
sudo chown -R $USER:$USER /var/www/tms.helpchat.care

# Projekt klonen
cd /var/www/tms.helpchat.care
git clone <IHR-REPOSITORY-URL> .

# Abhängigkeiten installieren
npm install

# Build erstellen
npm run build
```

## 5. Umgebungsvariablen
Erstellen Sie eine `.env`-Datei im Projektverzeichnis:

```plaintext
# Datenbank-Einstellungen
DATABASE_URL=postgres://typeform_user:IhrSicheresPasswort@localhost:5432/typeform_webhook
PGUSER=typeform_user
PGHOST=localhost
PGDATABASE=typeform_webhook
PGPORT=5432
PGPASSWORD=IhrSicheresPasswort

# Session Secret
SESSION_SECRET=IhrSicheresSessionSecret

# Typeform API
TYPEFORM_ACCESS_TOKEN=IhrTypeformToken

# Server-Einstellungen
NODE_ENV=production
PORT=3000
```

## 6. PM2 für Prozess-Management

```bash
# PM2 global installieren
sudo npm install -pm2 -g

# Anwendung starten
pm2 start npm --name "typeform-webhook" -- start
pm2 startup
pm2 save
```

## 7. Nginx-Konfiguration
Erstellen Sie eine neue Nginx-Konfiguration:

```bash
sudo nano /etc/nginx/sites-available/tms.helpchat.care
```

Fügen Sie folgende Konfiguration ein:

```nginx
server {
    server_name tms.helpchat.care;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Für WebSocket-Verbindungen
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Für statische Dateien
    location /uploads {
        alias /var/www/tms.helpchat.care/public/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    client_max_body_size 5M;
}
```

Aktivieren Sie die Konfiguration:

```bash
sudo ln -s /etc/nginx/sites-available/tms.helpchat.care /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 8. SSL/TLS mit Let's Encrypt

```bash
# Certbot installieren
sudo apt install -y certbot python3-certbot-nginx

# SSL-Zertifikat erstellen
sudo certbot --nginx -d tms.helpchat.care

# Automatische Erneuerung testen
sudo certbot renew --dry-run
```

## 9. DNS-Einstellungen
In Ihrem DNS-Management-System (z.B. Cloudflare, AWS Route53) erstellen Sie folgende Einträge:

```plaintext
Typ    Name               Wert              TTL
A      tms.helpchat.care  <Server-IP>       300
```

## 10. Firewall-Einstellungen

```bash
# UFW aktivieren und konfigurieren
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

## 11. Uploads-Verzeichnis einrichten

```bash
# Uploads-Verzeichnis erstellen und Berechtigungen setzen
mkdir -p /var/www/tms.helpchat.care/public/uploads
sudo chown -R www-data:www-data /var/www/tms.helpchat.care/public/uploads
sudo chmod 755 /var/www/tms.helpchat.care/public/uploads
```

## 12. Anwendung testen
Besuchen Sie https://tms.helpchat.care und überprüfen Sie:
- HTTPS-Verbindung
- WebSocket-Verbindung
- Logo-Upload-Funktionalität
- Webhook-Empfang
- Datenbank-Verbindung

## Wartung und Monitoring

```bash
# Logs überprüfen
pm2 logs typeform-webhook

# System-Status überprüfen
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Datenbank-Backup erstellen
pg_dump -U typeform_user typeform_webhook > backup.sql
```
