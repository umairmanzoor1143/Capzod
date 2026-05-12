"use client";

import * as React from "react";
import Link from "next/link";
import {useParams, useRouter} from "next/navigation";
import {Loader2} from "lucide-react";
import {AppSidebar} from "@/components/layout/AppSidebar";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/components/auth/AuthProvider";
import {apiFetchMyStyles, apiRecordStyleView} from "@/lib/api";
import type {CommunitySubtitleStyle} from "@/lib/community-styles";
import {CodeStyleEditor} from "../_components/CodeStyleEditor";

export default function EditCodeStylePage() {
  const params = useParams<{id: string}>();
  const router = useRouter();
  const id = params?.id;
  const {user, loading: authLoading} = useAuth();

  const [state, setState] = React.useState<
    | {status: "loading"}
    | {status: "anonymous"}
    | {status: "not-found"}
    | {status: "ready"; style: CommunitySubtitleStyle}
  >({status: "loading"});

  React.useEffect(() => {
    if (authLoading) return;
    let mounted = true;
    if (!id) return;
    (async () => {
      if (!user) {
        if (mounted) setState({status: "anonymous"});
        return;
      }
      try {
        const list = await apiFetchMyStyles();
        if (!mounted) return;
        const style = list.find((s) => s.id === id && s.kind === "code");
        if (!style) {
          setState({status: "not-found"});
          return;
        }
        setState({status: "ready", style});
      } catch (err) {
        console.error("load style", err);
        if (mounted) setState({status: "not-found"});
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, user, authLoading]);

  React.useEffect(() => {
    if (state.status !== "ready") return;
    if (typeof window === "undefined") return;
    const key = `styleView:${state.style.id}`;
    if (sessionStorage.getItem(key)) return;
    void apiRecordStyleView(state.style.id).then((ok) => {
      if (ok) sessionStorage.setItem(key, "1");
    });
  }, [state]);

  if (state.status === "loading") {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/35">
        <AppSidebar />
        <main className="flex min-h-0 flex-1 items-center justify-center pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </main>
      </div>
    );
  }

  if (state.status === "anonymous") {
    router.replace(`/auth?redirectTo=/styles/code/${id}`);
    return null;
  }

  if (state.status === "not-found") {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/35">
        <AppSidebar />
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] text-center lg:pb-6">
          <div className="space-y-3 max-w-sm">
            <h2 className="text-base font-semibold text-slate-800">Style not found</h2>
            <p className="text-sm text-slate-500">
              This style doesn&apos;t exist or you don&apos;t have access to edit it.
            </p>
            <Button asChild size="sm">
              <Link href="/styles/code">Back to my styles</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return <CodeStyleEditor mode="edit" initialStyle={state.style} />;
}
