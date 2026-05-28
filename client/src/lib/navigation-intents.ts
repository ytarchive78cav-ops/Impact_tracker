const ACCOUNT_MENU_INTENT_KEY = "impact:open-account-menu";
const PROFILE_EDIT_INTENT_KEY = "impact:open-profile-edit";
const WORKSPACE_ADMIN_RETURN_PATH_KEY = "impact:workspace-admin-return-path";

function readSessionValue(key: string) {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key);
}

function writeSessionValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, value);
}

function clearSessionValue(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}

export function requestAccountMenuOpen() {
  writeSessionValue(ACCOUNT_MENU_INTENT_KEY, "1");
}

export function consumeAccountMenuOpenRequest() {
  const value = readSessionValue(ACCOUNT_MENU_INTENT_KEY) === "1";
  if (value) {
    clearSessionValue(ACCOUNT_MENU_INTENT_KEY);
  }
  return value;
}

export function requestProfileEditOpen() {
  writeSessionValue(PROFILE_EDIT_INTENT_KEY, "1");
}

export function consumeProfileEditOpenRequest() {
  const value = readSessionValue(PROFILE_EDIT_INTENT_KEY) === "1";
  if (value) {
    clearSessionValue(PROFILE_EDIT_INTENT_KEY);
  }
  return value;
}

export function setWorkspaceAdminReturnPath(path: string) {
  writeSessionValue(WORKSPACE_ADMIN_RETURN_PATH_KEY, path);
}

export function consumeWorkspaceAdminReturnPath() {
  const path = readSessionValue(WORKSPACE_ADMIN_RETURN_PATH_KEY);
  clearSessionValue(WORKSPACE_ADMIN_RETURN_PATH_KEY);
  return path;
}
