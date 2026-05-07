"use client";

import * as React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import type {User} from "@supabase/supabase-js";
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Filter,
  Loader2,
  LockKeyhole,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import {AppSidebar} from "@/components/layout/AppSidebar";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {StyleGalleryCard} from "@/components/styles/StyleGalleryCard";
import {supabase} from "@/lib/supabase/client";
import {fetchMyStyles, deleteMyStyle} from "@/lib/supabase/styles";
import type {CommunitySubtitleStyle} from "@/lib/community-styles";
import {cn} from "@/lib/utils";

type TabId = "all" | "approved" | "pending" | "rejected";

const TABS: {id: TabId; label: string}[] = [
  {id: "all", label: "All Styles"},
  {id: "approved", label: "Approved"},
  {id: "pending", label: "Pending"},
  {id: "rejected", label: "Rejected"},
];

const PAGE_SIZE = 16;

export default function MyCodeStylesPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [styles, setStyles] = React.useState<CommunitySubtitleStyle[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [tab, setTab] = React.useState<TabId>("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({data}) => {
      if (!mounted) return;
      setUser(data.user);
      setAuthLoading(false);
      if (data.user) {
        try {
          const list = await fetchMyStyles(data.user.id);
          if (mounted) setStyles(list.filter((s) => s.kind === "code"));
        } catch (err) {
          console.error("fetchMyStyles", err);
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Stats
  const total = styles.length;

  // Filter
  const visible = React.useMemo(() => {
    let list = styles;
    if (tab !== "all") list = list.filter((s) => s.status === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [styles, tab, query]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, query]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete(style: CommunitySubtitleStyle) {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Delete "${style.name}"? This cannot be undone and will remove the style for everyone who imported it.`
      );
      if (!ok) return;
    }
    setDeleting(style.id);
    setError(null);
    try {
      await deleteMyStyle(style.id);
      setStyles((current) => current.filter((s) => s.id !== style.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete style");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-800">
      <AppSidebar />

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white shrink-0 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="size-4 text-indigo-600" />
                My Code Styles
              </h1>
              <p className="text-[12.5px] text-slate-500">
                Manage, edit, and resubmit your custom subtitle styles.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative hidden md:block">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your styles..."
                  className="pl-8 h-9 w-72 text-[12.5px]"
                />
              </div>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="size-3.5" />
                Filters
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/styles/code/new")}
                disabled={!user}
                className="h-9 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white"
              >
                <Plus className="size-3.5" />
                Create New
              </Button>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Tabs */}
          <nav className="flex items-center gap-1 px-6">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors",
                    active
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </header>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 space-y-4">
            {!authLoading && !user ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <LockKeyhole className="size-6 mx-auto text-slate-400" />
                <h2 className="mt-3 text-base font-semibold text-slate-800">
                  Sign in to create styles
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Sign in to publish and manage your custom subtitle styles.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/auth?redirectTo=/styles/code">Sign in</Link>
                </Button>
              </div>
            ) : loading ? (
              <div className="grid place-items-center py-20">
                <Loader2 className="size-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {error && (
                  <div className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                    {error}
                  </div>
                )}
                {/* Grid */}
                {pageItems.length === 0 ? (
                  total === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                      <div className="size-12 mx-auto rounded-full bg-indigo-50 text-indigo-600 grid place-items-center">
                        <Sparkles className="size-5" />
                      </div>
                      <h2 className="mt-4 text-base font-semibold text-slate-800">
                        You haven&apos;t created any styles yet
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                        Build your own subtitle animation with React + Remotion and submit it
                        for the community.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => router.push("/styles/code/new")}
                        className="mt-5 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white"
                      >
                        <Plus className="size-3.5" />
                        Create New Style
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                      <h2 className="text-base font-semibold text-slate-800">
                        No styles match
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Try a different filter or clear your search.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pageItems.map((style) => {
                      const badge =
                        style.status === "approved"
                          ? ({label: "Live", tone: "emerald"} as const)
                          : style.status === "rejected"
                            ? ({label: "Rejected", tone: "rose"} as const)
                            : ({label: "Pending", tone: "amber"} as const);
                      return (
                        <StyleGalleryCard
                          key={style.id}
                          style={style}
                          badge={badge}
                          action={{
                            kind: "edit",
                            onClick: () => router.push(`/styles/code/${style.id}`),
                            onDelete: () => handleDelete(style),
                            deleting: deleting === style.id,
                          }}
                          onPreview={() => router.push(`/styles/code/${style.id}`)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {visible.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[12px] text-slate-500">
                      Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                      {Math.min(page * PAGE_SIZE, visible.length)} of {visible.length} styles
                    </p>
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages: (number | "…")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1, 2, 3);
    if (page > 4) pages.push("…");
    if (page > 3 && page < totalPages - 1) pages.push(page);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="size-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white grid place-items-center"
      >
        <ChevronLeft className="size-3.5" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-[12px] text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "size-7 rounded-md text-[12px] font-medium grid place-items-center transition-colors",
              p === page
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="size-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white grid place-items-center"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
