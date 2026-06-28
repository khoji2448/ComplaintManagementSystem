"use client";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import Sidebar from "../components/Navbar";
import { usePathname } from "next/navigation";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en">
      <head>
        <title>Complaint Management System</title>
        <meta name="description" content="Complaint Management System" />
      </head>
      <body
        className={`${inter.variable} ${grotesk.variable} ${jetbrains.variable} ${inter.className}`}
      >
        <SessionProvider>
          <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
            {!isLoginPage && <Sidebar />}
            <main
              className={
                isLoginPage
                  ? ""
                  : "pt-[56px] md:pt-0 md:pl-[248px]"
              }
            >
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
      </body>
    </html>
  );
}
