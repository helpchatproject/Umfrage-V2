# Fehlerbehebung für 502 Bad Gateway

## Häufige Ursachen und Lösungen

### 1. PM2 Prozess läuft nicht
```bash
# PM2 Status prüfen
sudo pm2 list

# Falls nicht gestartet, neu starten
cd /var/www/tms.helpchat.care
sudo pm2 start npm --name "typeform-webhook" -- start
sudo pm2 save
```

### 2. Nginx Konfigurationsprobleme
```bash
# Nginx Syntax prüfen
sudo nginx -t

# Nginx neustarten
sudo systemctl restart nginx

# Logs prüfen
sudo tail -f /var/log/nginx/error.log
```

### 3. Port-Konflikte
```bash
# Prüfen Sie, ob Port 3000 verwendet wird
sudo netstat -tulpn | grep 3000

# Prüfen Sie die Nginx-Weiterleitung
sudo cat /etc/nginx/sites-available/tms.helpchat.care
```

### 4. Datenbank-Verbindungsprobleme
```bash
# PostgreSQL-Status prüfen
sudo systemctl status postgresql

# Datenbank-Verbindung testen
sudo -u postgres psql -d typeform_webhook -c "\l"
```

### 5. Umgebungsvariablen
Stellen Sie sicher, dass alle notwendigen Umgebungsvariablen in der `.env`-Datei vorhanden sind:
- DATABASE_URL
- SESSION_SECRET
- NODE_ENV=production
- PORT=3000

### 6. Berechtigungen
```bash
# Berechtigungen des Projektverzeichnisses prüfen
ls -la /var/www/tms.helpchat.care

# Uploads-Verzeichnis-Berechtigungen
ls -la /var/www/tms.helpchat.care/public/uploads
```

### 7. Firewall-Einstellungen
```bash
# UFW-Status prüfen
sudo ufw status

# Ports freigeben falls nötig
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Neustart-Prozedur
Wenn Sie alle Dienste neu starten möchten:

```bash
# 1. PM2 neu starten
sudo pm2 restart all

# 2. PostgreSQL neu starten
sudo systemctl restart postgresql

# 3. Nginx neu starten
sudo systemctl restart nginx

# 4. Status aller Dienste prüfen
sudo systemctl status postgresql
sudo systemctl status nginx
sudo pm2 status
```

## Logs prüfen
```bash
# Nginx Logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# PM2 Logs
pm2 logs

# System Logs
sudo journalctl -xe
```
