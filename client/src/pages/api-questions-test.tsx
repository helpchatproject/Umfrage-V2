import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface TypeformField {
  id: string;
  ref: string;
  type: string;
  title: string;
  description?: string;
  properties?: {
    description?: string;
    choices?: Array<{
      id: string;
      label: string;
    }>;
    fields?: Array<{
      id: string;
      title: string;
      ref: string;
    }>;
    superfields?: Array<{
      id: string;
      title: string;
      ref: string;
    }>;
  };
  validations?: {
    required?: boolean;
  };
}

interface TypeformDefinition {
  id: string;
  title: string;
  fields: TypeformField[];
}

export default function ApiQuestionsTest() {
  const [formId, setFormId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [webhookError, setWebhookError] = useState<string>("");
  const { toast } = useToast();

  const { data: formDefinition, isLoading, error, refetch } = useQuery<TypeformDefinition>({
    queryKey: ["/api/typeform/form-definition", formId],
    queryFn: async () => {
      try {
        if (!formId.trim()) {
          throw new Error("Bitte geben Sie eine Form-ID ein");
        }

        const res = await fetch("/api/typeform/form", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ formId: formId.trim() })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Fehler beim Laden der Formularstruktur");
        }

        const data = await res.json();
        console.log("📢 Geladene Formularstruktur:", data);
        return data;
      } catch (error) {
        console.error("❌ Fehler beim Laden der Formularstruktur:", error);
        throw error;
      }
    },
    enabled: isSearching && !!formId,
    retry: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setWebhookUrl("");
    setWebhookError("");
    refetch();
  };

  const createWebhook = async () => {
    if (!formId) return;

    try {
      setIsCreatingWebhook(true);
      setWebhookError("");

      const res = await fetch("/api/typeform/webhook", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ formId: formId.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Fehler beim Erstellen des Webhooks");
      }

      console.log("Webhook erstellt:", data);
      setWebhookUrl(data.url || "");

      toast({
        title: "Erfolg",
        description: "Webhook wurde erfolgreich erstellt",
      });
    } catch (error) {
      console.error("Fehler beim Erstellen des Webhooks:", error);
      const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten";
      setWebhookError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const getFieldDetails = (field: TypeformField): string => {
    const details: string[] = [];

    if (field.type === 'yes_no') {
      details.push('Ja/Nein Frage');
    }

    if (field.type === 'matrix') {
      if (field.properties?.fields?.length) {
        details.push('Matrix-Zeilen: ' + field.properties.fields.map(f => f.title).join(', '));
      }
      if (field.properties?.superfields?.length) {
        details.push('Matrix-Spalten: ' + field.properties.superfields.map(f => f.title).join(', '));
      }
    }

    if (field.properties?.choices?.length) {
      details.push('Optionen: ' + field.properties.choices.map(c => c.label).join(', '));
    }

    if (field.description) {
      details.push(field.description);
    }

    return details.join('\n');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Fragen Test</h2>
          <p className="text-muted-foreground">
            Geben Sie eine Form-ID ein, um die zugehörigen Fragen anzuzeigen.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form-ID Eingabe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Form-ID eingeben"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" disabled={!formId || isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Lädt...
                    </>
                  ) : (
                    "Suchen"
                  )}
                </Button>
                <Button 
                  type="button" 
                  onClick={createWebhook}
                  disabled={!formId || isCreatingWebhook}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreatingWebhook ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Webhook wird erstellt...
                    </>
                  ) : (
                    "Webhook erstellen"
                  )}
                </Button>
              </div>

              {webhookUrl && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Webhook erfolgreich erstellt!</p>
                      <p className="text-sm text-muted-foreground break-all">
                        Webhook URL: {webhookUrl}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {webhookError && (
                <Alert className="mt-4" variant="destructive">
                  <AlertDescription>
                    {webhookError}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Ein Fehler ist aufgetreten"}
            </AlertDescription>
          </Alert>
        )}

        {formDefinition && (
          <Card>
            <CardHeader>
              <CardTitle>
                {formDefinition.title || "Formular Fragen"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Referenz</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Frage</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formDefinition.fields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-mono">{field.id}</TableCell>
                      <TableCell className="font-mono">{field.ref}</TableCell>
                      <TableCell>{field.type}</TableCell>
                      <TableCell>{field.title.replace(/\*/g, "")}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {getFieldDetails(field)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}