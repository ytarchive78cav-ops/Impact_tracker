export const APP_ROUTES = {
  quickStart: "/quick-start",
  login: "/login",
  signup: "/signup",
  finishSetup: "/finish-setup",
  onboarding: "/onboarding",
  home: "/",
  discover: "/discover",
  cause: "/cause",
  causes: "/causes",
  dashboard: "/dashboard",
  profile: "/profile",
  workspaces: "/workspaces",
  createWorkspace: "/workspaces/new",
  joinWorkspace: "/workspaces/join",
  workspaceAdmin: "/workspace-admin",
  settings: "/settings",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

export function isExactRoute(location: string, route: AppRoute) {
  return location === route;
}
