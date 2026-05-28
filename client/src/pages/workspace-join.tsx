import { useState } from "react";

import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";

export default function JoinWorkspacePage() {
  const { requestJoinWorkspace } = useUser();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState<{ workspaceName: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await requestJoinWorkspace(joinCode);
      setSubmitted({ workspaceName: result.workspace.name });
    } catch (error) {
      toast({
        title: "Could not request access",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl pb-12 pt-4 md:pt-8">
      <h1 className="text-3xl font-display font-bold text-foreground">Join Giving Space</h1>
      <p className="mt-2 text-muted-foreground">Enter a Giving Space join code. For now, the Giving Space must exist on this device.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
        <div>
          <label className="mb-2 block text-sm font-bold text-muted-foreground">Join code</label>
          <input
            required
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="AB12CD"
            maxLength={8}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-4 text-center font-display text-2xl tracking-[0.2em] uppercase outline-none focus:border-primary"
          />
        </div>
        {submitted ? (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            Request sent for <span className="font-bold">{submitted.workspaceName}</span>. Waiting for approval.
          </div>
        ) : null}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-xl bg-primary px-4 py-4 font-bold text-white shadow-bouncy btn-cute disabled:opacity-50"
        >
          {isSaving ? "Sending..." : "Request access"}
        </button>
      </form>
    </div>
  );
}
