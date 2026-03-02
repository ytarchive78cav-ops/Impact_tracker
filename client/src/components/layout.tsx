import { Link, useLocation } from "wouter";
import { Gift, LayoutDashboard, Library, Settings, Sparkles } from "lucide-react";
import { useUser } from "@/lib/user-context";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { activeUser } = useUser();

  if (!activeUser && location !== "/welcome") {
    // Let app component handle redirect, just render children
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const navItems = [
    { href: "/", label: "Reveal", icon: Gift },
    { href: "/causes", label: "Library", icon: Library },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:flex">
      {/* Mobile Header (optional, usually apps like this look cleaner without a persistent top bar) */}
      
      {/* Main Content */}
      <main className="flex-1 md:ml-20 lg:ml-64 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) / Side Navigation (Desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-50 md:top-0 md:bottom-0 md:right-auto md:w-20 lg:w-64 md:border-t-0 md:border-r md:flex md:flex-col md:py-8 transition-all">
        
        <div className="hidden md:flex items-center justify-center lg:justify-start lg:px-8 mb-12">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="hidden lg:block ml-3 font-display font-bold text-xl text-foreground">Impact</span>
        </div>

        <div className="flex justify-around items-center h-16 px-2 md:h-auto md:flex-col md:space-y-4 md:px-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
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

        <div className="hidden md:flex mt-auto px-4 lg:px-8 items-center justify-center lg:justify-start">
          <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold font-display shadow-sm">
            {activeUser?.[0]}
          </div>
          <div className="hidden lg:block ml-3">
            <p className="text-sm font-bold text-foreground">{activeUser}</p>
            <p className="text-xs text-muted-foreground">Logged in</p>
          </div>
        </div>
      </nav>
    </div>
  );
}
