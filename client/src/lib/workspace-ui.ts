import { type SessionMembership, type SessionWorkspace } from "@/lib/user-context";

export function getRoleLabel(role: SessionMembership["role"]) {
  switch (role) {
    case "owner":
      return "Owner";
    case "co-owner":
      return "Co-owner";
    case "admin":
      return "Admin";
    case "viewer":
      return "Viewer";
    default:
      return role;
  }
}

function formatWorkspaceType(type: SessionWorkspace["type"]) {
  switch (type) {
    case "personal":
      return "Personal Giving Space";
    case "relationship":
      return "Relationship";
    case "family":
      return "Family";
    case "group":
      return "Group";
    case "church":
      return "Church";
    case "organization":
      return "Organization";
    default:
      return type;
  }
}

export function getWorkspaceMetaLine(
  workspace: Pick<SessionWorkspace, "name" | "type">,
  membership: Pick<SessionMembership, "role">,
) {
  const normalizedName = workspace.name.trim().toLowerCase();
  const normalizedType = workspace.type.trim().toLowerCase();

  if (normalizedName === normalizedType) {
    return getRoleLabel(membership.role);
  }

  return `${formatWorkspaceType(workspace.type)} · ${getRoleLabel(membership.role)}`;
}

export function getWorkspaceTypeLabel(workspace: Pick<SessionWorkspace, "name" | "type">) {
  const normalizedName = workspace.name.trim().toLowerCase();
  const normalizedType = workspace.type.trim().toLowerCase();

  if (normalizedName === normalizedType) {
    return null;
  }

  return formatWorkspaceType(workspace.type);
}
