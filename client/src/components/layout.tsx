import { useEffect, useLayoutEffect } from "react";
import { Link, useLocation } from "wouter";
import { Compass, Gift, LayoutDashboard, Library, Settings, Sparkles } from "lucide-react";
import { APP_ROUTES, isExactRoute } from "@/lib/app-routes";
import { useUser } from "@/lib/user-context";
import { AccountMenu } from "@/components/account-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function scrollAppToTop() {
  const targets = [
    window,
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.querySelector(".app-main"),
  ].filter(Boolean) as Array<Window | Element>;

  targets.forEach((target) => {
    if ("scrollTo" in target) {
      (target as Window).scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }
    (target as Element).scrollTop = 0;
    (target as Element).scrollLeft = 0;
  });
}

function ScrollManager({ location }: { location: string }) {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const scheduleReset = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(scrollAppToTop);
      });
      window.setTimeout(scrollAppToTop, 0);
    };

    const handlePageShow = () => scheduleReset();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleReset();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useLayoutEffect(() => {
    scrollAppToTop();
    const rafOne = window.requestAnimationFrame(scrollAppToTop);
    const rafTwo = window.requestAnimationFrame(() => window.requestAnimationFrame(scrollAppToTop));

    return () => {
      window.cancelAnimationFrame(rafOne);
      window.cancelAnimationFrame(rafTwo);
    };
  }, [location]);

  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { activeUser, activeProfile, activeWorkspace, activeWorkspaceId, workspaces } = useUser();
  const isMobile = useIsMobile();

  const debugPanel = import.meta.env.DEV ? (
    <div className="fixed bottom-24 right-4 z-[60] hidden rounded-2xl border border-border bg-card/95 px-4 py-3 text-xs shadow-soft backdrop-blur md:block">
      <p className="font-bold text-foreground">Auth Debug</p>
      <p className="mt-1 text-muted-foreground">username: {activeUser?.username ?? "none"}</p>
      <p className="text-muted-foreground">uid: {activeUser?.uid ?? "none"}</p>
      <p className="text-muted-foreground">activeWorkspaceId: {activeWorkspaceId ?? "none"}</p>
      <p className="text-muted-foreground">workspaces: {workspaces.length}</p>
      <p className="text-muted-foreground">route: {location}</p>
    </div>
  ) : null;

  if (
    !activeUser ||
    !activeWorkspace ||
    location === APP_ROUTES.quickStart ||
    location === APP_ROUTES.login ||
    location === APP_ROUTES.signup ||
    location === APP_ROUTES.finishSetup ||
    location === APP_ROUTES.onboarding
  ) {
    return (
      <div className="min-h-[100dvh] bg-background md:min-h-screen">
        {children}
        {debugPanel}
      </div>
    );
  }

  const navItems = [
    { href: APP_ROUTES.home, label: "Reveal", icon: Gift },
    { href: APP_ROUTES.discover, label: "Discover", icon: Compass },
    { href: APP_ROUTES.causes, label: "Library", icon: Library },
    { href: APP_ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
    { href: APP_ROUTES.settings, label: "Settings", icon: Settings },
  ];
  const isProfileRoute = isExactRoute(location, APP_ROUTES.profile);

  return (
    <div className="app-shell bg-background md:flex">
      <ScrollManager location={location} />
      {/* Main Content */}
      <main className="app-main flex-1 md:ml-20 md:min-h-screen lg:ml-64">
        <div className="mx-auto w-full max-w-5xl px-4 pt-3 sm:px-6 md:p-6 lg:p-8">
          {activeProfile ? (
            isMobile ? (
            <AccountMenu className="mb-4 block md:hidden">
              <header className="flex items-start gap-3 rounded-[1.2rem] border border-border/55 bg-card/92 px-3.5 py-2.5 backdrop-blur-sm">
                <div className="flex min-w-0 flex-1 items-center gap-3 pr-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/14 text-primary">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold leading-none text-foreground">Impact</p>
                    <p className="mt-1 truncate pr-1 text-[11px] font-medium text-muted-foreground">
                      Giving Space: {activeProfile.workspaceName}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "ml-auto shrink-0 self-start rounded-full transition-transform",
                    isProfileRoute && "text-primary",
                  )}
                >
                  <Avatar className="h-10 w-10 border border-border/60 bg-background">
                    <AvatarImage src={activeProfile.headerAvatarUrl ?? undefined} alt={activeProfile.workspaceName} />
                    <AvatarFallback className={activeProfile.accentClassName}>
                      {activeProfile.avatarInitial}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </header>
            </AccountMenu>
            ) : null
          ) : null}
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) / Side Navigation (Desktop) */}
      <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-50 md:top-0 md:bottom-0 md:right-auto md:w-20 lg:w-64 md:border-t-0 md:border-r md:flex md:flex-col md:py-8 transition-all">
        
        <div className="hidden md:flex items-center justify-center lg:justify-start lg:px-8 mb-12">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="hidden lg:block ml-3 font-display font-bold text-xl text-foreground">Impact</span>
        </div>

        <div className="flex min-h-16 justify-around items-center px-2 pt-2 md:h-auto md:min-h-0 md:flex-col md:space-y-4 md:px-4 md:pt-0">
          {navItems.map((item) => {
            const isActive = isExactRoute(location, item.href);
            return (
              <Link key={item.href} href={item.href} className="w-full md:w-auto">
                <div className={`
                  flex flex-col md:flex-row items-center justify-center md:justify-start
                  p-2 md:py-3 lg:px-4 rounded-2xl md:rounded-xl cursor-pointer
                  transition-all duration-300 ease-out btn-cute
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-bouncy -translate-y-1 md:translate-y-0" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                `}>
                  <item.icon className={`w-6 h-6 ${isActive ? "animate-pulse" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[10px] font-bold mt-1 md:mt-0 md:ml-3 md:text-sm ${!isActive && "hidden lg:block"}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {activeProfile ? (
          !isMobile ? (
          <div className="hidden md:flex mt-auto px-4 lg:px-6">
            <AccountMenu align="start">
              <div
                className={cn(
                  "flex w-full items-center justify-center rounded-[1.5rem] border border-border/60 bg-card/85 px-3 py-3 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card lg:justify-start",
                  isProfileRoute && "border-primary/50 bg-primary/10",
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeProfile.headerAvatarUrl ?? undefined} alt={activeProfile.workspaceName} />
                  <AvatarFallback className={activeProfile.accentClassName}>
                    {activeProfile.avatarInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 lg:block ml-3 text-left">
                  <p className="truncate text-xs font-medium text-muted-foreground">Logged in as {activeUser.name}</p>
                  <p className="truncate text-sm font-bold text-foreground">@{activeProfile.username}</p>
                </div>
              </div>
            </AccountMenu>
          </div>
          ) : null
        ) : null}
      </nav>
      {debugPanel}
    </div>
  );
}
