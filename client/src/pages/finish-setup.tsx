import { useLocation } from "wouter";

import { GlobeMascot } from "@/components/globe-mascot";
import { APP_ROUTES } from "@/lib/app-routes";

export default function FinishSetupPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background px-6 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center justify-center">
        <div className="mb-8">
          <GlobeMascot mood="neutral" size={144} />
        </div>
        <div className="w-full rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Quick Start Enabled</h1>
          <p className="mt-2 text-muted-foreground">The finish-setup flow is disabled for now. Continue locally instead.</p>
          <button
            type="button"
            onClick={() => setLocation(APP_ROUTES.quickStart)}
            className="mt-8 w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute"
          >
            Use Quick Start
          </button>
        </div>
      </div>
    </div>
  );
}
