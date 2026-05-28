import { useEffect, useRef, useState } from "react";
import { Camera, Copy } from "lucide-react";
import { useLocation } from "wouter";

import { compressImage } from "@/lib/image-upload";
import { APP_ROUTES } from "@/lib/app-routes";
import { storage, type MembershipRole } from "@/lib/local-storage";
import { consumeWorkspaceAdminReturnPath, requestAccountMenuOpen, requestProfileEditOpen } from "@/lib/navigation-intents";
import { useUser } from "@/lib/user-context";
import { getRoleLabel } from "@/lib/workspace-ui";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LocationForm = {
  country: string;
  region: string;
  city: string;
  postalCode: string;
};

function emptyLocation(): LocationForm {
  return {
    country: "",
    region: "",
    city: "",
    postalCode: "",
  };
}

function formatLocation(location?: Partial<LocationForm> | null) {
  if (!location) return "Not set";
  const parts = [location.city, location.region, location.country].filter(Boolean);
  const suffix = location.postalCode ? ` ${location.postalCode}` : "";
  return parts.length > 0 || suffix.trim() ? `${parts.join(", ")}${suffix}`.trim() : "Not set";
}

function getRoleOptionsForEditor(
  actingRole: MembershipRole,
  targetRole: MembershipRole,
): MembershipRole[] {
  if (actingRole === "owner") {
    return targetRole === "owner" ? [] : ["viewer", "admin", "co-owner"];
  }
  if (actingRole === "co-owner") {
    return targetRole === "owner" || targetRole === "co-owner" ? [] : ["viewer", "admin"];
  }
  return [];
}

export default function WorkspaceAdminPage() {
  const {
    activeUser,
    activeMembership,
    activeWorkspace,
    approveMembership,
    canManageWorkspace,
    deleteWorkspace,
    leaveWorkspace,
    rejectMembership,
    removeMemberFromWorkspace,
    transferWorkspaceOwnership,
    updateMembershipRole,
    updateWorkspaceAvatar,
    updateWorkspaceLocation,
  } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocation());
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string } | null>(null);
  const [transferDowngradeRole, setTransferDowngradeRole] = useState<Exclude<MembershipRole, "owner">>("co-owner");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocationForm({
      country: activeWorkspace?.location?.country ?? "",
      region: activeWorkspace?.location?.region ?? "",
      city: activeWorkspace?.location?.city ?? "",
      postalCode: activeWorkspace?.location?.postalCode ?? "",
    });
  }, [activeWorkspace?.location]);

  useEffect(() => {
    if (!activeWorkspace || !activeUser) return;
    if (activeWorkspace.type !== "personal" || activeWorkspace.createdByUserId !== activeUser.uid) return;

    requestProfileEditOpen();
    setLocation(APP_ROUTES.profile);
  }, [activeUser, activeWorkspace, setLocation]);

  if (!activeWorkspace || !activeMembership) {
    return null;
  }

  if (activeWorkspace.type === "personal" && activeWorkspace.createdByUserId === activeUser?.uid) {
    return null;
  }

  if (!canManageWorkspace) {
    return (
      <div className="mx-auto max-w-2xl pb-12 pt-8">
        <div className="rounded-[2rem] border border-border bg-card p-8 text-center shadow-soft">
          <h1 className="text-2xl font-display font-bold text-foreground">No access</h1>
          <p className="mt-3 text-muted-foreground">Only Giving Space owners, co-owners, and admins can manage this space.</p>
        </div>
      </div>
    );
  }

  const members = storage.getWorkspaceMembers(activeWorkspace.workspaceId);
  const approvedMembers = members
    .filter((entry) => entry.membership.status === "approved")
    .sort((a, b) => {
      const rank: Record<MembershipRole, number> = {
        owner: 0,
        "co-owner": 1,
        admin: 2,
        viewer: 3,
      };
      return rank[a.membership.role] - rank[b.membership.role] || a.user.displayName.localeCompare(b.user.displayName);
    });
  const pendingMembers = members.filter((entry) => entry.membership.status === "pending");
  const isPersonalGivingSpace = activeWorkspace.type === "personal" && activeWorkspace.createdByUserId === activeUser?.uid;
  const canManageMembers = activeMembership.role === "owner" || activeMembership.role === "co-owner";
  const canTransferOwnership = activeMembership.role === "owner";

  const copyJoinCode = async () => {
    await navigator.clipboard.writeText(activeWorkspace.joinCode);
    toast({ title: "Join code copied", description: activeWorkspace.joinCode });
  };

  const saveLocation = async () => {
    setIsSavingLocation(true);
    try {
      await updateWorkspaceLocation(activeWorkspace.workspaceId, locationForm);
      toast({ title: "Location updated", description: "This Giving Space now drives local discovery." });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleWorkspaceAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleWorkspaceAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      await updateWorkspaceAvatar(activeWorkspace.workspaceId, compressed);
      toast({
        title: "Giving Space photo updated",
        description: "The header now uses this space image while it is active.",
      });
    } catch {
      toast({
        title: "Could not update Giving Space photo",
        description: "Try a smaller image file.",
      });
    }
  };

  const handleRoleChange = async (membershipId: string, role: MembershipRole) => {
    await updateMembershipRole(activeWorkspace.workspaceId, membershipId, role);
    toast({ title: "Role updated", description: "Member permissions were updated." });
  };

  const handleRemoveMember = async (membershipId: string) => {
    await removeMemberFromWorkspace(activeWorkspace.workspaceId, membershipId);
    toast({ title: "Member removed", description: "They no longer have access to this Giving Space." });
  };

  const handleTransferOwnership = async () => {
    if (!transferTarget) return;
    await transferWorkspaceOwnership(activeWorkspace.workspaceId, transferTarget.id, transferDowngradeRole);
    toast({
      title: "Ownership transferred",
      description: `${transferTarget.name} is now the owner of this Giving Space.`,
    });
    setTransferTarget(null);
  };

  const handleDeleteWorkspace = async () => {
    const returnPath = consumeWorkspaceAdminReturnPath() ?? APP_ROUTES.home;
    await deleteWorkspace(activeWorkspace.workspaceId);
    setIsDeleteOpen(false);
    requestAccountMenuOpen();
    setLocation(returnPath);
  };

  return (
    <div className="mx-auto max-w-4xl pb-12 pt-4 md:pt-8">
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border border-border/60">
                <AvatarImage src={activeWorkspace.avatarUrl ?? undefined} alt={activeWorkspace.name} />
                <AvatarFallback className="bg-primary/14 font-display text-lg font-bold text-primary">
                  {activeWorkspace.name.trim().charAt(0).toUpperCase() || "G"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleWorkspaceAvatarPick}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft"
                aria-label="Upload Giving Space photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleWorkspaceAvatarChange}
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Manage Giving Space</p>
              <h1 className="mt-2 text-3xl font-display font-bold text-foreground">{activeWorkspace.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">{activeWorkspace.type}</Badge>
                <Badge variant="secondary">{getRoleLabel(activeMembership.role)}</Badge>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={copyJoinCode}
            className="h-12 rounded-xl px-4 font-semibold"
          >
            <Copy className="h-4 w-4" />
            {activeWorkspace.joinCode}
          </Button>
        </div>
      </div>

      <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Location</h2>
            <p className="mt-1 text-sm text-muted-foreground">Current location: {formatLocation(activeWorkspace.location)}</p>
          </div>
          {!activeWorkspace.location ? <Badge variant="secondary">Not set</Badge> : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <input
            value={locationForm.country}
            onChange={(event) => setLocationForm({ ...locationForm, country: event.target.value })}
            placeholder="Country"
            className="rounded-xl border border-border bg-background px-4 py-3 outline-none"
          />
          <input
            value={locationForm.region}
            onChange={(event) => setLocationForm({ ...locationForm, region: event.target.value })}
            placeholder="State / Region"
            className="rounded-xl border border-border bg-background px-4 py-3 outline-none"
          />
          <input
            value={locationForm.city}
            onChange={(event) => setLocationForm({ ...locationForm, city: event.target.value })}
            placeholder="City / Town"
            className="rounded-xl border border-border bg-background px-4 py-3 outline-none"
          />
          <input
            value={locationForm.postalCode}
            onChange={(event) => setLocationForm({ ...locationForm, postalCode: event.target.value })}
            placeholder="Zip / Postal"
            className="rounded-xl border border-border bg-background px-4 py-3 outline-none"
          />
        </div>

        <Button
          type="button"
          onClick={saveLocation}
          disabled={isSavingLocation}
          className="mt-4 rounded-xl px-4 py-3 font-semibold"
        >
          {isSavingLocation ? "Saving..." : "Save Giving Space Location"}
        </Button>
      </section>

      {canManageMembers ? (
        <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
          <h2 className="text-xl font-display font-bold text-foreground">Pending Requests</h2>
          <div className="mt-4 space-y-3">
            {pendingMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests right now.</p>
            ) : pendingMembers.map(({ membership, user }) => (
              <div key={membership.id} className="flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-muted/35 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => approveMembership(activeWorkspace.workspaceId, membership.id, "viewer")}
                    className="rounded-xl px-4"
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => rejectMembership(activeWorkspace.workspaceId, membership.id)}
                    className="rounded-xl px-4"
                  >
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Members</h2>
            <p className="mt-1 text-sm text-muted-foreground">Owners and co-owners can manage roles. Ownership transfer is protected.</p>
          </div>
          {!canManageMembers ? <Badge variant="secondary">Read only</Badge> : null}
        </div>
        <div className="mt-4 space-y-3">
          {approvedMembers.map(({ membership, user }) => {
            const roleOptions = getRoleOptionsForEditor(activeMembership.role, membership.role);
            const canEditRole = roleOptions.length > 0;
            const canRemove = activeMembership.role === "owner"
              ? membership.role !== "owner"
              : membership.role === "admin" || membership.role === "viewer";

            return (
              <div key={membership.id} className="flex flex-col gap-4 rounded-[1.35rem] border border-border/70 bg-card p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{getRoleLabel(membership.role)}</Badge>
                    {membership.userId === activeUser?.uid ? <Badge className="bg-primary text-white">You</Badge> : null}
                  </div>
                  {canManageMembers ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {canEditRole ? (
                        <select
                          value={membership.role}
                          onChange={(event) => void handleRoleChange(membership.id, event.target.value as MembershipRole)}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold outline-none"
                        >
                          {roleOptions.map((option) => (
                            <option key={option} value={option}>{getRoleLabel(option)}</option>
                          ))}
                        </select>
                      ) : null}
                      {canTransferOwnership && membership.role !== "owner" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setTransferTarget({ id: membership.id, name: user.displayName });
                            setTransferDowngradeRole("co-owner");
                          }}
                          className="rounded-xl px-3"
                        >
                          Make owner
                        </Button>
                      ) : null}
                      {canRemove ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleRemoveMember(membership.id)}
                          className="rounded-xl border-rose-200 bg-rose-50 px-3 text-rose-900 hover:bg-rose-100"
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {activeMembership.role !== "owner" ? (
          <button
            type="button"
            onClick={() => void leaveWorkspace(activeWorkspace.workspaceId)}
            className="rounded-[1.5rem] border border-border bg-card px-5 py-4 text-left shadow-soft"
          >
            <p className="font-bold text-foreground">Leave Giving Space</p>
            <p className="mt-1 text-sm text-muted-foreground">You’ll lose access until you’re invited again.</p>
          </button>
        ) : isPersonalGivingSpace ? (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-left shadow-soft">
            <p className="font-bold text-amber-950">Personal Giving Space</p>
            <p className="mt-1 text-sm text-amber-900">This is your default Giving Space. To remove it, you must delete your account.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-left shadow-soft"
          >
            <p className="font-bold text-rose-900">Delete Giving Space</p>
            <p className="mt-1 text-sm text-rose-800">This action removes the entire Giving Space from this device.</p>
          </button>
        )}
      </section>

      <AlertDialog open={Boolean(transferTarget)} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent className="rounded-[1.5rem] border-border/70 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              {transferTarget ? `${transferTarget.name} will become the new owner of this Giving Space.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">After transfer, your role</label>
            <select
              value={transferDowngradeRole}
              onChange={(event) => setTransferDowngradeRole(event.target.value as Exclude<MembershipRole, "owner">)}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold outline-none"
            >
              <option value="co-owner">Co-owner</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleTransferOwnership()}>
              Confirm transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-[1.5rem] border-border/70 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Giving Space?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes its causes, settings, and monthly history from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteWorkspace()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
