"use client";

import * as React from "react";
import {useRouter} from "next/navigation";
import type {User} from "@supabase/supabase-js";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {AppSidebar} from "@/components/layout/AppSidebar";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {StyleGalleryCard} from "@/components/styles/StyleGalleryCard";
import {supabase} from "@/lib/supabase/client";
import {fetchApprovedStyles, importCommunityStyle} from "@/lib/supabase/styles";
import type {CommunitySubtitleStyle} from "@/lib/community-styles";
import {cn} from "@/lib/utils";

type TabId = "all" | "trending" | "new" | "liked";
type SortId = "popular" | "newest" | "oldest" | "name";

const TABS: {id: TabId; label: string; icon: React.ComponentType<{className?: string}>}[] = [
  {id: "all", label: "All Styles", icon: Sparkles},
  {id: "trending", label: "Trending", icon: TrendingUp},
  {id: "new", label: "New", icon: Plus},
  {id: "liked", label: "Most Liked", icon: HeartIcon},
];

const SORT_OPTIONS: {id: SortId; label: string}[] = [
  {id: "popular", label: "Most Popular"},
  {id: "newest", label: "Newest"},
  {id: "oldest", label: "Oldest"},
  {id: "name", label: "Name (A–Z)"},
];

const PAGE_SIZE = 16;

function HeartIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  "viral-tiktok": "Kinetic",
  "neon-pop": "Neon",
  "clean-minimal": "Minimal",
  "bold-impact": "Bold",
  "cinematic": "Cinematic",
  "karaoke": "Karaoke",
  "retro": "Retro",
};

function getCategory(s: CommunitySubtitleStyle): string {
  return CATEGORY_LABELS[s.baseStyle] ?? "Other";
}

function isNew(s: CommunitySubtitleStyle): boolean {
  const days = (Date.now() - new Date(s.createdAt).getTime()) / 86_400_000;
  return days <= 7;
}

function pseudoLikes(s: CommunitySubtitleStyle): number {
  return 20 + (new Date(s.createdAt).getTime() % 480);
}
function pseudoDownloads(s: CommunitySubtitleStyle): number {
  return 100 + (new Date(s.createdAt).getTime() % 4900);
}

export default function CommunityPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [styles, setStyles] = React.useState<CommunitySubtitleStyle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState<string | null>(null);

  const [tab, setTab] = React.useState<TabId>("all");
  const [sort, setSort] = React.useState<SortId>("popular");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("All");
  const [page, setPage] = React.useState(1);

  const loadStyles = React.useCallback(async (userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const approved = await fetchApprovedStyles(userId);
      setStyles(approved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load community styles");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({data}) => {
      if (!mounted) return;
      setUser(data.user);
      loadStyles(data.user?.id);
    });
    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadStyles(session?.user?.id);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [loadStyles]);

  async function handleImport(style: CommunitySubtitleStyle) {
    if (!user) {
      router.push(`/auth?redirectTo=${encodeURIComponent("/community")}`);
      return;
    }
    setImporting(style.id);
    setError(null);
    try {
      await importCommunityStyle(style.id, user.id);
      setStyles((current) =>
        current.map((item) =>
          item.id === style.id
            ? {...item, imported: true, importedAt: new Date().toISOString()}
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import style");
    } finally {
      setImporting(null);
    }
  }

  // Stats
  const totalStyles = styles.length;

  // Categories
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of styles) {
      const c = getCategory(s);
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [styles]);

  // Filter + sort
  const visible = React.useMemo(() => {
    let list = styles;

    if (tab === "new") list = list.filter(isNew);
    if (tab === "trending") {
      list = [...list].sort((a, b) => pseudoDownloads(b) - pseudoDownloads(a));
    } else if (tab === "liked") {
      list = [...list].sort((a, b) => pseudoLikes(b) - pseudoLikes(a));
    }

    if (category !== "All") list = list.filter((s) => getCategory(s) === category);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.authorName.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }

    if (tab !== "trending" && tab !== "liked") {
      list = [...list].sort((a, b) => {
        if (sort === "newest")
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === "oldest")
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sort === "name") return a.name.localeCompare(b.name);
        return pseudoDownloads(b) - pseudoDownloads(a);
      });
    }

    return list;
  }, [styles, tab, category, query, sort]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, category, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-800">
      <AppSidebar />

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white shrink-0 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Community</h1>
              <p className="text-[12.5px] text-slate-500">
                Discover, preview, and import subtitle styles created by the community.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative hidden md:block">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search styles, creators, or tags..."
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
                className="h-9 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white"
              >
                <Plus className="size-3.5" />
                Create Style
              </Button>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Tabs */}
          <nav className="flex items-center gap-1 px-6">
            {TABS.map((t) => {
              const Icon = t.icon;
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
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </header>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-5">
            <div className="min-w-0 space-y-4">
              {error && (
                <div className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                  {error}
                </div>
              )}

              {/* Grid */}
              {loading ? (
                <div className="grid place-items-center py-20">
                  <Loader2 className="size-5 animate-spin text-slate-400" />
                </div>
              ) : pageItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <h2 className="text-base font-semibold text-slate-800">No styles match</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Try a different filter or clear your search.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pageItems.map((style) => {
                    const trending = pseudoDownloads(style) > 3500;
                    const fresh = isNew(style);
                    const badge = trending
                      ? ({label: "Trending", tone: "indigo"} as const)
                      : fresh
                        ? ({label: "New", tone: "fuchsia"} as const)
                        : undefined;
                    return (
                      <StyleGalleryCard
                        key={style.id}
                        style={style}
                        badge={badge}
                        action={{
                          kind: "import",
                          imported: Boolean(style.imported),
                          loading: importing === style.id,
                          onClick: () => handleImport(style),
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {!loading && visible.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[12px] text-slate-500">
                    Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                    {Math.min(page * PAGE_SIZE, visible.length)} of {visible.length} styles
                  </p>
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <aside className="hidden xl:block">
              <div className="sticky top-2 space-y-5">
                <FilterSection title="Sort by">
                  <Select value={sort} onValueChange={(v) => setSort(v as SortId)}>
                    <SelectTrigger className="h-9 text-[12.5px] font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-[12.5px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection title="Categories">
                  <ul className="space-y-0.5">
                    <CategoryRow
                      label="All Categories"
                      count={totalStyles}
                      active={category === "All"}
                      onClick={() => setCategory("All")}
                    />
                    {Object.entries(categoryCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, count]) => (
                        <CategoryRow
                          key={name}
                          label={name}
                          count={count}
                          active={category === name}
                          onClick={() => setCategory(name)}
                        />
                      ))}
                  </ul>
                </FilterSection>

                <FilterSection title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "highlight",
                      "kinetic",
                      "clean",
                      "neon",
                      "bold",
                      "minimal",
                      "glow",
                      "karaoke",
                    ].map((tag) => (
                      <Badge
                        key={tag}
                        variant="soft"
                        className="cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        {tag}
                      </Badge>
                    ))}
                    <button
                      type="button"
                      className="text-[11px] font-medium text-indigo-600 hover:underline"
                    >
                      + Show more
                    </button>
                  </div>
                </FilterSection>

                <FilterSection title="Style Type">
                  <CheckRow label="Animated" count={Math.round(totalStyles * 0.88)} defaultChecked />
                  <CheckRow label="Static" count={Math.max(0, totalStyles - Math.round(totalStyles * 0.88))} />
                </FilterSection>

                <FilterSection title="Availability">
                  <CheckRow label="Free" count={Math.round(totalStyles * 0.75)} defaultChecked />
                  <CheckRow label="Premium" count={Math.max(0, totalStyles - Math.round(totalStyles * 0.75))} />
                </FilterSection>
              </div>
            </aside>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function CheckRow({
  label,
  count,
  defaultChecked,
}: {
  label: string;
  count: number;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = React.useState(Boolean(defaultChecked));
  return (
    <label className="flex items-center justify-between px-1 py-1.5 cursor-pointer">
      <span className="text-[12.5px] text-slate-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[11px] tabular-nums text-slate-400">{count}</span>
        <span
          onClick={() => setChecked((c) => !c)}
          className={cn(
            "grid size-4 place-items-center rounded border transition-colors",
            checked
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-300 bg-white"
          )}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </span>
    </label>
  );
}

function FilterSection({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CategoryRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] transition-colors",
          active
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-slate-600 hover:bg-slate-100"
        )}
      >
        <span>{label}</span>
        <span className="text-[11px] text-slate-400 tabular-nums">{count}</span>
      </button>
    </li>
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

// (no extra footer)
