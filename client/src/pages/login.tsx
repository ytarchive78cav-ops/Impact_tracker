import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

import { GlobeMascot } from "@/components/globe-mascot";
import { APP_ROUTES } from "@/lib/app-routes";
import { useUser } from "@/lib/user-context";

export default function LoginPage() {
  const { login, loginWithDevPreset } = useUser();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const username = new URLSearchParams(window.location.search).get("username");
    if (!username) return;
    setForm((current) => ({ ...current, username }));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await login(form);
      setLocation(APP_ROUTES.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevLogin = async (preset: "david" | "arlayna") => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await loginWithDevPreset(preset);
      setLocation(APP_ROUTES.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the dev account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
        <div className="mb-8">
          <GlobeMascot mood="happy" size={144} />
        </div>
        <div className="w-full rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Log in</h1>
          <p className="mt-2 text-muted-foreground">Pick up your impact ritual with a local account.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-muted-foreground">Username</label>
              <input
                required
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
                placeholder="your-name"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-muted-foreground">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
              />
            </div>
            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute disabled:opacity-50"
            >
              {isSubmitting ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Dev shortcuts</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleDevLogin("david")}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              Dev: David
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleDevLogin("arlayna")}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              Dev: Arlayna
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href={APP_ROUTES.signup} className="font-bold text-primary">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
