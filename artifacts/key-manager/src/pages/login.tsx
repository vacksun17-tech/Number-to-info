import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin();
      } else {
        toast({ title: "Login failed", description: data.error ?? "Invalid credentials", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="border border-zinc-800 rounded-lg p-8 bg-zinc-900 shadow-2xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400 font-mono text-sm">{">"}</span>
              <h1 className="text-white font-semibold tracking-wide text-lg">Admin Panel</h1>
            </div>
            <p className="text-zinc-500 text-sm font-mono">API Key Manager — Restricted Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-widest">
                Username
              </label>
              <input
                id="username"
                data-testid="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="enter username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-widest">
                Password
              </label>
              <input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="enter password"
              />
            </div>

            <button
              type="submit"
              data-testid="button-login"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-sm py-2.5 rounded transition-colors"
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-zinc-600 font-mono text-xs">
            Unauthorized access is prohibited
          </p>
        </div>
      </div>
    </div>
  );
}
