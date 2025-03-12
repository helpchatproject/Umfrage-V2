import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWebhookSchema } from "@shared/schema";
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
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface TypeformForm {
  id: string;
  title: string;
  lastUpdated: string;
}

export function WebhookForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [emailEnabled, setEmailEnabled] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertWebhookSchema),
    defaultValues: {
      name: "",
      typeformId: "",
      notifyEmail: false,
      notifyEmailAddresses: [],
    },
  });

  const { data: forms, isLoading: formsLoading } = useQuery<TypeformForm[]>({
    queryKey: ["/api/typeform-settings/forms"],
  });

  if (formsLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Lade Formulare...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie ein Formular" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {forms?.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <FormLabel className="text-base">
                  E-Mail-Benachrichtigungen
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                  Erhalten Sie eine E-Mail, wenn neue Antworten eingehen
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    setEmailEnabled(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {emailEnabled && (
          <FormField
            control={form.control}
            name="notifyEmailAddresses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-Mail-Adressen</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="email1@example.com, email2@example.com"
                    onChange={(e) =>
                      field.onChange(
                        e.target.value.split(",").map((email) => email.trim())
                      )
                    }
                    value={field.value?.join(", ") || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full">
          Erstellen
        </Button>
      </form>
    </Form>
  );
}
