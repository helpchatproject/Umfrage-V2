# Login System Template

## Installation
Benötigte Node.js Pakete:
```bash
npm install express express-session passport passport-local memorystore body-parser
npm install @tanstack/react-query react-hook-form @hookform/resolvers/zod wouter
npm install @radix-ui/react-toast lucide-react clsx tailwind-merge
```

## Projektstruktur

```
├── client/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── use-auth.tsx    # Auth Hook für React Query
│   │   ├── pages/
│   │   │   └── auth-page.tsx   # Login Seite
│   │   └── App.tsx             # Haupt App Komponente
└── server/
    ├── auth.ts                 # Passport Konfiguration
    ├── storage.ts              # Session Storage
    └── index.ts               # Express Server
```

## Wichtige Dateien

### 1. Server-Side (Express + Passport)

#### `server/auth.ts` - Authentifizierung Setup
```typescript
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bodyParser from 'body-parser';

export function setupAuth(app: Express) {
  app.use(bodyParser.json());

  // Session setup
  const sessionMiddleware = session({
    secret: "test-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Simple Strategy
  passport.use(new LocalStrategy(
    function(username, password, done) {
      if (username === "admin" && password === "admin") {
        const user = { id: 1, username: "admin", isRootAdmin: true };
        return done(null, user);
      }
      return done(null, false);
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: number, done) => {
    if (id === 1) {
      done(null, { id: 1, username: "admin", isRootAdmin: true });
    } else {
      done(null, false);
    }
  });

  // Login Route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          message: "Login fehlgeschlagen" 
        });
      }

      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  // Logout Route
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  // User Info Route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}
```

#### `server/storage.ts` - Session Storage
```typescript
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }
}

export const storage = new MemStorage();
```

### 2. Client-Side (React)

#### `client/src/hooks/use-auth.tsx` - Auth Hook
```typescript
import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginData = {
  username: string;
  password: string;
};

type User = {
  id: number;
  username: string;
  isRootAdmin: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error("Login fehlgeschlagen");
      }

      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login erfolgreich",
        description: `Willkommen, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/logout", { 
        method: "POST",
        credentials: "include"
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

#### `client/src/pages/auth-page.tsx` - Login Page
```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";

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
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Bitte melden Sie sich an
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username">Username</label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## Verwendung

1. Erstellen Sie ein neues React + Express Projekt
2. Installieren Sie die benötigten Pakete
3. Kopieren Sie die Dateien in die entsprechenden Verzeichnisse
4. Testen Sie den Login mit:
   - Username: admin
   - Password: admin

Die Login-Funktionalität ist bewusst einfach gehalten und verwendet einen fest codierten Admin-User. Für ein Produktivsystem sollten Sie:

1. Eine richtige Datenbank für Benutzer einrichten
2. Passwörter hashen
3. Sichere Session-Secrets verwenden
4. HTTPS aktivieren
