import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dashboard } from "@/pages/dashboard";
import { Login } from "@/pages/login";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

function AuthGate() {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthState(d.authenticated ? "authenticated" : "unauthenticated"))
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 font-mono text-sm animate-pulse">Authenticating...</span>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <Login onLogin={() => setAuthState("authenticated")} />;
  }

  return (
    <Switch>
      <Route path="/" component={() => <Dashboard onLogout={() => setAuthState("unauthenticated")} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
