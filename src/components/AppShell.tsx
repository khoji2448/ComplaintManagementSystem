"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import Sidebar from "@/components/Navbar";
import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Client shell: holds the session provider, toast container, and the
// pathname-dependent layout. Kept separate so the root layout can remain a
// server component (enabling the metadata API and static HTML/body rendering).
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    // refetchOnWindowFocus disabled: JWT sessions don't need to re-hit
    // /api/auth/session every time the tab regains focus.
    <SessionProvider refetchOnWindowFocus={false}>
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        {!isLoginPage && <Sidebar />}
        <main className={isLoginPage ? "" : "pt-[56px] md:pt-0 md:pl-[248px]"}>
          <div className={isLoginPage ? "" : "p-4 md:p-8"}>{children}</div>
        </main>
      </div>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar
        closeButton={false}
        theme="light"
        toastClassName="!rounded-none !border !border-[var(--hairline)] !bg-[var(--card)] !text-[var(--ink)] !shadow-[0_8px_32px_rgba(14,17,22,0.12)] font-[inherit]"
      />
    </SessionProvider>
  );
}
