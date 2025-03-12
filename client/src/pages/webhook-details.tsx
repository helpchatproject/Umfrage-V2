import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Response, Webhook } from "@shared/schema";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TypeformPayloadWizard } from "@/components/typeform-payload-wizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TypeformForm {
  id: string;
  title: string;
  last_updated_at: string;
  _links: {
    display: string;
  };
}

interface TypeformResponse {
  response_id: string;
  submitted_at: string;
  answers: Array<{
    field: { id: string; type: string; title: string };
    type: string;
    text?: string;
    choice?: { label: string };
    choices?: { labels: string[] };
    number?: number;
    boolean?: boolean;
    email?: string;
    file_url?: string;
    date?: string;
    phone_number?: string;
  }>;
}

export default function WebhookDetails() {
  const { id } = useParams<{ id: string }>();
  const [selectedResponse, setSelectedResponse] = useState<TypeformResponse | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Webhook abrufen
  const { data: webhook, isLoading: webhookLoading } = useQuery<Webhook>({
    queryKey: ["/api/webhooks", id],
    enabled: !!id,
  });

  // Formulardetails abrufen
  const { data: formDetails, isLoading: formLoading } = useQuery<TypeformForm>({
    queryKey: ["/api/typeform-settings/forms", webhook?.typeformId],
    enabled: !!webhook?.typeformId,
  });

  // Typeform Antworten direkt von der API abrufen
  const { data: typeformResponses = [], isLoading: typeformResponsesLoading } = useQuery<TypeformResponse[]>({
    queryKey: ["/api/webhooks", webhook?.id, "typeform-responses"],
    enabled: !!webhook?.id,
    select: (data) => data.items || [],
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
  });

  if (webhookLoading || formLoading || typeformResponsesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild className="w-fit">
              <Link href="/webhooks">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zu Webhooks
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Lade Formular Antworten...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button variant="ghost" asChild className="w-fit">
              <Link href="/webhooks">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zu Webhooks
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">Webhook Antworten</h2>
          </div>
        </div>

        {/* Formular Details */}
        {formDetails && (
          <Card>
            <CardHeader>
              <CardTitle>Formular Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-500">Formular ID</p>
                    <p>{formDetails.id}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">Titel</p>
                    <p>{formDetails.title}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">Zuletzt aktualisiert</p>
                    <p>{new Date(formDetails.last_updated_at).toLocaleString("de-DE")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">Typeform Link</p>
                    <a
                      href={formDetails._links.display}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Formular öffnen
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Typeform API Antworten */}
        <Card>
          <CardHeader>
            <CardTitle>Formular Antworten</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Antwort ID</TableHead>
                  <TableHead>Eingereicht am</TableHead>
                  <TableHead>Antworten</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeformResponses && typeformResponses.length > 0 ? (
                  typeformResponses.map((response) => (
                    <TableRow key={response.response_id}>
                      <TableCell>{response.response_id}</TableCell>
                      <TableCell>
                        {new Date(response.submitted_at).toLocaleString("de-DE")}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[400px] space-y-2">
                          {response.answers?.map((answer, index) => (
                            <div key={index} className="text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                              <div className="font-medium text-gray-900">{answer.field.title}</div>
                              <div className="text-gray-600">
                                {answer.text ||
                                  answer.choice?.label ||
                                  (answer.choices?.labels || []).join(", ") ||
                                  answer.number?.toString() ||
                                  (answer.boolean ? "Ja" : "Nein") ||
                                  answer.email ||
                                  answer.date ||
                                  answer.phone_number ||
                                  "N/A"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedResponse(response);
                            setShowDialog(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Keine Antworten vorhanden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[60vw]">
            <DialogHeader>
              <DialogTitle>Antwort Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-auto">
              {selectedResponse && (
                <TypeformPayloadWizard responseData={JSON.stringify(selectedResponse)} />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}