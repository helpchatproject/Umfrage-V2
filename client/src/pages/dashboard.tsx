import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, FileText, ChevronUp, BarChart2 } from "lucide-react";
import { Webhook } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [lastAnswers, setLastAnswers] = useState<Array<{question: string, answer: string}>>([]);

  const { data: webhooks } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"],
  });

  // Extrahiere Fragen und Antworten aus dem Typeform Response
  const extractQuestionsAndAnswers = (responseData: string) => {
    try {
      const data = JSON.parse(responseData);
      const formResponse = data.responseData.form_response;
      if (!formResponse?.answers || !formResponse?.definition?.fields) return [];

      // Hole alle Fragen
      const fields = formResponse.definition.fields;
      const answers = formResponse.answers;

      // Kombiniere Fragen mit Antworten
      return answers.map(answer => {
        const field = fields.find(f => f.id === answer.field.id);
        let answerText = '';

        if (answer.type === 'text') {
          answerText = answer.text;
        } else if (answer.type === 'choice') {
          answerText = answer.choice.label;
        }

        return {
          question: field?.title || '...',
          answer: answerText
        };
      });
    } catch (error) {
      console.error('Error extracting Q&A:', error);
      return [];
    }
  };

  // WebSocket setup für Debugging
  useEffect(() => {
    console.log('Setting up WebSocket connection in Dashboard...');
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('Dashboard WebSocket connection established');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "newResponse") {
          const qaList = extractQuestionsAndAnswers(event.data);
          setLastAnswers(qaList);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  // Berechne die Gesamtzahl der Antworten
  const totalResponses = webhooks?.reduce((sum, webhook) => {
    const responses = webhook.responses || [];
    return sum + responses.length;
  }, 0) || 0;

  // Berechne den Durchschnitt pro Webhook
  const averageResponses = webhooks?.length 
    ? (totalResponses / webhooks.length).toFixed(1) 
    : "0";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-[#64748B]">Aktive Webhooks</CardTitle>
              <Activity className="h-4 w-4 text-[#64748B]" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-[#1E293B]">{webhooks?.length || 0}</div>
                <div className="flex items-center text-sm text-[#10B981]">
                  <ChevronUp className="h-4 w-4" />
                  Aktiv
                </div>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Konfigurierte Webhook-Endpunkte
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-[#64748B]">Gesamte Antworten</CardTitle>
              <FileText className="h-4 w-4 text-[#64748B]" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-[#1E293B]">{totalResponses}</div>
                <div className="text-sm text-[#64748B]">Gesamt</div>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Empfangene Formularantworten
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-[#64748B]">Durchschnitt pro Webhook</CardTitle>
              <BarChart2 className="h-4 w-4 text-[#64748B]" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-[#1E293B]">{averageResponses}</div>
                <div className="text-sm text-[#64748B]">Antworten</div>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Durchschnittliche Antworten pro Webhook
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Debug Card für die letzten Antworten */}
        <Card className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
          <CardHeader>
            <CardTitle>Letzte Antworten (Debug)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lastAnswers.map((qa, index) => (
                <div key={index} className="bg-muted p-4 rounded-lg">
                  <div className="text-muted-foreground">
                    <span className="font-medium">Frage {index + 1}: </span>{qa.question}<br />
                    <span className="font-medium">Antwort: </span>{qa.answer}
                  </div>
                </div>
              ))}
              {lastAnswers.length === 0 && (
                <div className="text-muted-foreground text-center">
                  Noch keine Antworten empfangen
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {webhooks?.length === 0 && (
          <Card className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-[#64748B] mb-4" />
              <h3 className="text-lg font-medium text-[#1E293B] mb-2">Keine Webhooks konfiguriert</h3>
              <p className="text-sm text-[#64748B] mb-4">
                Erstellen Sie Ihren ersten Webhook, um Typeform-Antworten zu empfangen.
              </p>
              <Button 
                asChild
                className="bg-[#3B82F6] hover:bg-[#2563EB]"
              >
                <Link href="/webhooks">Webhook erstellen</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}