"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Captions, Code2, ShieldCheck, Users } from "lucide-react";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiCheckAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";
import Image from "next/image";

const baseNavItems = [
  { href: "/", label: "Editor", icon: Captions },
  { href: "/community", label: "Community", icon: Users },
  { href: "/styles/code", label: "Create Style", icon: Code2 },
];

const adminNavItem = {
  href: "/admin/styles",
  label: "Approvals",
  icon: ShieldCheck,
};

export function AppSidebar() {
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

  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <aside className="relative hidden w-[224px] shrink-0 flex-col border-r border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 py-6 lg:flex">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-200/60 to-transparent"
        aria-hidden
      />
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-5 transition-opacity hover:opacity-90">
      <Image src="/logo.png" alt="Speakzy" width={32} height={32} />
        <span className="text-[17px] font-bold tracking-tight text-slate-900">Capzod</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-[background,box-shadow,color]",
                active
                  ? "bg-white text-indigo-700 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <Icon size={17} strokeWidth={active ? 2.25 : 2} className="shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-200/60 px-3 pt-4">
        <AuthStatus />
      </div>
    </aside>
  );
}
