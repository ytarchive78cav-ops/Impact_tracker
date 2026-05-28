import { useState } from "react";
import { useLocation } from "wouter";

import { APP_ROUTES } from "@/lib/app-routes";
import { useUser } from "@/lib/user-context";
import { GlobeMascot } from "@/components/globe-mascot";

type Mode = "root" | "collaborative";

export default function OnboardingPage() {
  const { createWorkspace } = useUser();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("root");
  const [partnershipName, setPartnershipName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitWorkspace = async (name: string, type: "personal" | "relationship" | "group") => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createWorkspace({ name, type });
      setLocation(APP_ROUTES.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Giving Space");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <GlobeMascot mood="happy" size={156} />
        </div>
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
          <h1 className="text-3xl font-display font-bold text-foreground">What are you here for?</h1>
          <p className="mt-2 text-muted-foreground">Set up the Giving Space that matches how you want to give and volunteer.</p>

          {mode === "root" ? (
            <div className="mt-8 grid gap-4">
              <button
                type="button"
                onClick={() => submitWorkspace("Personal", "personal")}
                disabled={isSubmitting}
                className="rounded-[1.5rem] border border-border bg-muted/40 px-5 py-5 text-left transition-all hover:border-primary/40 hover:bg-muted"
              >
                <p className="text-lg font-display font-bold text-foreground">Personal impact (solo)</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your personal Giving Space and start revealing causes right away.</p>
              </button>
              <button
                type="button"
                onClick={() => setMode("collaborative")}
                disabled={isSubmitting}
                className="rounded-[1.5rem] border border-border bg-muted/40 px-5 py-5 text-left transition-all hover:border-primary/40 hover:bg-muted"
              >
                <p className="text-lg font-display font-bold text-foreground">Impact with others</p>
                <p className="mt-1 text-sm text-muted-foreground">Set up a shared ritual for a partnership, family, or larger group.</p>
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="rounded-[1.5rem] border border-border bg-muted/35 p-5">
                <p className="text-lg font-display font-bold text-foreground">Create a partnership</p>
                <p className="mt-1 text-sm text-muted-foreground">A focused shared Giving Space for two people.</p>
                <input
                  value={partnershipName}
                  onChange={(event) => setPartnershipName(event.target.value)}
                  placeholder="David + Arlayna"
                  className="mt-4 w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => submitWorkspace(partnershipName.trim(), "relationship")}
                  disabled={isSubmitting || !partnershipName.trim()}
                  className="mt-4 rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute disabled:opacity-50"
                >
                  Create partnership
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-border bg-muted/35 p-5">
                <p className="text-lg font-display font-bold text-foreground">Create a group or organization</p>
                <p className="mt-1 text-sm text-muted-foreground">Choose a name for your shared Giving Space.</p>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Cavallino Impact Fund"
                  className="mt-4 w-full rounded-xl border-2 border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => submitWorkspace(groupName.trim(), "group")}
                  disabled={isSubmitting || !groupName.trim()}
                  className="mt-4 rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute disabled:opacity-50"
                >
                  Create group
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMode("root")}
                className="text-sm font-semibold text-muted-foreground"
              >
                Back
              </button>
            </div>
          )}

          {error ? <p className="mt-5 text-sm font-medium text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
