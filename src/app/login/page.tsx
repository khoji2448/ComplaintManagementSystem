"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Field, TextInput } from "@/components/ui/Field";

// Resolve where to send the user after login: the originally requested page
// (callbackUrl), falling back to "/" which itself routes to their landing page.
function resolveDestination(): string {
  if (typeof window === "undefined") return "/";
  const cb = new URLSearchParams(window.location.search).get("callbackUrl");
  if (cb && cb.startsWith("/") && !cb.startsWith("/login")) return cb;
  return "/";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(resolveDestination());
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(result.error);
        return;
      } else if (result?.ok) {
        router.push(resolveDestination());
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[55%_45%]">
      {/* cinematic panel */}
      <div className="relative hidden md:block">
        <Image src="/images/banner.jpg" alt="" fill priority quality={100} className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <div className="font-mono-num text-[11px] uppercase tracking-[0.28em] text-white/70">
            Brick School · CMS
          </div>
          <div>
            <h1
              className="font-display font-bold leading-[0.95] tracking-[-0.03em] text-white"
              style={{ fontSize: "clamp(2.5rem, 4vw, 4rem)" }}
            >
              Every complaint,
              <br />
              accounted for.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-[1.6] text-white/70">
              Log it, track it, close it. The console keeps the whole building honest.
            </p>
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center bg-[var(--paper)] px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">Welcome back</div>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-[var(--ink)]">Sign in</h2>
          </div>

          {error && (
            <div className="mb-5 border border-[var(--signal)] bg-[var(--signal-soft)] px-3 py-2.5 text-sm text-[var(--ink)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username" htmlFor="email">
              <TextInput
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your username"
                required
                disabled={isLoading}
                className="bg-[var(--card)]"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <TextInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  disabled={isLoading}
                  className="bg-[var(--card)] !pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--mute)] transition-colors hover:text-[var(--ink)]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
              style={{ transitionTimingFunction: "var(--ease)" }}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" style={{ transitionTimingFunction: "var(--ease)" }} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
