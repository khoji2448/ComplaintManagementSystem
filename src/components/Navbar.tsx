"use client";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PermissionKey } from "@/lib/permissions";

interface NavLink {
  href: string;
  label: string;
  perm: PermissionKey;
}

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const navLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", perm: "dashboard:view" },
    { href: "/complaintentry", label: "Complaint Entry", perm: "complaints:create" },
    { href: "/reports", label: "Reports", perm: "reports:view" },
    { href: "/complaintsaction", label: "Complaints Actions", perm: "complaints:action" },
    { href: "/manageuser", label: "Manage Users", perm: "users:manage" },
    { href: "/managecomplainttype", label: "Manage Complaint Types", perm: "complaint_types:manage" },
    { href: "/manageareas", label: "Manage Complaint Areas", perm: "areas:manage" },
    { href: "/manageroles", label: "Manage Roles", perm: "roles:manage" },
  ];

  const permissions = session?.user?.permissions ?? [];

  // Filter links based on user permissions
  const authorizedLinks = navLinks.filter((link) => permissions.includes(link.perm));

  // Get current page label
  // const getCurrentPageLabel = () => {
  //   const currentLink = navLinks.find(link => link.href === pathname);
  //   return currentLink ? ` | ${currentLink.label}` : '';
  // };

  const handleLogout = async () => {
    await signOut({
      redirect: false,
    });
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="bg-blue-600 text-white p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">
          Brick School CMS
          {/* <span className="text-lg font-normal">
            {getCurrentPageLabel()}
          </span> */}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {authorizedLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1 rounded transition-colors hover:bg-blue-700 ${pathname === link.href ? 'bg-blue-700' : 'bg-blue-500'}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {session?.user?.name && (
          <span className="font-medium hidden sm:inline">
            Welcome, {session.user.name}
          </span>
        )}
        {session && (
          <button
            onClick={handleLogout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
