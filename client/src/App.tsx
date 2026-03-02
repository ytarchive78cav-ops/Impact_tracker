import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider, useUser } from "./lib/user-context";
import { Layout } from "./components/layout";

import Welcome from "./pages/welcome";
import Home from "./pages/home";
import Causes from "./pages/causes";
import Dashboard from "./pages/dashboard";
import SettingsPage from "./pages/settings";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

// Auth Guard Component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { activeUser } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!activeUser) {
      setLocation("/welcome");
    }
  }, [activeUser, setLocation]);

  if (!activeUser) return null;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/welcome" component={Welcome} />
        <Route path="/">
          <ProtectedRoute component={Home} />
        </Route>
        <Route path="/causes">
          <ProtectedRoute component={Causes} />
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/settings">
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
