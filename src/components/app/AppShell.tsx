import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Bus,
  GraduationCap,
  CalendarCheck2,
  CalendarDays,
  FileBarChart2,
  ClipboardList,
  UserCog,
  Search,
  Bell,
  Command,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Trophy,
  Megaphone,
  GraduationCap as GradCapIcon,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readSession, signOut, type Role, type Session } from "@/lib/auth";
import { toast } from "sonner";
import { SearchPalette } from "./SearchPalette";

type NavItem = { to: string; label: string; icon: typeof Users };

const principalNav: NavItem[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/fees", label: "Fee Structure", icon: Receipt },
  { to: "/promotion", label: "Promote Students", icon: GradCapIcon },
  { to: "/buses", label: "Bus Fleet", icon: Bus },
  { to: "/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck2 },
  { to: "/notices", label: "Notices", icon: Megaphone },
  { to: "/exams", label: "Exam Scheduler", icon: ClipboardList },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/reports", label: "Financial Reports", icon: FileBarChart2 },
  { to: "/staff", label: "Operations Staff", icon: UserCog },
];

const facultyNav: NavItem[] = [
  { to: "/students", label: "Students", icon: Users },
  { to: "/fees", label: "Fee Structure", icon: Receipt },
  { to: "/buses", label: "Bus Fleet", icon: Bus },
  { to: "/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck2 },
  { to: "/notices", label: "Notices", icon: Megaphone },
  { to: "/exams", label: "Exam Scheduler", icon: ClipboardList },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
];

type ShellVariant = {
  prefix: "/principal" | "/faculty";
  brand: string;
  tagline: string;
  roleLabel: string;
  nav: NavItem[];
};

function useShellVariant(): ShellVariant {
  const loc = useLocation();
  return useMemo(() => {
    if (loc.pathname.startsWith("/faculty")) {
      return {
        prefix: "/faculty",
        brand: "Faculty Console",
        tagline: "Teaching Portal",
        roleLabel: "Faculty",
        nav: facultyNav,
      };
    }
    return {
      prefix: "/principal",
      brand: "Ace Operations Hub",
      tagline: "Principal Console",
      roleLabel: "Principal",
      nav: principalNav,
    };
  }, [loc.pathname]);
}

function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    setSession(readSession());
    const on = () => setSession(readSession());
    window.addEventListener("ace-auth-change", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("ace-auth-change", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return session;
}

function useClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("ace.sidebar.collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem("ace.sidebar.collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);
  return { collapsed, toggle };
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const clock = useClock();
  const pathname = useLocation().pathname;
  const { collapsed, toggle } = useCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const variant = useShellVariant();

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    const focusables = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const first = focusables()[0];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusables();
      if (!nodes.length) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      menuBtnRef.current?.focus();
    };
  }, [mobileOpen]);

  const onSignOut = async () => {
    await signOut();
    toast("Signed out");
    navigate({ to: "/" });
  };

  const sidebarWidth = collapsed ? 84 : 248;

  return (
    <div className="min-h-screen w-full flex">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:text-primary-foreground focus:px-3 focus:py-2 focus:text-[12.5px]"
      >
        Skip to content
      </a>

      <SidebarNav
        variant="desktop"
        collapsed={collapsed}
        onToggle={toggle}
        session={session}
        onSignOut={onSignOut}
        shell={variant}
        className="hidden lg:flex"
      />

      {mobileOpen ? (
        <>
          <button
            aria-label="Close navigation"
            tabIndex={-1}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-[oklch(0.18_0.01_260/.35)] backdrop-blur-sm lg:hidden animate-in fade-in-0"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${variant.brand} navigation`}
            className="fixed inset-y-3 left-3 z-50 lg:hidden animate-in slide-in-from-left-2"
          >
            <SidebarNav
              variant="mobile"
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              session={session}
              onSignOut={onSignOut}
              shell={variant}
            />
          </div>
        </>
      ) : null}

      <main
        id="app-main"
        className="flex-1 pr-3 lg:pr-5 py-3 lg:py-5 pl-3 lg:pl-[var(--app-sidebar-pad)] transition-[padding] duration-300 ease-out"
        style={{ ["--app-sidebar-pad" as string]: `${sidebarWidth + 20}px` }}
      >
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 mb-5 lg:mb-7 px-2 lg:px-4">
          <button
            ref={menuBtnRef}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="app-mobile-nav"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-9 w-9 grid place-items-center rounded-full glass-card hairline text-ink hover:bg-secondary transition outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Menu className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <div className="min-w-0">
            <h1 className="text-[24px] sm:text-[28px] lg:text-[34px] font-bold tracking-tight text-ink truncate leading-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[12.5px] sm:text-[13.5px] text-subtle mt-0.5 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-full glass-card hairline text-[12.5px] text-subtle hover:text-ink transition outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <span className="ml-2 inline-flex items-center gap-0.5 text-[10.5px]">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </button>
            <button
              aria-label="Notifications"
              className="h-9 w-9 grid place-items-center rounded-full glass-card hairline text-ink hover:bg-secondary transition outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              <Bell className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <div className="hidden sm:inline-flex ios-pill">{clock || "—"}</div>
            {actions}
          </div>
        </header>

        <div key={pathname} className="px-2 lg:px-4 pb-10 ace-page-enter">{children}</div>
      </main>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SidebarNav({
  variant,
  collapsed,
  onToggle,
  onNavigate,
  className,
  session,
  onSignOut,
  shell,
}: {
  variant: "desktop" | "mobile";
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  className?: string;
  session: Session | null;
  onSignOut: () => void;
  shell: ShellVariant;
}) {
  const loc = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const width = collapsed ? 68 : 248;

  const items = shell.nav;

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const links = Array.from(
      navRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-navitem]") ?? [],
    );
    if (!links.length) return;
    const idx = links.findIndex((n) => n === document.activeElement);
    let next = idx;
    if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % links.length;
    else if (e.key === "ArrowUp") next = idx <= 0 ? links.length - 1 : idx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = links.length - 1;
    else return;
    e.preventDefault();
    links[next]?.focus();
  };

  const displayRole: Role | undefined = session?.role;

  return (
    <aside
      id={variant === "mobile" ? "app-mobile-nav" : undefined}
      aria-label={`${shell.brand} primary navigation`}
      className={cn(
        variant === "desktop"
          ? "fixed inset-y-3 left-3 flex flex-col glass-panel p-3 z-20 transition-[width] duration-300 ease-out"
          : "flex flex-col glass-panel p-3 w-[268px] max-w-[85vw] max-h-[calc(100vh-24px)] overflow-y-auto shadow-[var(--shadow-glass-lg)]",
        className,
      )}
      style={variant === "desktop" ? { width } : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 px-2 py-1.5 relative",
          collapsed && "justify-center",
        )}
      >
        <div className="h-9 w-9 rounded-2xl overflow-hidden shrink-0 border border-black/10 shadow-sm bg-ink">
          <img src="/ace-logo.png" alt="Ace Operations Logo" className="h-full w-full object-cover" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-ink truncate">
              {shell.brand}
            </div>
            <div className="text-[11px] text-subtle truncate">{shell.tagline}</div>
          </div>
        ) : null}
        <button
          onClick={onToggle}
          aria-label={
            variant === "mobile"
              ? "Close navigation"
              : collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
          aria-expanded={variant === "mobile" ? true : !collapsed}
          className={cn(
            "h-8 w-8 grid place-items-center rounded-full text-subtle hover:bg-secondary hover:text-ink transition outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
            collapsed &&
              variant === "desktop" &&
              "absolute -right-3 top-4 bg-white hairline shadow-[var(--shadow-glass)]",
          )}
        >
          {variant === "mobile" ? (
            <X className="h-4 w-4" />
          ) : collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav
        ref={navRef}
        onKeyDown={onKeyDown}
        aria-label="Modules"
        className="mt-4 flex-1 space-y-0.5"
      >
        {items.map((item, i) => {
          const fullPath = `${shell.prefix}${item.to}`;
          const active =
            loc.pathname === fullPath || loc.pathname.startsWith(`${fullPath}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={fullPath as unknown as "/"}
              data-navitem
              tabIndex={active || (i === 0 && !document?.activeElement?.matches?.("a[data-navitem]")) ? 0 : -1}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center rounded-2xl text-[13.5px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-ink text-primary-foreground shadow-[0_4px_14px_rgba(15,15,20,0.18)]"
                  : "text-ink/80 hover:bg-secondary",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-primary-foreground" : "text-ink/70",
                )}
                strokeWidth={1.75}
              />
              {!collapsed ? (
                <span className="truncate">{item.label}</span>
              ) : (
                <span className="sr-only">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-4 glass-card p-3 flex items-center gap-3",
          collapsed && "flex-col justify-center p-2 gap-2",
        )}
      >
        <div className="h-9 w-9 rounded-full bg-secondary grid place-items-center hairline shrink-0">
          <span className="text-[12px] font-semibold text-ink">
            {(session?.displayName ?? "GR")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-ink truncate">
              {session?.displayName ?? "Guest"}
            </div>
            <div className="text-[11px] text-subtle truncate">
              {displayRole === "principal"
                ? "Principal"
                : displayRole === "faculty"
                  ? "Faculty"
                  : "Unauthenticated"}
            </div>
          </div>
        ) : null}
        <button
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="h-8 w-8 rounded-full grid place-items-center text-subtle hover:bg-secondary hover:text-ink transition outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
