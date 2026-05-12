"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Captions, Code2, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiCheckAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavEntry = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: (pathname: string) => boolean;
};

const baseEntries: NavEntry[] = [
  {
    href: "/",
    label: "Editor",
    Icon: Captions,
    active: (p) => p === "/",
  },
  {
    href: "/community",
    label: "Community",
    Icon: Users,
    active: (p) => p === "/community" || p.startsWith("/community/"),
  },
  {
    href: "/styles/code",
    label: "Styles",
    Icon: Code2,
    active: (p) => p.startsWith("/styles/code"),
  },
];

const adminEntry: NavEntry = {
  href: "/admin/styles",
  label: "Admin",
  Icon: ShieldCheck,
  active: (p) => p.startsWith("/admin/styles"),
};

export function MobileAppNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    apiCheckAdmin().then((admin) => {
      if (mounted) setIsAdmin(admin);
    });
    return () => {
      mounted = false;
    };
  }, [user]);

  const entries = React.useMemo(
    () => (isAdmin ? [...baseEntries, adminEntry] : baseEntries),
    [isAdmin]
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/90 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {entries.map(({ href, label, Icon, active }) => {
          const on = active(pathname);
          return (
            <li key={href} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                className={cn(
                  "flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-colors",
                  on
                    ? "text-indigo-700"
                    : "text-slate-500 active:bg-slate-100/90"
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl transition-[background,box-shadow,color]",
                    on
                      ? "bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200/60"
                      : "text-slate-500"
                  )}
                >
                  <Icon className="size-[22px]" />
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
