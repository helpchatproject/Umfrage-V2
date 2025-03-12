import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appSettingsSchema, type AppSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AppSettingsPage() {
  const { toast } = useToast();
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  // Lade aktuelle Einstellungen
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
  });

  // Form Setup
  const form = useForm({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      companyName: settings?.companyName || "Medventi GmbH",
      logoUrl: "/Medventi_logo_colour.png"
    }
  });


  // Logo Datei Handler
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreviewLogo(null);
      return;
    }

    // Überprüfe Dateigröße (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fehler",
        description: "Die Datei ist zu groß. Maximale Größe: 2MB",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Überprüfe Dateityp
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast({
        title: "Fehler",
        description: "Nur JPG, PNG und GIF Dateien sind erlaubt",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Erstelle Vorschau
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form Submit Handler
  const onSubmit = async () => {
    const formData = new FormData();
    formData.append('companyName', form.getValues('companyName'));

    const logoInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (logoInput?.files?.[0]) {
      formData.append('logo', logoInput.files[0]);
    }

    try {
      await mutation.mutateAsync(formData);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  // Upload Mutation
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/app-settings", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ein Fehler ist aufgetreten");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      setPreviewLogo(null);
      toast({
        title: "Erfolgreich gespeichert",
        description: "Die Einstellungen wurden aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Anwendungseinstellungen</h1>
          <p className="text-muted-foreground">Verwalten Sie hier Ihre Firmeneinstellungen</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firmenname</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Geben Sie Ihren Firmennamen ein" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Firmenlogo</FormLabel>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={previewLogo || settings?.logoUrl || "/Medventi_logo_colour.png"}
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                        onError={(e) => {
                          console.error("Logo konnte nicht geladen werden");
                          (e.target as HTMLImageElement).src = "/Medventi_logo_colour.png";
                        }}
                      />
                    </div>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleLogoChange}
                      className="cursor-pointer"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Erlaubte Formate: JPG, PNG, GIF (max. 2MB)
                  </p>
                </div>
              </FormItem>

              {previewLogo && (
                <Alert>
                  <AlertDescription>
                    Ein neues Logo wurde ausgewählt. Klicken Sie auf "Speichern" um die Änderungen zu übernehmen.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                >
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Speichern
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}