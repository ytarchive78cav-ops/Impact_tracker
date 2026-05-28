import { useLocation } from "wouter";
import { Plus, UserPlus } from "lucide-react";

import { APP_ROUTES } from "@/lib/app-routes";
import { useUser } from "@/lib/user-context";
import { getRoleLabel, getWorkspaceMetaLine } from "@/lib/workspace-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WorkspacesPage() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useUser();
  const [, setLocation] = useLocation();

  return (
    <div className="mx-auto max-w-3xl pb-12 pt-4 md:pt-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
        <h1 className="mb-2 text-3xl font-display font-bold text-foreground">Giving Spaces</h1>
          <p className="text-muted-foreground">Switch between Giving Spaces, create a new one, or request access with a join code.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setLocation(APP_ROUTES.createWorkspace)}
            className="rounded-xl border border-border bg-card px-4 py-3 font-bold text-foreground shadow-soft btn-cute"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Create
          </button>
          <button
            type="button"
            onClick={() => setLocation(APP_ROUTES.joinWorkspace)}
            className="rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute"
          >
            <UserPlus className="mr-2 inline h-4 w-4" />
            Join
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {workspaces.map(({ workspace, membership }) => {
          const isActive = workspace.workspaceId === activeWorkspaceId;
          const isApproved = membership.status === "approved";
          return (
            <Card
              key={workspace.workspaceId}
              className={`rounded-[2rem] border p-5 shadow-soft transition-all ${isActive ? "border-primary/50 bg-primary/5" : "border-border"}`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">{workspace.name}</h2>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {getWorkspaceMetaLine(workspace, membership)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="capitalize">{workspace.type}</Badge>
                    <Badge variant="secondary">{getRoleLabel(membership.role)}</Badge>
                    {membership.status === "pending" ? <Badge className="bg-amber-100 text-amber-900">Pending approval</Badge> : null}
                    {membership.status === "rejected" ? <Badge className="bg-rose-100 text-rose-900">Rejected</Badge> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspaceId(workspace.workspaceId);
                    setLocation(APP_ROUTES.home);
                  }}
                  disabled={isActive || !isApproved}
                  className="rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-bouncy btn-cute disabled:cursor-default disabled:opacity-50"
                >
                  {!isApproved ? "Waiting for approval" : isActive ? "Active Giving Space" : "Switch here"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
