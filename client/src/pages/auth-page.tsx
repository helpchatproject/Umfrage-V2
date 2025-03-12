import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DEFAULT_LOGO } from "@/lib/constants";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex bg-[#FAFBFE]">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
          <CardHeader className="text-center pb-2">
            <div className="mb-8">
              <img
                src={DEFAULT_LOGO}
                alt="Logo"
                className="mx-auto h-10 w-auto object-contain"
                onError={(e) => {
                  console.log("Fehler beim Laden des Logos");
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <CardTitle className="text-[#333A48] text-2xl">Sign In to Medventi</CardTitle>
            <CardDescription className="text-[#8A94A6] mt-2">
              Please sign in to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-[#333A48]">Username</label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border-[#E5E9F2] focus:border-[#3B82F6] h-11"
                  placeholder="Enter your username"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-[#333A48]">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-[#E5E9F2] focus:border-[#3B82F6] h-11"
                  placeholder="Enter your password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] h-11 mt-2" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="hidden lg:flex flex-1 bg-[#151521] items-center justify-center p-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6 text-white">Willkommen bei Medventi</h1>
          <p className="text-lg text-gray-400">
            Verwalten Sie Ihre Webhooks und Antworten effizient mit unserem leistungsstarken System.
            Erstellen Sie Webhooks, überwachen Sie Antworten und bleiben Sie mit automatischen Fallnummern organisiert.
          </p>
        </div>
      </div>
    </div>
  );
}