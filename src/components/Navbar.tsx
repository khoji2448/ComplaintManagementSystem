"use client";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  FilePlus2,
  BarChart3,
  ListChecks,
  Users,
  Tags,
  MapPin,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  perm: PermissionKey;
  icon: LucideIcon;
  group: "operate" | "manage";
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", perm: "dashboard:view", icon: LayoutDashboard, group: "operate" },
  { href: "/complaintentry", label: "Complaint Entry", perm: "complaints:create", icon: FilePlus2, group: "operate" },
  { href: "/reports", label: "Reports", perm: "reports:view", icon: BarChart3, group: "operate" },
  { href: "/complaintsaction", label: "Complaints Actions", perm: "complaints:action", icon: ListChecks, group: "operate" },
  { href: "/manageuser", label: "Manage Users", perm: "users:manage", icon: Users, group: "manage" },
  { href: "/managecomplainttype", label: "Complaint Types", perm: "complaint_types:manage", icon: Tags, group: "manage" },
  { href: "/manageareas", label: "Complaint Areas", perm: "areas:manage", icon: MapPin, group: "manage" },
  { href: "/manageroles", label: "Manage Roles", perm: "roles:manage", icon: ShieldCheck, group: "manage" },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const permissions = session?.user?.permissions ?? [];
  const authorized = navLinks.filter((l) => permissions.includes(l.perm));
  const operate = authorized.filter((l) => l.group === "operate");
  const manage = authorized.filter((l) => l.group === "manage");

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  const NavItem = ({ link }: { link: NavLink }) => {
    const active = pathname === link.href;
    const Icon = link.icon;
    return (
      <Link
        href={link.href}
        onClick={() => setOpen(false)}
        className={`group relative flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150
          ${active ? "text-[var(--ink)] font-medium" : "text-[var(--slate)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"}`}
      >
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full transition-all duration-300 ${
            active ? "bg-[var(--signal)] opacity-100" : "opacity-0"
          }`}
          style={{ transitionTimingFunction: "var(--ease)" }}
        />
        <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className={active ? "text-[var(--signal)]" : ""} />
        <span>{link.label}</span>
      </Link>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mute)]">
      {children}
    </div>
  );

  const Rail = (
    <div className="flex h-full flex-col">
      {/* brand */}
      <div className="px-5 pb-5 pt-6">
        <div className="font-display text-base font-bold tracking-[-0.02em] text-[var(--ink)]">
          Brick School
        </div>
        <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">
          CMS · Console
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto pb-4">
        {operate.length > 0 && (
          <>
            <SectionLabel>Operate</SectionLabel>
            {operate.map((l) => (
              <NavItem key={l.href} link={l} />
            ))}
          </>
        )}
        {manage.length > 0 && (
          <>
            <SectionLabel>Manage</SectionLabel>
            {manage.map((l) => (
              <NavItem key={l.href} link={l} />
            ))}
          </>
        )}
      </nav>

      {/* user + logout */}
      {session && (
        <div className="border-t border-[var(--hairline)] p-4">
          {session.user?.name && (
            <div className="mb-3 px-1">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--mute)]">Signed in</div>
              <div className="truncate text-sm font-medium text-[var(--ink)]">{session.user.name}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-1 py-2 text-sm text-[var(--slate)] transition-colors duration-150 hover:text-[var(--signal)]"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── desktop fixed rail ── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[248px] border-r border-[var(--hairline)] bg-[var(--card)] md:block">
        {Rail}
      </aside>

      {/* ── mobile top bar ── */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[56px] items-center justify-between border-b border-[var(--hairline)] bg-[var(--card)] px-4 md:hidden">
        <div className="font-display text-sm font-bold tracking-[-0.02em]">Brick School CMS</div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── mobile drawer ── */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-[var(--card)] animate-drawer-in">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-4 top-5 z-10 text-[var(--slate)] hover:text-[var(--ink)]"
            >
              <X size={22} />
            </button>
            {Rail}
          </aside>
        </div>
      )}
    </>
  );
}
