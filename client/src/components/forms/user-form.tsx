import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface UserFormProps {
  user?: User | null;
  onSuccess?: () => void;
}

export default function UserForm({ user, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: user?.username || "",
      password: "",
      isRootAdmin: user?.isRootAdmin || false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { username: string; password: string; isRootAdmin: boolean }) => {
      try {
        const method = user ? "PATCH" : "POST";
        const endpoint = user ? `/api/users/${user.id}` : "/api/users";
        const res = await apiRequest(method, endpoint, data);
        const responseData = await res.json();
        if (!res.ok) {
          throw new Error(responseData.error || responseData.message || "Ein Fehler ist aufgetreten");
        }
        return responseData;
      } catch (error) {
        console.error("Mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: user ? "Benutzer aktualisiert" : "Benutzer erstellt",
        description: user 
          ? "Der Benutzer wurde erfolgreich aktualisiert."
          : "Der Benutzer wurde erfolgreich erstellt.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Form error:", error);
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: { username: string; password: string; isRootAdmin: boolean }) => {
    // Bei einer Aktualisierung ohne Passwortänderung, das Passwortfeld entfernen
    if (user && !data.password) {
      const { password, ...restData } = data;
      mutation.mutate(restData as any);
    } else {
      mutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Benutzername</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{user ? "Neues Passwort (optional)" : "Passwort"}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isRootAdmin"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Administrator</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Kann alle Benutzer verwalten und hat Zugriff auf alle Funktionen
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {user ? "Aktualisieren" : "Erstellen"}
        </Button>
      </form>
    </Form>
  );
}