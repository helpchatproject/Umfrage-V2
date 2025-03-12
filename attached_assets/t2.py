import http.server
import json
import urllib.parse

# Speicherung der letzten Antworten für verschiedene Webhooks
responses = {
    "umfrage1": [],
    "umfrage2": []
}

class WebhookHandler(http.server.BaseHTTPRequestHandler):

    def do_POST(self):
        """Empfängt POST-Daten von Typeform (Webhook) und verarbeitet sie dynamisch"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        # Debugging: Zeige die Rohdaten im Terminal
        print("\n🔍 Vollständige JSON-Daten erhalten:")
        print(post_data.decode("utf-8"))

        # Prüfe, welche Webhook-Route aufgerufen wurde
        path = self.path.strip("/")
        print(f"\n🔔 Webhook-Aufruf: {path}")

        # Extrahiere den Webhook-Namen (umfrage1 oder umfrage2)
        parsed_url = urllib.parse.urlparse(self.path)
        webhook_name = parsed_url.path.split("/")[-1]  # Letzter Teil der URL

        if webhook_name not in responses:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error": "Webhook nicht gefunden"}')
            return

        try:
            data = json.loads(post_data)

            if "form_response" in data:
                form_response = data["form_response"]
                questions = {field["id"]: field["title"] for field in form_response["definition"]["fields"]}
                answers = form_response["answers"]

                response_data = {"Datum": form_response.get("submitted_at", "N/A"), "Antworten": {}}
                for ans in answers:
                    field_id = ans["field"]["id"]
                    answer_value = "N/A"

                    # Erkenne den Antworttyp
                    if ans["type"] == "text":
                        answer_value = ans.get("text", "N/A")
                    elif ans["type"] == "choice":
                        answer_value = ans["choice"].get("label", "N/A")
                    elif ans["type"] == "choices":
                        answer_value = ", ".join([choice["label"] for choice in ans["choices"]])
                    elif ans["type"] == "boolean":
                        answer_value = "Ja" if ans["boolean"] else "Nein"
                    elif ans["type"] == "number":
                        answer_value = str(ans.get("number", "N/A"))
                    elif ans["type"] == "date":
                        answer_value = ans.get("date", "N/A")
                    elif ans["type"] == "email":
                        answer_value = ans.get("email", "N/A")
                    elif ans["type"] == "url":
                        answer_value = ans.get("url", "N/A")
                    elif ans["type"] == "opinion_scale":
                        answer_value = str(ans.get("number", "N/A"))

                    # Speichere die Antwort zur passenden Frage
                    response_data["Antworten"][questions.get(field_id, "Unbekannte Frage")] = answer_value

                # Speichere die letzte Antwort für diesen Webhook
                responses[webhook_name] = [response_data]  # Ersetzt vorherige Einträge

                print(f"\n📥 Neue Antwort für {webhook_name} erhalten:")
                print(json.dumps(response_data, indent=2, ensure_ascii=False))

            else:
                print("⚠️ Fehler: Kein 'form_response' in den Daten gefunden.")

        except json.JSONDecodeError:
            print("❌ Fehler: Ungültiges JSON erhalten")

        # Sende eine Bestätigung zurück
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status": "success"}')

    def do_GET(self):
        """Gibt die letzte gespeicherte Antwort für die jeweilige Umfrage aus"""
        path = self.path.strip("/")
        parsed_url = urllib.parse.urlparse(self.path)
        webhook_name = parsed_url.path.split("/")[-1]  # Letzter Teil der URL

        if webhook_name not in responses:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error": "Webhook nicht gefunden"}')
            return

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(responses[webhook_name], indent=2, ensure_ascii=False).encode())

# Starte den Server auf Port 5000
PORT = 5000
server_address = ('', PORT)
httpd = http.server.HTTPServer(server_address, WebhookHandler)

print(f"🚀 Typeform Webhook-Listener läuft auf Port {PORT}...")
httpd.serve_forever()
