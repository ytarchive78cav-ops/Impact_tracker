import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { useLocation } from "wouter";

import { APP_ROUTES } from "@/lib/app-routes";
import { useUser } from "@/lib/user-context";
import { useToast } from "@/hooks/use-toast";

const WORKSPACE_TYPES = [
  { value: "personal", label: "Personal" },
  { value: "relationship", label: "Relationship" },
  { value: "family", label: "Family" },
  { value: "group", label: "Group" },
  { value: "church", label: "Church" },
  { value: "organization", label: "Organization" },
] as const;

export default function CreateWorkspacePage() {
  const { activeUser, createWorkspace } = useUser();
  const [, setRoute] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof WORKSPACE_TYPES)[number]["value"]>("relationship");
  const [locationForm, setLocationForm] = useState({
    country: activeUser?.defaultLocation?.country ?? "",
    region: activeUser?.defaultLocation?.region ?? "",
    city: activeUser?.defaultLocation?.city ?? "",
    postalCode: activeUser?.defaultLocation?.postalCode ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [created, setCreated] = useState<Awaited<ReturnType<typeof createWorkspace>> | null>(null);

  useEffect(() => {
    setLocationForm({
      country: activeUser?.defaultLocation?.country ?? "",
      region: activeUser?.defaultLocation?.region ?? "",
      city: activeUser?.defaultLocation?.city ?? "",
      postalCode: activeUser?.defaultLocation?.postalCode ?? "",
    });
  }, [activeUser?.defaultLocation]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const workspace = await createWorkspace({ name, type, location: locationForm });
      setCreated(workspace);
    } catch (error) {
      toast({
        title: "Could not create Giving Space",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyCode = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.joinCode);
    toast({ title: "Join code copied", description: `${created.joinCode} is ready to share.` });
  };

  const shareCode = async () => {
    if (!created) return;
    if (!navigator.share) {
      await copyCode();
      return;
    }
    await navigator.share({
      title: `${created.name} join code`,
      text: `Join ${created.name} in Impact with code ${created.joinCode}.`,
    });
  };

  return (
    <div className="mx-auto max-w-2xl pb-12 pt-4 md:pt-8">
      <h1 className="text-3xl font-display font-bold text-foreground">Create Giving Space</h1>
      <p className="mt-2 text-muted-foreground">Set up a new space for a person, pair, family, church, or group.</p>

      {created ? (
        <div className="mt-8 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
          <h2 className="text-2xl font-display font-bold text-foreground">{created.name}</h2>
          <p className="mt-2 text-muted-foreground">
            Your Giving Space is ready. Others can request access on this device using the join code below.
          </p>
          <div className="mt-6 rounded-[1.5rem] border border-border bg-muted/40 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Join Code</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-[0.2em] text-foreground">{created.joinCode}</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={copyCode}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3 font-bold text-foreground shadow-soft btn-cute"
            >
              <Copy className="mr-2 inline h-4 w-4" />
              Copy code
            </button>
            <button
              type="button"
              onClick={shareCode}
              className="flex-1 rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute"
            >
              <Share2 className="mr-2 inline h-4 w-4" />
              Share
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRoute(APP_ROUTES.home)}
            className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 font-bold text-background shadow-soft btn-cute"
          >
            Open Giving Space
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
          <div>
            <label className="mb-2 block text-sm font-bold text-muted-foreground">Giving Space name</label>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter giving space name"
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-medium outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-muted-foreground">Giving Space type</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-medium outline-none focus:border-primary"
            >
              {WORKSPACE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-muted-foreground">Location</label>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={locationForm.country}
                onChange={(event) => setLocationForm({ ...locationForm, country: event.target.value })}
                placeholder="Country"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-medium outline-none focus:border-primary"
              />
              <input
                value={locationForm.region}
                onChange={(event) => setLocationForm({ ...locationForm, region: event.target.value })}
                placeholder="State / Region"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-medium outline-none focus:border-primary"
              />
              <input
                value={locationForm.city}
                onChange={(event) => setLocationForm({ ...locationForm, city: event.target.value })}
                placeholder="City / Town"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-medium outline-none focus:border-primary"
              />
              <input
                value={locationForm.postalCode}
                onChange={(event) => setLocationForm({ ...locationForm, postalCode: event.target.value })}
                placeholder="Zip / Postal"
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-medium outline-none focus:border-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-primary px-4 py-4 font-bold text-white shadow-bouncy btn-cute disabled:opacity-50"
          >
            {isSaving ? "Creating..." : "Create Giving Space"}
          </button>
        </form>
      )}
    </div>
  );
}
