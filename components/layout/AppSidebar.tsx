"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Captions, Code2, ShieldCheck, Users } from "lucide-react";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiCheckAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";

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
    <aside className="hidden lg:flex w-[220px] border-r border-slate-200 bg-white flex-col py-5 shrink-0">
      <Link href="/" className="flex items-center gap-2.5 mb-8 px-5">
        <div className="w-7 h-7 bg-indigo-600 text-white flex items-center justify-center rounded-md font-bold text-base">
          S
        </div>
        <span className="text-lg font-bold text-slate-900">Speakzy</span>
      </Link>

      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 rounded-md transition-colors text-sm font-medium",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3">
        <AuthStatus />
      </div>
    </aside>
  );
}
