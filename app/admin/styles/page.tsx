"use client";

import * as React from "react";
import {useRouter} from "next/navigation";
import {Player, type PlayerRef} from "@remotion/player";
import {Check, Loader2, Play, RefreshCcw, ShieldCheck, X} from "lucide-react";
import {AuthStatus} from "@/components/auth/AuthStatus";
import {AppSidebar} from "@/components/layout/AppSidebar";
import {CommunityStylePreview} from "@/components/styles/CommunityStylePreview";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useAuth} from "@/components/auth/AuthProvider";
import {apiCheckAdmin, apiFetchPendingStyles, apiUpdateStyleStatus} from "@/lib/api";
import type {CommunitySubtitleStyle} from "@/lib/community-styles";
import {compileStyleCode} from "@/lib/compile-style-code";
import {CodeStyleVideo, type CodeStyleComponent} from "@/remotion/CodeStyleVideo";
import {sampleScript} from "@/lib/subtitles";
import {cn} from "@/lib/utils";

type AuthState = "checking" | "anonymous" | "not-admin" | "admin";

export default function StyleApprovalsPage() {
  const router = useRouter();
  const {user, loading: authLoading} = useAuth();
  const [authState, setAuthState] = React.useState<AuthState>("checking");
  const [styles, setStyles] = React.useState<CommunitySubtitleStyle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [workingId, setWorkingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = React.useMemo(() => styles.find((s) => s.id === selectedId) || null, [styles, selectedId]);

  const loadPending = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const pending = await apiFetchPendingStyles();
      setStyles(pending);
      setSelectedId((current) => { if (current && pending.some((s) => s.id === current)) return current; return pending[0]?.id ?? null; });
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load pending styles"); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    if (authLoading) return;
    let mounted = true;
    (async () => {
      if (!user) { router.replace("/auth?redirectTo=/"); return; }
      const admin = await apiCheckAdmin();
      if (!mounted) return;
      if (!admin) { router.replace("/"); return; }
      setAuthState("admin");
    })();
    return () => { mounted = false; };
  }, [user, authLoading, router]);

  React.useEffect(() => { if (authState === "admin") loadPending(); }, [authState, loadPending]);

  async function handleStatus(styleId: string, status: "approved" | "rejected") {
    setWorkingId(styleId); setError(null);
    try {
      await apiUpdateStyleStatus(styleId, status);
      setStyles((current) => { const next = current.filter((s) => s.id !== styleId); if (selectedId === styleId) setSelectedId(next[0]?.id ?? null); return next; });
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update style"); }
    finally { setWorkingId(null); }
  }

  if (authState === "checking") {
    return (<div className="flex h-[100dvh] max-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-indigo-50/35 text-slate-800"><AppSidebar /><main className="flex min-h-0 flex-1 items-center justify-center pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"><Loader2 className="size-5 animate-spin text-slate-400" /></main></div>);
  }
  if (authState !== "admin") {
    return (<div className="flex min-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-indigo-50/35"><main className="flex flex-1 items-center justify-center pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"><Loader2 className="size-5 animate-spin text-slate-400" /></main></div>);
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/35 text-slate-800">
      <AppSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <header className="flex min-h-[64px] shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 bg-white/85 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-5 lg:h-16 lg:flex-nowrap lg:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-white text-indigo-700 shadow-sm ring-1 ring-indigo-100">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight tracking-tight text-slate-900">Style Approvals</h1>
              <p className="text-[11px] leading-snug text-slate-500">
                Preview each submission and approve before publishing to community.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={loadPending} disabled={loading} className="h-8 text-xs">
              {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />}Refresh
            </Button>
            <AuthStatus compact />
          </div>
        </header>
        {error && (<div className="mx-5 mt-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 shrink-0">{error}</div>)}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="rounded-lg border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 p-0">
            <div className="h-10 px-4 border-b border-slate-100 flex items-center justify-between shrink-0"><span className="text-[12px] font-semibold text-slate-700">Pending ({styles.length})</span></div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1.5">
                {loading && (<div className="text-center text-xs text-slate-400 py-6"><Loader2 className="size-4 mx-auto animate-spin" /></div>)}
                {!loading && styles.length === 0 && (<div className="text-center text-xs text-slate-400 py-10">No pending styles.</div>)}
                {styles.map((style) => { const active = style.id === selectedId; return (
                  <button key={style.id} type="button" onClick={() => setSelectedId(style.id)} className={cn("w-full text-left rounded-md border px-3 py-2 transition-colors", active ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200" : "border-slate-200 bg-white hover:bg-slate-50")}>
                    <div className="flex items-start justify-between gap-2"><span className="text-[13px] font-semibold text-slate-800 truncate">{style.name}</span><span className="text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 shrink-0">{style.kind}</span></div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{style.description || "No description provided."}</p>
                    <p className="text-[10px] text-slate-400 mt-1">by {style.authorName}</p>
                  </button>); })}
              </div>
            </ScrollArea>
          </Card>
          <Card className="rounded-lg border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 p-0">
            {selected ? (<PreviewPanel style={selected} onApprove={() => handleStatus(selected.id, "approved")} onReject={() => handleStatus(selected.id, "rejected")} working={workingId === selected.id} />) : (<div className="flex-1 grid place-items-center text-sm text-slate-400">Select a submission to preview.</div>)}
          </Card>
        </div>
      </main>
    </div>
  );
}

function PreviewPanel({style, onApprove, onReject, working}: {style: CommunitySubtitleStyle; onApprove: () => void; onReject: () => void; working: boolean}) {
  const playerRef = React.useRef<PlayerRef>(null);
  const [Component, setComponent] = React.useState<CodeStyleComponent | null>(null);
  const [compileError, setCompileError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setComponent(null); setCompileError(null);
    if (style.kind !== "code" || !style.code) return;
    const result = compileStyleCode(style.code);
    if (result.ok) setComponent(() => result.Component);
    else setCompileError(result.error);
  }, [style.id, style.kind, style.code]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-slate-800">{style.name}</div>
          <div className="text-[10px] text-slate-500">
            {style.kind === "code" ? "Code style" : "Settings style"} · by {style.authorName}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onReject} disabled={working} className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800"><X className="size-3" />Reject</Button>
          <Button type="button" size="sm" onClick={onApprove} disabled={working} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">{working ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}Approve</Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5 space-y-4">
          <div className="relative aspect-video min-h-[200px] w-full max-w-full overflow-hidden rounded-md bg-slate-950 border border-slate-800">
            {style.kind === "code" ? (compileError ? (<div className="text-rose-300 text-xs font-mono p-4 max-w-full overflow-auto">Compile error: {compileError}</div>) : (
              <Player ref={playerRef} component={CodeStyleVideo} durationInFrames={300} fps={30} compositionWidth={1280} compositionHeight={720} style={{position: "absolute", inset: 0, width: "100%", height: "100%"}} inputProps={{text: sampleScript, background: "black", Component: Component ?? undefined}} controls loop acknowledgeRemotionLicense />
            )) : (<div className="w-full p-6"><CommunityStylePreview style={style} action="none" /></div>)}
          </div>
          <div className="grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
            <Meta label="Status" value={style.status} /><Meta label="Kind" value={style.kind} />
            <Meta label="Base style" value={style.baseStyle} /><Meta label="Submitted" value={new Date(style.createdAt).toLocaleString()} />
          </div>
          <div className="space-y-1"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</div><p className="text-[13px] text-slate-700 whitespace-pre-wrap">{style.description || "No description provided."}</p></div>
          {style.kind === "code" && style.code && (<div className="space-y-1"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source</div><pre className="rounded-md bg-[#1e1e2e] text-[#cdd6f4] text-[11.5px] font-mono p-3 max-h-72 overflow-auto whitespace-pre-wrap break-words">{style.code}</pre></div>)}
          {style.kind === "code" && !Component && !compileError && (<div className="flex items-center gap-2 text-xs text-slate-500"><Play className="size-3.5" />Compiling preview…</div>)}
        </div>
      </ScrollArea>
    </div>
  );
}

function Meta({label, value}: {label: string; value: string}) {
  return (<div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className="text-[12.5px] text-slate-700 font-medium truncate">{value}</div></div>);
}
