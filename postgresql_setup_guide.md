# PostgreSQL Setup Guide für Ubuntu Server

## 1. PostgreSQL Installation

```bash
# System-Pakete aktualisieren
sudo apt update
sudo apt upgrade

# PostgreSQL und erforderliche Pakete installieren
sudo apt install postgresql postgresql-contrib
```

## 2. PostgreSQL Status prüfen

```bash
# Überprüfen Sie, ob PostgreSQL läuft
sudo systemctl status postgresql

# Falls nicht aktiv, starten Sie PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 3. PostgreSQL Benutzer erstellen

```bash
# Wechseln Sie zum postgres Benutzer
sudo -i -u postgres

# Erstellen Sie einen neuen Datenbankbenutzer
createuser --interactive --pwprompt
# Geben Sie ein:
# Name of role to add: typeform_user
# Password for new role: 9Gv$kW7!aQp&Zr2h
# Shall the new role be a superuser? n
# Shall the new role be allowed to create databases? y
# Shall the new role be allowed to create more new roles? n
```

## 4. Datenbank erstellen

```bash
# Als postgres Benutzer
createdb typeform_webhook

# Berechtigungen zuweisen
psql
# Im psql Terminal:
GRANT ALL PRIVILEGES ON DATABASE typeform_webhook TO typeform_user;
```

## 5. PostgreSQL Konfiguration anpassen

```bash
# Bearbeiten Sie die PostgreSQL Konfiguration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Ändern Sie die Zeile:
listen_addresses = '*'

# Bearbeiten Sie die Client-Authentifizierung
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Fügen Sie diese Zeile hinzu:
host    typeform_webhook    typeform_user    127.0.0.1/32    md5
```

## 6. Verbindung testen

```bash
# Verbindung zur Datenbank testen
psql -h localhost -U typeform_user -d typeform_webhook

# Verbindungsstring für die Anwendung
DATABASE_URL=postgres://typeform_user:9Gv$kW7!aQp&Zr2h@localhost:5432/typeform_webhook
```

## Fehlerbehebung

Falls Sie Verbindungsprobleme haben:

1. Überprüfen Sie den PostgreSQL Service:
```bash
sudo systemctl status postgresql
```

2. Überprüfen Sie die Firewall:
```bash
sudo ufw status
# Falls nötig:
sudo ufw allow 5432/tcp
```

3. Überprüfen Sie die Logs:
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```
