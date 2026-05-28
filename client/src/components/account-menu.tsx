import * as React from "react";
import { Check, ChevronDown, LogOut, Plus, Settings2, UserPlus, UserRound } from "lucide-react";
import { useLocation } from "wouter";

import { APP_ROUTES } from "@/lib/app-routes";
import { requestProfileEditOpen, setWorkspaceAdminReturnPath, consumeAccountMenuOpenRequest } from "@/lib/navigation-intents";
import { useUser } from "@/lib/user-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getRoleLabel, getWorkspaceTypeLabel } from "@/lib/workspace-ui";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AccountMenuProps {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

export function AccountMenu({
  children,
  align = "end",
  className,
}: AccountMenuProps) {
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!consumeAccountMenuOpenRequest()) return;
    setOpen(true);
  }, [location]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn("w-full", className)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open account menu"
        >
          {children}
        </button>
        <AccountMenuDrawer open={open} onOpenChange={setOpen} />
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn("w-full outline-none", className)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Open account menu"
        >
          {children}
        </button>
      </DropdownMenuTrigger>
      <AccountMenuDropdown align={align} onOpenChange={setOpen} />
    </DropdownMenu>
  );
}

function AccountMenuDropdown({
  align,
  onOpenChange,
}: {
  align: "start" | "center" | "end";
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DropdownMenuContent
      align={align}
      sideOffset={12}
      className="w-[22rem] rounded-[1.75rem] border-border/70 bg-card p-0 shadow-soft"
    >
      <AccountMenuPanel onRequestClose={() => onOpenChange(false)} />
    </DropdownMenuContent>
  );
}

function AccountMenuDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DrawerContent className="max-h-[85dvh] rounded-t-[2rem] border-border/70 bg-card px-0 pb-0 shadow-soft">
      <DrawerHeader className="px-5 pb-3 pt-2 text-left">
        <DrawerTitle>Account</DrawerTitle>
        <DrawerDescription>Manage your profile, Giving Spaces, and session.</DrawerDescription>
      </DrawerHeader>
      {open ? <AccountMenuPanel onRequestClose={() => onOpenChange(false)} mobile /> : null}
    </DrawerContent>
  );
}

function AccountMenuPanel({
  onRequestClose,
  mobile = false,
}: {
  onRequestClose: () => void;
  mobile?: boolean;
}) {
  const {
    activeUser,
    activeWorkspace,
    activeProfile,
    activeWorkspaceId,
    canManageWorkspace,
    logout,
    setActiveWorkspaceId,
    workspaces,
  } = useUser();
  const [location, setLocation] = useLocation();

  if (!activeProfile) return null;

  const handleProfile = () => {
    onRequestClose();
    setLocation(APP_ROUTES.profile);
  };

  const handleCreateWorkspace = () => {
    onRequestClose();
    setLocation(APP_ROUTES.createWorkspace);
  };

  const handleJoinWorkspace = () => {
    onRequestClose();
    setLocation(APP_ROUTES.joinWorkspace);
  };

  const handleManageWorkspace = () => {
    onRequestClose();
    if (activeWorkspace?.type === "personal" && activeWorkspace.createdByUserId === activeUser?.uid) {
      requestProfileEditOpen();
      setLocation(APP_ROUTES.profile);
      return;
    }

    setWorkspaceAdminReturnPath(location);
    setLocation(APP_ROUTES.workspaceAdmin);
  };

  const handleLogout = () => {
    onRequestClose();
    logout();
    setLocation(APP_ROUTES.login);
  };

  return (
    <div className={cn("min-h-0 px-3", mobile ? "flex max-h-[calc(85dvh-4rem)] flex-col pb-0 pt-0" : "pt-3")}>
      <section className="rounded-[1.5rem] bg-muted/45 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={activeProfile.avatarUrl ?? undefined} alt={activeProfile.name} />
            <AvatarFallback className={cn("font-display text-base font-bold", activeProfile.accentClassName)}>
              {activeProfile.avatarInitial}
            </AvatarFallback>
          </Avatar>
          <button type="button" onClick={handleProfile} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-bold text-foreground">{activeProfile.name}</p>
            <p className="truncate text-sm text-muted-foreground">@{activeProfile.username}</p>
          </button>
          <Button type="button" variant="outline" onClick={handleProfile} className="h-9 rounded-xl px-3 text-sm font-semibold">
            <UserRound className="h-4 w-4" />
            Profile
          </Button>
        </div>
      </section>

      <div className="mx-0 my-3 h-px bg-border/70" />

      <section
        className={cn(
          "min-h-0",
          mobile &&
            "flex-1 overflow-y-auto overscroll-contain pb-5 [box-shadow:inset_0_10px_12px_-14px_rgba(15,23,42,0.18),inset_0_-10px_12px_-14px_rgba(15,23,42,0.18)]",
        )}
      >
        <div className="mb-3 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Giving Spaces</p>
        </div>
        <div className="space-y-2.5">
        {workspaces.map(({ workspace, membership }) => {
          const isActive = workspace.workspaceId === activeWorkspaceId;
          const isApproved = membership.status === "approved";
          const typeLabel = getWorkspaceTypeLabel({
            name: workspace.name,
            type: workspace.type,
          });

          return (
            <button
              key={membership.id}
              type="button"
              disabled={!isApproved}
              onClick={() => {
                if (!isApproved) return;
                setActiveWorkspaceId(workspace.workspaceId);
                if (!mobile) {
                  onRequestClose();
                }
              }}
              className={cn(
                "w-full rounded-[1.35rem] border px-4 py-4 text-left transition-all",
                isActive ? "border-primary/40 bg-primary/10" : "border-border/70 bg-card/70 hover:border-primary/30 hover:bg-card",
                !isApproved && "cursor-default opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{workspace.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{typeLabel ?? workspace.type}</p>
                </div>
                <div className="flex max-w-[48%] flex-wrap justify-end gap-2">
                  <Badge variant="secondary">{getRoleLabel(membership.role)}</Badge>
                  {membership.status === "pending" ? <Badge className="bg-amber-100 text-amber-900">Pending approval</Badge> : null}
                  {membership.status === "rejected" ? <Badge className="bg-rose-100 text-rose-900">Rejected</Badge> : null}
                  {isActive && isApproved ? <Badge className="bg-primary text-white"><Check className="mr-1 h-3 w-3" />Active</Badge> : null}
                </div>
              </div>
            </button>
          );
        })}
        </div>
      </section>

      <div className="mx-0 my-3 h-px bg-border/70" />

      <div className={cn("space-y-2 pb-3", mobile && "border-t border-transparent pb-[max(16px,calc(var(--safe-area-bottom)+16px))]")}>
        <MenuAction
          label="Create Giving Space"
          icon={Plus}
          onClick={handleCreateWorkspace}
        />
        <MenuAction
          label="Join Giving Space"
          icon={UserPlus}
          onClick={handleJoinWorkspace}
        />
        {canManageWorkspace ? (
          <MenuAction
            label="Manage Giving Space"
            icon={Settings2}
            onClick={handleManageWorkspace}
          />
        ) : null}
        <MenuAction
          label="Log out"
          icon={LogOut}
          onClick={handleLogout}
          destructive
        />
      </div>

      {!mobile ? (
        <div className="mt-3 flex items-center justify-end px-1">
          <ChevronDown className="h-4 w-4 text-muted-foreground/70" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-12 w-full justify-start rounded-[1.25rem] px-4 text-sm font-semibold hover:bg-muted/70",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
