import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Eye, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import jsPDF from 'jspdf';

// Typeform API-Typen
interface TypeformField {
  id: string;
  ref: string;
  type: string;
  title: string;
  properties?: {
    fields?: TypeformField[];
    superfields?: TypeformField[];
  };
}

interface TypeformAnswer {
  field: {
    id: string;
    ref: string;
    type: string;
  };
  type: string;
  text?: string;
  choice?: {
    label: string;
  };
  choices?: {
    labels: string[];
  };
  number?: number;
  boolean?: boolean;
  email?: string;
  matrix?: {
    row: {
      id: string;
      ref: string;
    };
    column: {
      id: string;
      ref: string;
    };
  };
}

interface FormResponse {
  landing_id?: string;
  token?: string;
  response_id?: string;
  submitted_at?: string;
  answers?: TypeformAnswer[];
  form_response?: {
    form_id?: string;
    token?: string;
    landed_at?: string;
    submitted_at?: string;
    answers?: TypeformAnswer[];
    definition?: {
      id?: string;
      title?: string;
      fields?: TypeformField[];
    };
  };
}

export default function ApiTest() {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const formId = "Y3Z308AH";
  const [questionsMap, setQuestionsMap] = useState<Record<string, TypeformField>>({});
  const { toast } = useToast();

  // Fragen-Definition direkt beim Laden abrufen
  useEffect(() => {
    const fetchFormDefinition = async () => {
      try {
        const res = await fetch("/api/typeform/form", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ formId })
        });

        if (!res.ok) {
          const error = await res.text();
          //setDebugInfo(`⚠️ API-Status: ${res.status} ${res.statusText}\nFehler: ${error}`);
          return;
        }

        const data = await res.json();
        console.log("📢 Formular-Definition geladen:", data);

        // Erweiterte Fragen-Map erstellen
        const newQuestionsMap: Record<string, TypeformField> = {};
        data.fields?.forEach((field: TypeformField) => {
          // Hauptfrage speichern
          newQuestionsMap[field.id] = field;
          if (field.ref) {
            newQuestionsMap[field.ref] = field;
          }

          // Matrix-Fragen speichern
          if (field.type === 'matrix') {
            field.properties?.fields?.forEach(row => {
              newQuestionsMap[row.id] = {
                ...row,
                type: 'matrix_row',
                parent: field
              };
              if (row.ref) {
                newQuestionsMap[row.ref] = newQuestionsMap[row.id];
              }
            });

            field.properties?.superfields?.forEach(col => {
              newQuestionsMap[col.id] = {
                ...col,
                type: 'matrix_column',
                parent: field
              };
              if (col.ref) {
                newQuestionsMap[col.ref] = newQuestionsMap[col.id];
              }
            });
          }
        });
        setQuestionsMap(newQuestionsMap);


      } catch (error) {
        console.error("Fehler beim Laden der Formular-Definition:", error);
        //setDebugInfo(`❌ API-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    };

    fetchFormDefinition();
  }, [formId]);

  // Antworten laden
  const { data: responses, isLoading: isLoadingResponses, error } = useQuery<FormResponse[]>({
    queryKey: [`/api/typeform/forms/${formId}/responses`],
    queryFn: async () => {
      try {
        console.log("Lade Antworten...");
        const res = await fetch(`/api/typeform/forms/${formId}/responses`);
        if (!res.ok) throw new Error("Fehler beim Laden der Antworten");
        const data = await res.json();
        console.log("📢 Geladene Antworten:", data);
        return Array.isArray(data) ? data : [data];
      } catch (error) {
        console.error("❌ Fehler beim Laden der Antworten:", error);
        throw error;
      }
    },
  });

  // Hilfsfunktion zum Formatieren der Antworten
  const formatAnswer = (answer: TypeformAnswer): string => {
    if (!answer) return "Keine Antwort";

    switch (answer.type) {
      case "text":
        return answer.text || "Keine Antwort";
      case "choice":
        return answer.choice?.label || "Keine Auswahl";
      case "choices":
        return answer.choices?.labels?.join(", ") || "Keine Auswahl";
      case "number":
        return answer.number?.toString() || "";
      case "boolean":
        return answer.boolean ? "Ja" : "Nein";
      case "email":
        return answer.email || "Keine E-Mail";
      case "matrix":
        //Hier wird die Matrix Antwort behandelt
        return Object.entries(answer.matrix || {}).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ');
      default:
        return "Unbekannter Typ";
    }
  };

  // Hilfsfunktionen zum Umgang mit beiden API-Formaten
  const getAnswers = (response: FormResponse): TypeformAnswer[] => {
    if (response?.form_response?.answers) {
      return response.form_response.answers;
    }
    return response?.answers || [];
  };

  const getSubmittedAt = (response: FormResponse): string | undefined => {
    if (response?.form_response?.submitted_at) {
      return response.form_response.submitted_at;
    }
    return response?.submitted_at;
  };

  // Funktion zum Finden des Fragetexts aus der Fragen-Map
  const findQuestionText = (answer: TypeformAnswer, field: { id: string; ref: string }): string => {
    // Wenn es eine Matrix-Frage ist
    if (answer.type === "matrix" && answer.matrix) {
      const matrixField = questionsMap[answer.field.id] || questionsMap[answer.field.ref];

      if (matrixField && matrixField.properties) {
        const rowTitle = matrixField.properties.fields?.find(row =>
          row.id === answer.matrix?.row.id || row.ref === answer.matrix?.row.ref
        )?.title || "Unbekannte Zeile";

        const columnTitle = matrixField.properties.superfields?.find(col =>
          col.id === answer.matrix?.column.id || col.ref === answer.matrix?.column.ref
        )?.title || "Unbekannte Spalte";

        return `${matrixField.title}: ${rowTitle} - ${columnTitle}`;
      }
    }

    // Für andere Fragetypen
    if (field.id && questionsMap[field.id]) {
      return questionsMap[field.id].title;
    }
    if (field.ref && questionsMap[field.ref]) {
      return questionsMap[field.ref].title;
    }
    return `Frage ${field.id || field.ref}`;
  };

  // PDF Export Funktion
  const exportToPDF = (response: FormResponse) => {
    const doc = new jsPDF();
    const answers = getAnswers(response);
    const margin = 20;
    let y = margin;

    // Titel
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Fallbericht", margin, y);
    y += 10;

    // Fallnummer und Datum
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Fallnummer:", margin, y);

    // Suche nach der Fallnummer in den Antworten
    const fallnummerAnswer = answers.find(a => {
      const questionText = findQuestionText(a, a.field);
      return (
        a.field.type === "number" ||
        questionText.includes("Fallnummer") ||
        questionText.toLowerCase().includes("fall")
      );
    });

    if (fallnummerAnswer && fallnummerAnswer.number) {
      doc.setFont("helvetica", "normal");
      doc.text(fallnummerAnswer.number.toString(), margin + 30, y);
    }
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Ausfülldatum:", margin, y);

    const datum = getSubmittedAt(response);
    if (datum) {
      doc.setFont("helvetica", "normal");
      doc.text(new Date(datum).toLocaleDateString("de-DE"), margin + 40, y);
    }
    y += 15;

    // Antworten gruppieren nach Kategorien
    const categories = {
      "Praktische Probleme": [] as { question: string; answer: string }[],
      "Familiäre Probleme": [] as { question: string; answer: string }[],
      "Emotionale Probleme": [] as { question: string; answer: string }[],
      "Körperliche Probleme": [] as { question: string; answer: string }[],
      "Sonstige": [] as { question: string; answer: string }[]
    };

    // Alle Antworten durchgehen und kategorisieren
    answers.forEach(answer => {
      const questionText = findQuestionText(answer, answer.field);
      const answerText = formatAnswer(answer);

      // Kategorie bestimmen
      let category = "Sonstige";

      if (questionText.includes("Wohnsituation") ||
        questionText.includes("Versicherung") ||
        questionText.includes("Arbeit") ||
        questionText.includes("Transport")) {
        category = "Praktische Probleme";
      }
      else if (questionText.includes("Partner") ||
        questionText.includes("Kind") ||
        questionText.includes("Familie")) {
        category = "Familiäre Probleme";
      }
      else if (questionText.includes("Sorgen") ||
        questionText.includes("Angst") ||
        questionText.includes("Trauer") ||
        questionText.includes("Depression")) {
        category = "Emotionale Probleme";
      }
      else if (questionText.includes("Schmerz") ||
        questionText.includes("Schlaf") ||
        questionText.includes("körper") ||
        questionText.includes("sexuell")) {
        category = "Körperliche Probleme";
      }

      categories[category].push({ question: questionText, answer: answerText });
    });

    // Kategorien in PDF einfügen
    Object.entries(categories).forEach(([categoryName, items]) => {
      if (items.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text(categoryName + ":", margin, y);
        y += 10;

        items.forEach(item => {
          doc.setFont("helvetica", "bold");
          const splitQuestion = doc.splitTextToSize(item.question + ":", 100);
          doc.text(splitQuestion, margin, y);

          doc.setFont("helvetica", "normal");
          const textWidth = doc.getTextWidth(splitQuestion[splitQuestion.length - 1]);

          if (textWidth > 50) {
            y += 6;
            doc.text(item.answer, margin + 10, y);
          } else {
            doc.text(item.answer, margin + 70, y);
          }

          y += 8;
        });

        y += 5;
      }
    });

    const filename = `${fallnummerAnswer?.number || 'unbekannt'}.pdf`;
    doc.save(filename);
  };

  if (isLoadingResponses) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground ml-2">Daten werden geladen...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Test</h2>
          <p className="text-red-500">
            Fehler beim Laden der Daten: {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <DashboardLayout>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Test</h2>
          <p className="text-muted-foreground">Keine Daten verfügbar</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredResponses = responses.filter((response) => {
    const token = response.token || response.form_response?.token || '';
    return token.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResponses = filteredResponses.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredResponses.length / pageSize);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Test</h2>
          <p className="text-muted-foreground">
            Test der Typeform API mit Form ID: {formId}
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Anzeigen</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">Einträge</span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                className="w-[200px]"
                placeholder="Suchen..."
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Response ID</TableHead>
                    <TableHead>Eingereicht am</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResponses.map((response) => (
                    <TableRow key={response.token || response.form_response?.token || 'unknown'}>
                      <TableCell>{response.token || response.form_response?.token || "Keine ID"}</TableCell>
                      <TableCell>
                        {getSubmittedAt(response)
                          ? new Date(getSubmittedAt(response)!).toLocaleString("de-DE")
                          : "Kein Datum"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedResponse(response);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportToPDF(response)}
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Zeige {startIndex + 1} bis {Math.min(endIndex, filteredResponses.length)} von{" "}
                {filteredResponses.length} Einträgen
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Seite {currentPage} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showDetails}
        onOpenChange={(open) => {
          if (!open) {
            setShowDetails(false);
            setSelectedResponse(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fragen und Antworten</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Frage</TableHead>
                    <TableHead>Antwort</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAnswers(selectedResponse).map((answer) => (
                    <TableRow key={answer.field.id}>
                      <TableCell>{findQuestionText(answer, answer.field)}</TableCell>
                      <TableCell>{formatAnswer(answer)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}