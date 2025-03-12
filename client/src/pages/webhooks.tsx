import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Clipboard, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import WebhookForm from "@/components/forms/webhook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Webhook } from "@shared/schema";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Webhooks() {
  const [open, setOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const { toast } = useToast();

  const { data: webhooks, isLoading } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"],
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhook: Webhook) => {
      try {
        await apiRequest("DELETE", `/api/webhooks/${webhook.id}`);
        toast({
          title: "Webhook gelöscht",
          description: "Der Webhook wurde erfolgreich gelöscht.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      } catch (error) {
        console.error("Error deleting webhook:", error);
        toast({
          title: "Fehler",
          description: "Der Webhook konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut.",
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  const handleDeleteWebhook = async (webhook: Webhook) => {
    if (!window.confirm(`Möchten Sie den Webhook "${webhook.name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      await deleteWebhookMutation.mutateAsync(webhook);
    } catch (error) {
      // Error wird bereits in der Mutation behandelt
    }
  };

  const copyToClipboard = (webhookUrl: string) => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      toast({
        title: "Webhook URL kopiert",
        description: "Die URL wurde in die Zwischenablage kopiert.",
      });
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#1E293B]">Webhooks</h1>
          <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) setSelectedWebhook(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                <Plus className="mr-2 h-4 w-4" />
                Neuer Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedWebhook ? "Webhook bearbeiten" : "Neuen Webhook erstellen"}
                </DialogTitle>
              </DialogHeader>
              <WebhookForm
                webhook={selectedWebhook}
                onSuccess={() => {
                  setOpen(false);
                  setSelectedWebhook(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {webhooks?.length === 0 ? (
          <div className="rounded-lg border border-[#E2E8F0] p-8 text-center bg-white">
            <p className="text-[#64748B] mb-4">Keine Webhooks gefunden</p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                  Erstellen Sie Ihren ersten Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Webhook erstellen</DialogTitle>
                </DialogHeader>
                <WebhookForm onSuccess={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="rounded-lg border border-[#E2E8F0] bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <TableHead className="text-[#64748B] font-medium">Name</TableHead>
                  <TableHead className="text-[#64748B] font-medium">Typeform ID</TableHead>
                  <TableHead className="text-[#64748B] font-medium">Webhook URL</TableHead>
                  <TableHead className="text-[#64748B] font-medium text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks?.map((webhook) => {
                  const webhookUrl = `${window.location.origin}/api/webhooks/${webhook.typeformId}/receive`;
                  return (
                    <TableRow key={webhook.id} className="border-b border-[#E2E8F0]">
                      <TableCell className="text-[#1E293B]">{webhook.name}</TableCell>
                      <TableCell className="text-[#1E293B]">{webhook.typeformId}</TableCell>
                      <TableCell className="font-mono text-sm text-[#475569]">{webhookUrl}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-[#E5E9F2] hover:bg-[#F8FAFC]"
                            onClick={() => copyToClipboard(webhookUrl)}
                            title="URL kopieren"
                          >
                            <Clipboard className="h-4 w-4 text-[#64748B]" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-[#E5E9F2] hover:bg-[#F8FAFC]"
                            onClick={() => {
                              setSelectedWebhook(webhook);
                              setOpen(true);
                            }}
                            title="Bearbeiten"
                          >
                            <Pencil className="h-4 w-4 text-[#64748B]" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-[#E5E9F2] hover:bg-[#F8FAFC]"
                            asChild
                            title="Details anzeigen"
                          >
                            <Link href={`/webhooks/${webhook.typeformId}`}>
                              <ExternalLink className="h-4 w-4 text-[#64748B]" />
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleDeleteWebhook(webhook)}
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}