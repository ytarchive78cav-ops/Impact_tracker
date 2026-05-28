import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";

import { queryClient } from "./lib/queryClient";
import { UserProvider, useUser } from "./lib/user-context";
import { APP_ROUTES } from "@/lib/app-routes";
import { Layout } from "./components/layout";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "./pages/home";
import DiscoverPage from "./pages/discover";
import CauseProfilePage from "./pages/cause-profile";
import Causes from "./pages/causes";
import Dashboard from "./pages/dashboard";
import ProfilePage from "./pages/profile";
import SettingsPage from "./pages/settings";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import QuickStartPage from "./pages/quick-start";
import WorkspacesPage from "./pages/workspaces";
import CreateWorkspacePage from "./pages/workspace-create";
import JoinWorkspacePage from "./pages/workspace-join";
import WorkspaceAdminPage from "./pages/workspace-admin";
import NotFound from "@/pages/not-found";

function AppLoader() {
  return <div className="min-h-[100dvh] bg-background" />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { activeUser, hasApprovedWorkspace, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;
    if (!activeUser) {
      setLocation(APP_ROUTES.login);
      return;
    }
    if (!hasApprovedWorkspace) {
      setLocation(APP_ROUTES.workspaces);
    }
  }, [activeUser, hasApprovedWorkspace, isLoaded, setLocation]);

  if (!isLoaded) return <AppLoader />;
  if (!activeUser || !hasApprovedWorkspace) return null;
  return <Component />;
}

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { activeUser, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;
    if (!activeUser) {
      setLocation(APP_ROUTES.login);
    }
  }, [activeUser, isLoaded, setLocation]);

  if (!isLoaded) return <AppLoader />;
  if (!activeUser) return null;
  return <Component />;
}

function PublicOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { activeUser, hasApprovedWorkspace, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;
    if (activeUser) {
      setLocation(hasApprovedWorkspace ? APP_ROUTES.home : APP_ROUTES.workspaces);
    }
  }, [activeUser, hasApprovedWorkspace, isLoaded, setLocation]);

  if (!isLoaded) return <AppLoader />;
  if (activeUser) return null;
  return <Component />;
}

function HiddenQuickStartRoute() {
  return <QuickStartPage />;
}

function RedirectToLogin() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(APP_ROUTES.login);
  }, [setLocation]);

  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/welcome" component={RedirectToLogin} />
        <Route path={APP_ROUTES.quickStart} component={HiddenQuickStartRoute} />
        <Route path={APP_ROUTES.login}>
          <PublicOnlyRoute component={LoginPage} />
        </Route>
        <Route path={APP_ROUTES.signup}>
          <PublicOnlyRoute component={SignupPage} />
        </Route>
        <Route path={APP_ROUTES.finishSetup} component={RedirectToLogin} />
        <Route path={APP_ROUTES.home}>
          <ProtectedRoute component={Home} />
        </Route>
        <Route path={APP_ROUTES.discover}>
          <ProtectedRoute component={DiscoverPage} />
        </Route>
        <Route path={`${APP_ROUTES.cause}/:id`}>
          <ProtectedRoute component={CauseProfilePage} />
        </Route>
        <Route path={APP_ROUTES.causes}>
          <ProtectedRoute component={Causes} />
        </Route>
        <Route path={APP_ROUTES.dashboard}>
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path={APP_ROUTES.profile}>
          <ProtectedRoute component={ProfilePage} />
        </Route>
        <Route path={APP_ROUTES.workspaces}>
          <AuthenticatedRoute component={WorkspacesPage} />
        </Route>
        <Route path={APP_ROUTES.createWorkspace}>
          <AuthenticatedRoute component={CreateWorkspacePage} />
        </Route>
        <Route path={APP_ROUTES.joinWorkspace}>
          <AuthenticatedRoute component={JoinWorkspacePage} />
        </Route>
        <Route path={APP_ROUTES.workspaceAdmin}>
          <ProtectedRoute component={WorkspaceAdminPage} />
        </Route>
        <Route path={APP_ROUTES.settings}>
          <ProtectedRoute component={SettingsPage} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
