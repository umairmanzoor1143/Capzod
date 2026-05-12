"use client";

import * as React from "react";
import Link from "next/link";
import {useParams, useRouter} from "next/navigation";
import {Loader2} from "lucide-react";
import {AppSidebar} from "@/components/layout/AppSidebar";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/components/auth/AuthProvider";
import {apiFetchMyStyles} from "@/lib/api";
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

  if (state.status === "loading") {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AppSidebar />
        <main className="flex-1 grid place-items-center">
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
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AppSidebar />
        <main className="flex-1 grid place-items-center p-6 text-center">
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
