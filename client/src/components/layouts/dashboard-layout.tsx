import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Webhook,
  Settings,
  Mail,
  LogOut,
  ChevronDown,
  Bell,
  User,
  Users,
  Laptop,
  TestTube
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@shared/schema";
import { useState, useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/app-settings"],
  });

  // Aktualisierte Standardwerte
  const defaultSettings = {
    companyName: "Medventi GmbH",
    logoUrl: "/Medventi_logo_colour.png"
  };

  const currentSettings = settings || defaultSettings;

  // Logik für WebSocket-Verbindung
  useEffect(() => {
    console.log("Setting up WebSocket connection in Dashboard...");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log("Dashboard WebSocket connection established");
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'newResponse') {
        setNotificationCount(prev => prev + 1);
        console.log("New notification received:", data);
      }
    };

    setSocket(newSocket);

    return () => {
      console.log("Closing WebSocket connection in Dashboard");
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, []);

  // Helper-Funktion für Logo-URL-Verarbeitung
  const getLogoUrl = (url: string | undefined) => {
    // Standard-Logo als Fallback
    const defaultLogo = "/Medventi_logo_colour.png";

    if (!url) {
      console.log("Keine Logo-URL vorhanden, verwende Standard-Logo");
      return defaultLogo;
    }

    console.log("Ursprüngliches Logo aus settings:", url);

    // Wenn die URL bereits mit /uploads/ oder / beginnt
    if (url.startsWith('/uploads/') || url === defaultLogo) {
      console.log("Korrigiertes Logo für Display:", url);
      return url;
    }

    // Füge /uploads/ hinzu für relative Pfade
    const correctedUrl = `/uploads/${url.startsWith('/') ? url.slice(1) : url}`;
    console.log("Korrigiertes Logo für Display:", correctedUrl);
    return correctedUrl;
  };

  return (
    <div className="flex h-screen bg-[#F7F8FC]">
      {/* Sidebar */}
      <aside className="w-[280px] bg-white border-r border-[#E2E8F0]">
        <div className="h-full px-6 py-5.5">
          <div className="flex items-center gap-3 px-2 mb-8">
            <img
              src={getLogoUrl(currentSettings.logoUrl)}
              alt="Logo"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                console.error("Fehler beim Laden des Logos:", target.src);

                // Versuche das Logo im uploads-Verzeichnis
                if (!target.src.includes('/uploads/') && target.src !== "/Medventi_logo_colour.png") {
                  console.log("Versuche Logo im uploads-Verzeichnis:", `/uploads/${target.src.split('/').pop()}`);
                  target.src = `/uploads/${target.src.split('/').pop()}`;
                } else {
                  // Fallback zum Standard-Logo
                  target.src = "/Medventi_logo_colour.png";
                }
              }}
            />
            <span className="text-xl font-semibold text-[#1E293B]">
              {currentSettings.companyName || "Medventi GmbH"}
            </span>
          </div>

          <nav className="space-y-6">
            <div className="space-y-2">
              <h2 className="px-2 text-xs font-semibold tracking-wide text-[#64748B] uppercase">
                Navigation
              </h2>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                    location === "/" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                  )}
                  asChild
                >
                  <Link href="/">
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                    location === "/webhooks" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                  )}
                  asChild
                >
                  <Link href="/webhooks">
                    <Webhook className="h-5 w-5" />
                    Webhooks
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                    location === "/api-test" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                  )}
                  asChild
                >
                  <Link href="/api-test">
                    <TestTube className="h-5 w-5" />
                    API Test
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                    location === "/api-questions-test" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                  )}
                  asChild
                >
                  <Link href="/api-questions-test">
                    <TestTube className="h-5 w-5" />
                    API Fragen Test
                  </Link>
                </Button>
              </div>
            </div>

            {user?.isRootAdmin && (
              <div className="space-y-2">
                <h2 className="px-2 text-xs font-semibold tracking-wide text-[#64748B] uppercase">
                  Einstellungen
                </h2>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                      location === "/users" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                    )}
                    asChild
                  >
                    <Link href="/users">
                      <Users className="h-5 w-5" />
                      Benutzerverwaltung
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                      location === "/email-settings" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                    )}
                    asChild
                  >
                    <Link href="/email-settings">
                      <Mail className="h-5 w-5" />
                      E-Mail Einstellungen
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                      location === "/typeform-settings" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                    )}
                    asChild
                  >
                    <Link href="/typeform-settings">
                      <Laptop className="h-5 w-5" />
                      Typeform API
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 px-2 h-11 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
                      location === "/app-settings" && "bg-[#3B82F6] text-white hover:bg-[#3B82F6] hover:text-white"
                    )}
                    asChild
                  >
                    <Link href="/app-settings">
                      <Settings className="h-5 w-5" />
                      Anwendungseinstellungen
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[72px] bg-white border-b border-[#E2E8F0] px-8">
          <div className="h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-[#1E293B]">
                {location === "/" && "Dashboard"}
                {location === "/webhooks" && "Webhooks"}
                {location === "/email-settings" && "E-Mail Einstellungen"}
                {location === "/users" && "Benutzerverwaltung"}
                {location === "/app-settings" && "Anwendungseinstellungen"}
                {location === "/typeform-settings" && "Typeform API"}
                {location === "/api-test" && "API Test"}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Button variant="ghost" size="icon" className="text-[#64748B] hover:text-[#1E293B]">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {notificationCount}
                    </span>
                  )}
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-[#64748B] hover:text-[#1E293B]">
                    <User className="h-5 w-5" />
                    <span>{user?.username}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-red-600" onClick={() => logoutMutation.mutate()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}