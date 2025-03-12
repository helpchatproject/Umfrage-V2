import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typeformSettingsSchema } from "@shared/schema";
import type { TypeformSettings } from "@shared/schema";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

export default function TypeformSettingsPage() {
  const { toast } = useToast();
  const [validationStatus, setValidationStatus] = useState<{
    valid?: boolean;
    message?: string;
  } | null>(null);

  const { data: settings, isLoading } = useQuery<TypeformSettings>({
    queryKey: ["/api/typeform-settings"],
  });

  const form = useForm({
    resolver: zodResolver(typeformSettingsSchema),
    defaultValues: settings || {
      apiToken: "",
      workspaceId: "",
      defaultLanguage: "de",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: TypeformSettings) => {
      const res = await apiRequest("POST", "/api/typeform-settings", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/typeform-settings"] });
      toast({
        title: "Einstellungen gespeichert",
        description: "Die Typeform-Einstellungen wurden erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: "Die Einstellungen konnten nicht gespeichert werden: " + error.message,
        variant: "destructive",
      });
    },
  });

  const validateTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/typeform-settings/validate-token", { apiToken: token });
      return res.json();
    },
    onSuccess: (data) => {
      setValidationStatus({
        valid: true,
        message: `API Token ist gültig. ${data.forms} Formulare gefunden.`
      });
    },
    onError: (error: Error) => {
      setValidationStatus({
        valid: false,
        message: error.message
      });
    },
  });

  const handleValidateToken = () => {
    const token = form.getValues("apiToken");
    if (!token) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen API Token ein.",
        variant: "destructive",
      });
      return;
    }
    validateTokenMutation.mutate(token);
  };

  const onSubmit = (values: TypeformSettings) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Typeform API Einstellungen</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>API Konfiguration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Typeform API</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Konfiguration</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="apiToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Token</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleValidateToken}
                          disabled={validateTokenMutation.isPending}
                        >
                          {validateTokenMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Token testen"
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {validationStatus && (
                  <Alert variant={validationStatus.valid ? "default" : "destructive"}>
                    {validationStatus.valid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{validationStatus.message}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="workspaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standardsprache</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie eine Sprache" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="de">Deutsch</SelectItem>
                          <SelectItem value="en">Englisch</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}