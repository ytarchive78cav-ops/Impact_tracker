import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

import { GlobeMascot } from "@/components/globe-mascot";
import { APP_ROUTES } from "@/lib/app-routes";
import { normalizeUsername, validateUsername } from "@/lib/local-storage";
import { useUser } from "@/lib/user-context";

export default function SignupPage() {
  const { signup } = useUser();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedUsername = useMemo(() => normalizeUsername(form.username), [form.username]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const usernameError = validateUsername(normalizedUsername);
    if (!form.displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (usernameError) {
      setError(usernameError);
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await signup({
        displayName: form.displayName,
        username: normalizedUsername,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setLocation(APP_ROUTES.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
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
          <h1 className="text-3xl font-display font-bold text-foreground">Create account</h1>
          <p className="mt-2 text-muted-foreground">Start with a local account that persists on this device.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-muted-foreground">Display name</label>
              <input
                required
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
                placeholder="David"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-muted-foreground">Username</label>
              <input
                required
                value={form.username}
                onChange={(event) => setForm({ ...form, username: normalizeUsername(event.target.value) })}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
                placeholder="david"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Saved as <span className="font-bold text-foreground">@{normalizedUsername || "username"}</span>
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-muted-foreground">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-muted-foreground">Confirm password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
              />
            </div>
            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute disabled:opacity-50"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={APP_ROUTES.login} className="font-bold text-primary">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
