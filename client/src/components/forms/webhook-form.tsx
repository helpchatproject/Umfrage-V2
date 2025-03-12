import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWebhookSchema, Webhook } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, X, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WebhookFormProps {
  webhook?: Webhook | null;
  onSuccess?: () => void;
}

interface TypeformForm {
  id: string;
  title: string;
}

export default function WebhookForm({ webhook, onSuccess }: WebhookFormProps) {
  const { toast } = useToast();
  const [emailAddresses, setEmailAddresses] = useState<string[]>(webhook?.notifyEmailAddresses || []);

  // Fetch available Typeform forms
  const { data: forms = [], isLoading: formsLoading } = useQuery<TypeformForm[]>({
    queryKey: ["/api/typeform-settings/forms"],
    refetchOnWindowFocus: false,
  });

  const form = useForm({
    resolver: zodResolver(insertWebhookSchema),
    defaultValues: {
      name: webhook?.name || "",
      typeformId: webhook?.typeformId || "",
      notifyEmail: webhook?.notifyEmail || false,
      notifyEmailAddresses: webhook?.notifyEmailAddresses || [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { name: string; typeformId: string; notifyEmail: boolean; notifyEmailAddresses: string[] }) => {
      console.log("Attempting to create webhook with data:", data);

      const response = await fetch(webhook ? `/api/webhooks/${webhook.id}` : "/api/webhooks", {
        method: webhook ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          userId: webhook?.userId, // Ensure we pass the userId for updates
          notifyEmailAddresses: data.notifyEmail ? data.notifyEmailAddresses : []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error response:", errorData);
        throw new Error(errorData.details || errorData.error || "Ein Fehler ist aufgetreten");
      }

      const result = await response.json();
      console.log("Server response:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: webhook ? "Webhook aktualisiert" : "Webhook erstellt",
        description: webhook 
          ? "Der Webhook wurde erfolgreich aktualisiert."
          : "Der Webhook wurde erfolgreich erstellt.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Webhook mutation error:", error);
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log("Form submitted with data:", data);
    mutation.mutate(data);
  };

  const watchNotifyEmail = form.watch("notifyEmail");

  const addEmailField = () => {
    const newEmailAddresses = [...emailAddresses, ''];
    setEmailAddresses(newEmailAddresses);
    form.setValue('notifyEmailAddresses', newEmailAddresses);
  };

  const removeEmailField = (index: number) => {
    const newEmailAddresses = emailAddresses.filter((_, i) => i !== index);
    setEmailAddresses(newEmailAddresses);
    form.setValue('notifyEmailAddresses', newEmailAddresses);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook Name</FormLabel>
              <FormControl>
                <Input placeholder="Mein Typeform Webhook" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="typeformId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typeform Formular</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={formsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie ein Formular" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifyEmail"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">E-Mail-Benachrichtigungen</FormLabel>
                <FormDescription>
                  Erhalten Sie eine E-Mail, wenn neue Antworten eingehen
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      setEmailAddresses([]);
                      form.setValue('notifyEmailAddresses', []);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {watchNotifyEmail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>E-Mail-Adressen für Benachrichtigungen</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                className="h-8"
              >
                <Plus className="h-4 w-4" />
                Weitere E-Mail
              </Button>
            </div>
            {emailAddresses.map((email, index) => (
              <div key={index} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`notifyEmailAddresses.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="notifications@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {emailAddresses.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeEmailField(index)}
                    className="h-10 w-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={mutation.isPending || formsLoading}
          className="w-full bg-[#3B82F6] hover:bg-[#2563EB] h-11"
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {webhook ? "Aktualisieren" : "Erstellen"}
        </Button>
      </form>
    </Form>
  );
}