import { useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronDown, Copy, KeyRound, LogOut, PencilLine, Save } from "lucide-react";
import { useLocation } from "wouter";

import { APP_ROUTES } from "@/lib/app-routes";
import { compressImage } from "@/lib/image-upload";
import { consumeProfileEditOpenRequest } from "@/lib/navigation-intents";
import { useUser } from "@/lib/user-context";
import { getRoleLabel, getWorkspaceMetaLine } from "@/lib/workspace-ui";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

type ProfileLocationForm = {
  country: string;
  region: string;
  city: string;
  postalCode: string;
};

function emptyLocation(): ProfileLocationForm {
  return {
    country: "",
    region: "",
    city: "",
    postalCode: "",
  };
}

function formatLocation(location?: Partial<ProfileLocationForm> | null) {
  if (!location) return null;
  const parts = [location.city, location.region, location.country].filter(Boolean);
  const suffix = location.postalCode ? ` ${location.postalCode}` : "";
  if (parts.length === 0 && !suffix.trim()) return null;
  return `${parts.join(", ")}${suffix}`;
}

export default function ProfilePage() {
  const {
    activeProfile,
    activeUser,
    activeWorkspaceId,
    setActiveWorkspaceId,
    updateActiveProfileName,
    updateUserDefaultLocation,
    updateUserAvatar,
    changePassword,
    logout,
  } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftLocation, setDraftLocation] = useState<ProfileLocationForm>(emptyLocation());
  const [didCopyUsername, setDidCopyUsername] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeProfile) {
      setDraftName(activeProfile.name);
    }
  }, [activeProfile]);

  useEffect(() => {
    setDraftLocation({
      country: activeUser?.defaultLocation?.country ?? "",
      region: activeUser?.defaultLocation?.region ?? "",
      city: activeUser?.defaultLocation?.city ?? "",
      postalCode: activeUser?.defaultLocation?.postalCode ?? "",
    });
  }, [activeUser?.defaultLocation]);

  useEffect(() => {
    if (!consumeProfileEditOpenRequest()) return;
    setIsEditInfoOpen(true);
  }, []);

  if (!activeProfile) return null;

  const hasMultipleWorkspaces = activeProfile.workspaces.length > 1;
  const activeWorkspaceEntry = activeProfile.workspaces.find(({ workspace }) => workspace.workspaceId === activeWorkspaceId)
    ?? activeProfile.workspaces[0];

  const resetPasswordForm = () => {
    setPasswordError(null);
    setPasswordForm({
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
    });
  };

  const handleSaveName = async () => {
    const nextName = draftName.trim();
    if (!nextName) return;

    await updateActiveProfileName(nextName);
    await updateUserDefaultLocation(draftLocation);
    setIsEditInfoOpen(false);
    toast({
      title: "Profile updated",
      description: "Your local account info was updated on this device.",
    });
  };

  const handleCopyUsername = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(activeProfile.username);
    setDidCopyUsername(true);
    toast({
      title: "Username copied",
      description: `@${activeProfile.username} copied to clipboard.`,
    });
    window.setTimeout(() => setDidCopyUsername(false), 1500);
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSavingPassword) return;

    setIsSavingPassword(true);
    setPasswordError(null);
    try {
      await changePassword(passwordForm);
      resetPasswordForm();
      setShowPasswordForm(false);
      toast({
        title: "Password updated",
        description: "Your new password is saved locally and will be required on next login.",
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      await updateUserAvatar(compressed);
      toast({
        title: "Profile photo updated",
        description: "Your avatar was saved locally on this device.",
      });
    } catch {
      toast({
        title: "Could not update photo",
        description: "Try a smaller image file.",
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    setLocation(APP_ROUTES.login);
  };

  return (
    <div className="mx-auto max-w-3xl py-4 md:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Profile</h1>
      </div>

      <div className="space-y-5">
        <Card className="rounded-[2rem] border border-border p-6 shadow-soft md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border border-border/60">
                  <AvatarImage src={activeProfile.avatarUrl ?? undefined} alt={activeProfile.name} />
                  <AvatarFallback className={activeProfile.accentClassName}>
                    {activeProfile.avatarInitial}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft"
                  aria-label="Upload profile photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">{activeProfile.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">@{activeProfile.username}</p>
                {formatLocation(activeUser?.defaultLocation) ? (
                  <p className="mt-2 text-sm text-muted-foreground">{formatLocation(activeUser?.defaultLocation)}</p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">Stored locally on this device.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditInfoOpen(true)}
                className="h-10 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <PencilLine className="h-4 w-4" />
                Edit info
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleCopyUsername()}
                className="h-10 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                {didCopyUsername ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {didCopyUsername ? "Copied" : "Copy username"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-[2rem] border border-border p-6 shadow-soft md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">Security</h2>
              <p className="mt-1 text-sm text-muted-foreground">Password is hashed locally.</p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setShowPasswordForm((current) => !current);
                if (showPasswordForm) {
                  resetPasswordForm();
                }
              }}
              className="h-10 rounded-xl px-4 font-semibold"
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </Button>
          </div>

          {showPasswordForm ? (
            <form onSubmit={handlePasswordSave} className="mt-5 border-t border-border/70 pt-5">
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-foreground">Current password</label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                    className="h-11 rounded-xl border-border/70 bg-background"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-foreground">New password</label>
                  <Input
                    type="password"
                    value={passwordForm.nextPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, nextPassword: event.target.value })}
                    className="h-11 rounded-xl border-border/70 bg-background"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-foreground">Confirm new password</label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                    className="h-11 rounded-xl border-border/70 bg-background"
                  />
                </div>
                {passwordError ? <p className="text-sm font-medium text-destructive">{passwordError}</p> : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordForm(false);
                      resetPasswordForm();
                    }}
                    className="h-11 rounded-xl px-5 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingPassword}
                    className="h-11 rounded-xl px-5 font-semibold"
                  >
                    {isSavingPassword ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </Card>

        <Card className="rounded-[2rem] border border-border p-6 shadow-soft md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-display font-bold text-foreground">Giving Space</h2>
              {activeWorkspaceEntry ? (
                <div className="mt-2 flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Giving Space: {activeWorkspaceEntry.workspace.name}
                  </p>
                  <Badge variant="secondary">
                    {getRoleLabel(activeWorkspaceEntry.membership.role)}
                  </Badge>
                </div>
              ) : null}
            </div>
            {hasMultipleWorkspaces ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowWorkspaces((current) => !current)}
                className="h-10 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showWorkspaces ? "rotate-180" : ""}`} />
                {showWorkspaces ? "Hide" : "Show"}
              </Button>
            ) : null}
          </div>

          {hasMultipleWorkspaces && showWorkspaces ? (
            <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
              {activeProfile.workspaces.map(({ workspace, membership }) => {
                const isActive = workspace.workspaceId === activeWorkspaceId;
                return (
                  <button
                    key={workspace.workspaceId}
                    type="button"
                    onClick={() => setActiveWorkspaceId(workspace.workspaceId)}
                    className={`flex w-full items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left transition-all ${
                      isActive ? "border-primary/50 bg-primary/5" : "border-border/70 bg-muted/35 hover:border-primary/30"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{workspace.name}</p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {getWorkspaceMetaLine(workspace, membership)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{getRoleLabel(membership.role)}</Badge>
                      {isActive ? <Badge className="bg-primary text-white hover:bg-primary">Active</Badge> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </Card>

        <Card className="rounded-[2rem] border border-border p-6 shadow-soft md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Log out on this device.</p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowLogoutConfirm(true)}
              className="h-11 rounded-xl px-5 font-semibold"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </Card>
      </div>

      <EditProfileLayer
        isMobile={isMobile}
        open={isEditInfoOpen}
        value={draftName}
        location={draftLocation}
        onChange={setDraftName}
        onLocationChange={setDraftLocation}
        onCancel={() => {
          setDraftName(activeProfile.name);
          setDraftLocation({
            country: activeUser?.defaultLocation?.country ?? "",
            region: activeUser?.defaultLocation?.region ?? "",
            city: activeUser?.defaultLocation?.city ?? "",
            postalCode: activeUser?.defaultLocation?.postalCode ?? "",
          });
          setIsEditInfoOpen(false);
        }}
        onSave={() => void handleSaveName()}
      />

      <ConfirmLogoutLayer
        isMobile={isMobile}
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => void handleLogout()}
      />
    </div>
  );
}

function EditProfileLayer({
  isMobile,
  open,
  value,
  location,
  onChange,
  onLocationChange,
  onCancel,
  onSave,
}: {
  isMobile: boolean;
  open: boolean;
  value: string;
  location: ProfileLocationForm;
  onChange: (value: string) => void;
  onLocationChange: (value: ProfileLocationForm) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const content = (
    <>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-foreground">Display name</label>
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter your name"
            className="h-11 rounded-xl border-border/70 bg-background"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Country</label>
            <Input
              value={location.country}
              onChange={(event) => onLocationChange({ ...location, country: event.target.value })}
              className="h-11 rounded-xl border-border/70 bg-background"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">State / Region</label>
            <Input
              value={location.region}
              onChange={(event) => onLocationChange({ ...location, region: event.target.value })}
              className="h-11 rounded-xl border-border/70 bg-background"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">City / Town</label>
            <Input
              value={location.city}
              onChange={(event) => onLocationChange({ ...location, city: event.target.value })}
              className="h-11 rounded-xl border-border/70 bg-background"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Zip / Postal</label>
            <Input
              value={location.postalCode}
              onChange={(event) => onLocationChange({ ...location, postalCode: event.target.value })}
              className="h-11 rounded-xl border-border/70 bg-background"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} className="h-11 rounded-xl px-5 font-semibold">
          Cancel
        </Button>
        <Button type="button" onClick={onSave} className="h-11 rounded-xl px-5 font-semibold">
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
        <DrawerContent className="max-h-[85dvh] rounded-t-[2rem] border-border/70 bg-card px-0 pb-0 shadow-soft">
          <DrawerHeader className="px-5 pb-3 pt-2 text-left">
            <DrawerTitle>Edit info</DrawerTitle>
            <DrawerDescription>Update your display name and personal location on this device.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5 pb-[max(16px,calc(var(--safe-area-bottom)+16px))]">{content}</div>
          <DrawerFooter className="px-5 pb-0" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="rounded-[1.75rem] border-border/70 bg-card p-6 shadow-soft">
        <DialogHeader>
          <DialogTitle>Edit info</DialogTitle>
          <DialogDescription>Update your display name and personal location on this device.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmLogoutLayer({
  isMobile,
  open,
  onCancel,
  onConfirm,
}: {
  isMobile: boolean;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const actions = (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" onClick={onCancel} className="h-11 rounded-xl px-5 font-semibold">
        Cancel
      </Button>
      <Button type="button" variant="destructive" onClick={onConfirm} className="h-11 rounded-xl px-5 font-semibold">
        Log out
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
        <DrawerContent className="rounded-t-[2rem] border-border/70 bg-card px-0 pb-6 shadow-soft">
          <DrawerHeader className="px-5 pb-3 pt-2 text-left">
            <DrawerTitle>Log out?</DrawerTitle>
            <DrawerDescription>You’ll return to the login screen on this device.</DrawerDescription>
          </DrawerHeader>
          <div className="px-5">{actions}</div>
          <DrawerFooter className="px-5 pb-0" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="rounded-[1.75rem] border-border/70 bg-card p-6 shadow-soft">
        <DialogHeader>
          <DialogTitle>Log out?</DialogTitle>
          <DialogDescription>You’ll return to the login screen on this device.</DialogDescription>
        </DialogHeader>
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
