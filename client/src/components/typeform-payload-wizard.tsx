import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Search, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PayloadWizardProps = {
  responseData: string;
};

export function TypeformPayloadWizard({ responseData }: PayloadWizardProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleNode = useCallback((path: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string, path: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(path);
      toast({
        title: "Kopiert!",
        description: "Der Wert wurde in die Zwischenablage kopiert.",
      });
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      toast({
        title: "Fehler beim Kopieren",
        description: "Der Wert konnte nicht kopiert werden.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const renderNode = (key: string, value: any, path: string = 'root', level: number = 0) => {
    if (value === null) return <span className="text-gray-400">null</span>;
    if (typeof value === 'undefined') return <span className="text-gray-400">undefined</span>;

    const currentPath = `${path}.${key}`;
    const isExpanded = expandedNodes.has(currentPath);
    const isCopied = copiedPath === currentPath;

    // Search filtering
    const matchesSearch = searchQuery 
      ? (key.toLowerCase().includes(searchQuery.toLowerCase()) ||
         JSON.stringify(value).toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    if (!matchesSearch) return null;

    if (Array.isArray(value)) {
      return (
        <div key={currentPath} style={{ marginLeft: `${level * 20}px` }}>
          <div className="flex items-center gap-2 hover:bg-accent/50 p-1 rounded">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={() => toggleNode(currentPath)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="font-mono text-sm">{key}:</span>
            <Badge variant="outline" className="bg-blue-50">Array[{value.length}]</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6"
              onClick={() => copyToClipboard(JSON.stringify(value), currentPath)}
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-accent/20 pl-2">
              {value.map((item, index) => renderNode(`${index}`, item, currentPath, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={currentPath} style={{ marginLeft: `${level * 20}px` }}>
          <div className="flex items-center gap-2 hover:bg-accent/50 p-1 rounded">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={() => toggleNode(currentPath)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="font-mono text-sm">{key}:</span>
            <Badge variant="outline" className="bg-purple-50">Object</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6"
              onClick={() => copyToClipboard(JSON.stringify(value), currentPath)}
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {isExpanded && (
            <div className="ml-4 border-l-2 border-accent/20 pl-2">
              {Object.entries(value).map(([k, v]) => renderNode(k, v, currentPath, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    return (
      <div 
        key={currentPath} 
        style={{ marginLeft: `${level * 20}px` }} 
        className="flex items-center gap-2 hover:bg-accent/50 p-1 rounded"
      >
        <div className="w-6" /> {/* Spacer for alignment */}
        <span className="font-mono text-sm">{key}:</span>
        <div className="flex items-center gap-2">
          {typeof value === 'string' && (
            <span className="text-green-600 font-mono">"{value}"</span>
          )}
          {typeof value === 'number' && (
            <span className="text-blue-600 font-mono">{value}</span>
          )}
          {typeof value === 'boolean' && (
            <span className="text-purple-600 font-mono">{value.toString()}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6"
            onClick={() => copyToClipboard(String(value), currentPath)}
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  };

  try {
    const data = JSON.parse(responseData);
    console.log('Parsed webhook payload:', data); // Debug Ausgabe

    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Webhook Payload Details</CardTitle>
          <CardDescription>
            Interaktive Ansicht der Typeform Webhook-Antwort
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche in JSON..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[600px] overflow-auto">
          {Object.entries(data).map(([key, value]) => renderNode(key, value))}
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('Error parsing payload:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fehler bei der Visualisierung</CardTitle>
          <CardDescription>
            Die Payload konnte nicht verarbeitet werden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Fehler beim Parsen der JSON-Daten: {error instanceof Error ? error.message : 'Unexpected end of JSON input'}
          </div>
        </CardContent>
      </Card>
    );
  }
}