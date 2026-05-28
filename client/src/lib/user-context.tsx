import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  DEV_AUTH_PRESETS,
  LOCAL_STORAGE_KEYS,
  normalizeUsername,
  storage,
  type LocalLocation,
  type LocalMembership,
  type LocalUser,
  type MembershipRole,
  type MembershipStatus,
  type WorkspaceType,
} from "@/lib/local-storage";

export const ACTIVE_WORKSPACE_STORAGE_KEY = LOCAL_STORAGE_KEYS.activeWorkspacePrefix;

export interface SessionUser {
  uid: string;
  username: string;
  name: string;
  defaultLocation?: LocalLocation | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface SessionWorkspace {
  workspaceId: string;
  name: string;
  type: WorkspaceType;
  joinCode: string;
  createdByUserId: string;
  avatarUrl?: string | null;
  location?: LocalLocation | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  requestedAt: string;
  approvedAt?: string;
  approvedByUserId?: string;
}

export interface UserWorkspace {
  workspace: SessionWorkspace;
  membership: SessionMembership;
}

export interface UserDetails {
  name: string;
  username: string;
  workspaceName: string;
  workspaceType?: SessionWorkspace["type"];
  accentClassName: string;
  avatarInitial: string;
  avatarUrl?: string | null;
  headerAvatarUrl?: string | null;
  workspaces: UserWorkspace[];
}

interface UserContextType {
  activeUser: SessionUser | null;
  activeWorkspace: SessionWorkspace | null;
  activeWorkspaceId: string | null;
  activeMembership: SessionMembership | null;
  workspaces: UserWorkspace[];
  approvedWorkspaces: UserWorkspace[];
  activeProfile: UserDetails | null;
  isLoaded: boolean;
  canManageWorkspace: boolean;
  canManageCauses: boolean;
  canManageSettings: boolean;
  canLogImpact: boolean;
  hasApprovedWorkspace: boolean;
  login: (input: { username: string; password: string }) => Promise<void>;
  signup: (input: { displayName: string; username: string; password: string; confirmPassword: string }) => Promise<void>;
  loginWithDevPreset: (preset: keyof typeof DEV_AUTH_PRESETS) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setActiveWorkspaceId: (workspaceId: string) => void;
  createWorkspace: (input: { name: string; type: WorkspaceType; location?: Partial<LocalLocation> | null }) => Promise<SessionWorkspace>;
  requestJoinWorkspace: (joinCode: string) => Promise<{ workspace: SessionWorkspace; membership: SessionMembership }>;
  approveMembership: (workspaceId: string, membershipId: string, role?: MembershipRole) => Promise<void>;
  rejectMembership: (workspaceId: string, membershipId: string) => Promise<void>;
  updateMembershipRole: (workspaceId: string, membershipId: string, role: MembershipRole) => Promise<void>;
  transferWorkspaceOwnership: (workspaceId: string, membershipId: string, previousOwnerRole: Exclude<MembershipRole, "owner">) => Promise<void>;
  removeMemberFromWorkspace: (workspaceId: string, membershipId: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  updateActiveProfileName: (name: string) => Promise<void>;
  updateWorkspaceLocation: (workspaceId: string, location: Partial<LocalLocation> | null) => Promise<void>;
  updateWorkspaceAvatar: (workspaceId: string, avatarDataUrl: string | null) => Promise<void>;
  updateUserDefaultLocation: (location: Partial<LocalLocation> | null) => Promise<void>;
  updateUserAvatar: (avatarDataUrl: string | null) => Promise<void>;
  changePassword: (input: { currentPassword: string; nextPassword: string; confirmPassword: string }) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const isDev = import.meta.env.DEV;

function getAccentClassName(seed: string) {
  const palette = [
    "bg-blue-100 text-blue-600",
    "bg-orange-100 text-orange-600",
    "bg-emerald-100 text-emerald-600",
    "bg-rose-100 text-rose-600",
  ];
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index)) % palette.length;
  }
  return palette[hash];
}

function logDev(message: string, details?: unknown) {
  if (!isDev) return;
  if (details === undefined) {
    console.log(`[local-auth] ${message}`);
    return;
  }
  console.log(`[local-auth] ${message}`, details);
}

function toSessionUser(user: LocalUser): SessionUser {
  return {
    uid: user.id,
    username: user.username,
    name: user.displayName,
    defaultLocation: user.defaultLocation ?? null,
    avatarUrl: user.avatarDataUrl ?? null,
    createdAt: user.createdAt,
  };
}

function toSessionWorkspace(entry: ReturnType<typeof storage.getWorkspacesForUser>[number]): UserWorkspace {
  return {
    workspace: {
      workspaceId: entry.workspace.id,
      name: entry.workspace.name,
      type: entry.workspace.type,
      joinCode: entry.workspace.joinCode,
      createdByUserId: entry.workspace.createdByUserId,
      avatarUrl: entry.workspace.avatarDataUrl ?? null,
      location: entry.workspace.location ?? null,
      createdAt: entry.workspace.createdAt,
      updatedAt: entry.workspace.updatedAt,
    },
    membership: {
      id: entry.membership.id,
      workspaceId: entry.membership.workspaceId,
      userId: entry.membership.userId,
      role: entry.membership.role,
      status: entry.membership.status,
      requestedAt: entry.membership.requestedAt,
      approvedAt: entry.membership.approvedAt,
      approvedByUserId: entry.membership.approvedByUserId,
    },
  };
}

function isWorkspaceManager(membership: SessionMembership | null) {
  return membership?.status === "approved"
    && (membership.role === "owner" || membership.role === "co-owner" || membership.role === "admin");
}

function getApprovedWorkspaceId(workspaces: UserWorkspace[], preferredWorkspaceId: string | null) {
  const approved = workspaces.filter((entry) => entry.membership.status === "approved");
  if (preferredWorkspaceId && approved.some((entry) => entry.workspace.workspaceId === preferredWorkspaceId)) {
    return preferredWorkspaceId;
  }
  return approved[0]?.workspace.workspaceId ?? null;
}

export function getStoredActiveWorkspaceId() {
  if (typeof window === "undefined") return null;
  const currentUser = storage.getCurrentUser();
  if (!currentUser) return null;
  return storage.getActiveWorkspaceId(currentUser.id);
}

export function setStoredActiveWorkspaceId(workspaceId: string | null) {
  const currentUser = storage.getCurrentUser();
  if (!currentUser) return;
  storage.setActiveWorkspaceId(currentUser.id, workspaceId);
}

export async function apiFetch(_url: string, _init?: RequestInit): Promise<Response> {
  return Promise.reject(new Error("Server-backed API calls are disabled in local auth mode."));
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUser] = useState<SessionUser | null>(null);
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const applyUserState = (user: LocalUser | null) => {
    if (!user) {
      setActiveUser(null);
      setWorkspaces([]);
      setActiveWorkspaceIdState(null);
      return;
    }

    const nextWorkspaces = storage.ensureWorkspaceBootstrap(user).map(toSessionWorkspace);
    const storedActiveWorkspaceId = storage.getActiveWorkspaceId(user.id);
    const nextActiveWorkspaceId = getApprovedWorkspaceId(nextWorkspaces, storedActiveWorkspaceId);

    storage.setActiveWorkspaceId(user.id, nextActiveWorkspaceId);
    setActiveUser(toSessionUser(user));
    setWorkspaces(nextWorkspaces);
    setActiveWorkspaceIdState(nextActiveWorkspaceId);
  };

  const refreshSession = async () => {
    applyUserState(storage.getCurrentUser());
    setIsLoaded(true);
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    logDev("auth state", {
      username: activeUser?.username ?? null,
      uid: activeUser?.uid ?? null,
      activeWorkspaceId,
      workspaceCount: workspaces.length,
    });
  }, [activeUser?.username, activeUser?.uid, activeWorkspaceId, workspaces.length]);

  const syncCurrentUser = () => {
    const current = storage.getCurrentUser();
    applyUserState(current);
  };

  const login = async (input: { username: string; password: string }) => {
    const user = await storage.login({
      username: input.username,
      password: input.password,
    });
    applyUserState(user);
  };

  const signup = async (input: { displayName: string; username: string; password: string; confirmPassword: string }) => {
    if (input.password !== input.confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const user = await storage.createAccount({
      displayName: input.displayName.trim(),
      username: normalizeUsername(input.username),
      password: input.password,
    });
    applyUserState(user);
  };

  const loginWithDevPreset = async (preset: keyof typeof DEV_AUTH_PRESETS) => {
    const user = await storage.loginWithDevPreset(preset);
    applyUserState(user);
  };

  const logout = async () => {
    storage.clearSession();
    applyUserState(null);
  };

  const setActiveWorkspaceId = (workspaceId: string) => {
    if (!activeUser) return;
    const workspace = workspaces.find((entry) => entry.workspace.workspaceId === workspaceId);
    if (!workspace || workspace.membership.status !== "approved") return;
    storage.setActiveWorkspaceId(activeUser.uid, workspaceId);
    setActiveWorkspaceIdState(workspaceId);
  };

  const createWorkspace = async (input: { name: string; type: WorkspaceType; location?: Partial<LocalLocation> | null }) => {
    const created = storage.createWorkspace(input);
    syncCurrentUser();
    return {
      workspaceId: created.workspace.id,
      name: created.workspace.name,
      type: created.workspace.type,
      joinCode: created.workspace.joinCode,
      createdByUserId: created.workspace.createdByUserId,
      avatarUrl: created.workspace.avatarDataUrl ?? null,
      location: created.workspace.location ?? null,
      createdAt: created.workspace.createdAt,
      updatedAt: created.workspace.updatedAt,
    };
  };

  const requestJoinWorkspace = async (joinCode: string) => {
    const result = storage.requestJoinWorkspace(joinCode);
    syncCurrentUser();
    return {
      workspace: {
        workspaceId: result.workspace.id,
        name: result.workspace.name,
        type: result.workspace.type,
        joinCode: result.workspace.joinCode,
        createdByUserId: result.workspace.createdByUserId,
        avatarUrl: result.workspace.avatarDataUrl ?? null,
        createdAt: result.workspace.createdAt,
        updatedAt: result.workspace.updatedAt,
      },
      membership: {
        id: result.membership.id,
        workspaceId: result.membership.workspaceId,
        userId: result.membership.userId,
        role: result.membership.role,
        status: result.membership.status,
        requestedAt: result.membership.requestedAt,
        approvedAt: result.membership.approvedAt,
        approvedByUserId: result.membership.approvedByUserId,
      },
    };
  };

  const approveMembership = async (workspaceId: string, membershipId: string, role?: MembershipRole) => {
    storage.approveMembership(workspaceId, membershipId, role);
    syncCurrentUser();
  };

  const rejectMembership = async (workspaceId: string, membershipId: string) => {
    storage.rejectMembership(workspaceId, membershipId);
    syncCurrentUser();
  };

  const updateMembershipRole = async (workspaceId: string, membershipId: string, role: MembershipRole) => {
    storage.updateMembershipRole(workspaceId, membershipId, role);
    syncCurrentUser();
  };

  const transferWorkspaceOwnership = async (
    workspaceId: string,
    membershipId: string,
    previousOwnerRole: Exclude<MembershipRole, "owner">,
  ) => {
    storage.transferWorkspaceOwnership(workspaceId, membershipId, previousOwnerRole);
    syncCurrentUser();
  };

  const removeMemberFromWorkspace = async (workspaceId: string, membershipId: string) => {
    storage.removeMemberFromWorkspace(workspaceId, membershipId);
    syncCurrentUser();
  };

  const leaveWorkspace = async (workspaceId: string) => {
    storage.leaveWorkspace(workspaceId);
    syncCurrentUser();
  };

  const deleteWorkspace = async (workspaceId: string) => {
    storage.deleteWorkspace(workspaceId);
    syncCurrentUser();
  };

  const updateActiveProfileName = async (name: string) => {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;
    const updated = storage.updateUserDisplayName(currentUser.id, name);
    if (!updated) return;
    applyUserState(updated);
  };

  const updateWorkspaceLocation = async (workspaceId: string, location: Partial<LocalLocation> | null) => {
    storage.updateWorkspaceLocation(workspaceId, location);
    syncCurrentUser();
  };

  const updateWorkspaceAvatar = async (workspaceId: string, avatarDataUrl: string | null) => {
    storage.updateWorkspaceAvatar(workspaceId, avatarDataUrl);
    syncCurrentUser();
  };

  const updateUserDefaultLocation = async (location: Partial<LocalLocation> | null) => {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;
    const updated = storage.updateUserDefaultLocation(currentUser.id, location);
    if (!updated) return;
    applyUserState(updated);
  };

  const updateUserAvatar = async (avatarDataUrl: string | null) => {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;
    const updated = storage.updateUserAvatar(currentUser.id, avatarDataUrl);
    if (!updated) return;
    applyUserState(updated);
  };

  const changePassword = async (input: { currentPassword: string; nextPassword: string; confirmPassword: string }) => {
    const currentUser = storage.getCurrentUser();
    if (!currentUser) throw new Error("Log in first.");
    if (input.nextPassword !== input.confirmPassword) {
      throw new Error("New passwords do not match.");
    }
    await storage.changePassword(currentUser.id, input.currentPassword, input.nextPassword);
  };

  const approvedWorkspaces = useMemo(
    () => workspaces.filter((entry) => entry.membership.status === "approved"),
    [workspaces],
  );

  const activeWorkspace = useMemo(
    () => approvedWorkspaces.find(({ workspace }) => workspace.workspaceId === activeWorkspaceId)?.workspace ?? null,
    [activeWorkspaceId, approvedWorkspaces],
  );

  const activeMembership = useMemo(
    () => approvedWorkspaces.find(({ workspace }) => workspace.workspaceId === activeWorkspaceId)?.membership ?? null,
    [activeWorkspaceId, approvedWorkspaces],
  );

  const activeProfile = useMemo(() => {
    if (!activeUser) return null;
    return {
      name: activeUser.name,
      username: activeUser.username,
      workspaceName: activeWorkspace?.name ?? "No Giving Space selected",
      workspaceType: activeWorkspace?.type,
      accentClassName: getAccentClassName(activeUser.username),
      avatarInitial: activeUser.name.trim().charAt(0).toUpperCase() || "?",
      avatarUrl: activeUser.avatarUrl ?? null,
      headerAvatarUrl: activeWorkspace?.avatarUrl ?? activeUser.avatarUrl ?? null,
      workspaces,
    };
  }, [activeUser, activeWorkspace, workspaces]);

  const canManage = isWorkspaceManager(activeMembership);

  return (
    <UserContext.Provider
      value={{
        activeUser,
        activeWorkspace,
        activeWorkspaceId,
        activeMembership,
        workspaces,
        approvedWorkspaces,
        activeProfile,
        isLoaded,
        canManageWorkspace: canManage,
        canManageCauses: canManage,
        canManageSettings: canManage,
        canLogImpact: activeMembership?.status === "approved" && activeMembership.role !== "viewer",
        hasApprovedWorkspace: approvedWorkspaces.length > 0,
        login,
        signup,
        loginWithDevPreset,
        logout,
        refreshSession,
        setActiveWorkspaceId,
        createWorkspace,
        requestJoinWorkspace,
        approveMembership,
        rejectMembership,
        updateMembershipRole,
        transferWorkspaceOwnership,
        removeMemberFromWorkspace,
        leaveWorkspace,
        deleteWorkspace,
        updateActiveProfileName,
        updateWorkspaceLocation,
        updateWorkspaceAvatar,
        updateUserDefaultLocation,
        updateUserAvatar,
        changePassword,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
