"use client";

import * as React from "react";
import * as Babel from "@babel/standalone";
import * as Remotion from "remotion";
import type {CodeStyleComponent} from "@/remotion/CodeStyleVideo";

export type CompileResult =
  | {ok: true; Component: CodeStyleComponent; warnings: string[]}
  | {ok: false; error: string};

/**
 * Compile a JSX snippet that returns (or default-exports) a React component.
 * The user has access to React, Remotion, and standard hooks in scope.
 *
 * Accepted shapes:
 *   1. A bare arrow expression:  ({chunk}) => <div/>
 *   2. A function declaration:   function Caption(props){ return <div/> }
 *      followed by `return Caption;` at module bottom.
 *   3. `export default Caption;` (auto-rewritten to `return`).
 *
 * Security: code runs in the SAME origin via `new Function`. This is a
 * creator tool — the only risk surface is the author's own machine. Do
 * NOT eval untrusted styles authored by other users without sandboxing.
 */
export function compileStyleCode(code: string): CompileResult {
  const trimmed = code.trim();
  if (!trimmed) {
    return {ok: false, error: "Editor is empty."};
  }

  // Normalize common module syntax that won't survive new Function.
  let prepared = trimmed
    .replace(/export\s+default\s+/g, "return ")
    .replace(/^\s*import[^;]+;?\s*$/gm, "");

  // If the code is a pure expression (starts with `(` or an arrow), wrap it.
  const looksLikeExpression =
    /^[\s\n]*\(/.test(prepared) ||
    /^[\s\n]*\([^)]*\)\s*=>/.test(prepared) ||
    /^[\s\n]*function\s*\(/.test(prepared);

  // If user never wrote `return`, wrap the whole thing so the last expression
  // value is what we use.
  if (!/return\s/.test(prepared) && looksLikeExpression) {
    prepared = `return (${prepared});`;
  } else if (!/return\s/.test(prepared)) {
    return {
      ok: false,
      error:
        "Your code must return a React component. Add `return MyCaption;` at the end, or use `export default MyCaption;`.",
    };
  }

  let compiled: string;
  try {
    const out = Babel.transform(prepared, {
      presets: [["react", {runtime: "classic"}]],
      filename: "user-style.tsx",
      sourceMaps: false,
      // The compiled code runs as the body of `new Function(...)`, so a
      // top-level `return` is legal at runtime. Tell Babel's parser to
      // accept it instead of throwing a SyntaxError.
      parserOpts: {allowReturnOutsideFunction: true, sourceType: "script"},
      // Don't let Babel emit ESM helpers (import/export) into the output
      // since `new Function` cannot evaluate them.
      sourceType: "script",
    });
    compiled = out.code || "";
  } catch (err) {
    return {ok: false, error: formatError(err)};
  }

  let factory: (...args: unknown[]) => unknown;
  try {
    factory = new Function(
      "React",
      "Remotion",
      "useCurrentFrame",
      "useVideoConfig",
      "interpolate",
      "spring",
      "AbsoluteFill",
      "Sequence",
      `"use strict";\n${compiled}`
    ) as (...args: unknown[]) => unknown;
  } catch (err) {
    return {ok: false, error: formatError(err)};
  }

  let result: unknown;
  try {
    result = factory(
      React,
      Remotion,
      Remotion.useCurrentFrame,
      Remotion.useVideoConfig,
      Remotion.interpolate,
      Remotion.spring,
      Remotion.AbsoluteFill,
      Remotion.Sequence
    );
  } catch (err) {
    return {ok: false, error: formatError(err)};
  }

  if (typeof result !== "function") {
    return {
      ok: false,
      error:
        "The returned value is not a React component. Make sure you return a function (component).",
    };
  }

  return {ok: true, Component: result as CodeStyleComponent, warnings: []};
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    // Strip Babel's noisy "(line:col)" prefix for cleaner UI display.
    return err.message.replace(/^.*?:\s*/, "");
  }
  return String(err);
}
