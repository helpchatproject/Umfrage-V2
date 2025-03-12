import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Webhooks from "@/pages/webhooks";
import WebhookDetails from "@/pages/webhook-details";
import EmailSettings from "@/pages/email-settings";
import Users from "@/pages/users";
import ApplicationSettings from "@/pages/app-settings";
import TypeformSettings from "@/pages/typeform-settings";
import ApiTest from "@/pages/api-test";
import ApiQuestionsTest from "@/pages/api-questions-test";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/webhooks" component={Webhooks} />
      <ProtectedRoute path="/webhooks/:id" component={WebhookDetails} />
      <ProtectedRoute path="/email-settings" component={EmailSettings} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/app-settings" component={ApplicationSettings} />
      <ProtectedRoute path="/typeform-settings" component={TypeformSettings} />
      <ProtectedRoute path="/api-test" component={ApiTest} />
      <ProtectedRoute path="/api-questions-test" component={ApiQuestionsTest} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;