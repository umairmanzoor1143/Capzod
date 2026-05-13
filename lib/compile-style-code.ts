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
 * The user has access to React, Remotion, common Remotion helpers, and
 * supported named imports from "react" and "remotion" in scope.
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

  const imports = collectSupportedImports(trimmed);

  // Normalize common module syntax that won't survive new Function.
  let prepared = stripSupportedImports(trimmed).replace(
    /export\s+default\s+/g,
    "return "
  );

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
      `"use strict";\n${buildScopePrelude(imports)}\n${compiled}`
    ) as (...args: unknown[]) => unknown;
  } catch (err) {
    return {ok: false, error: formatError(err)};
  }

  let result: unknown;
  try {
    result = factory(
      React,
      Remotion
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

type ImportBinding = {
  moduleName: "react" | "remotion";
  imported: string;
  local: string;
};

const COMMON_REMOTION_LOCALS = [
  "AbsoluteFill",
  "Audio",
  "Easing",
  "Img",
  "Sequence",
  "Video",
  "delayRender",
  "continueRender",
  "interpolate",
  "interpolateColors",
  "random",
  "spring",
  "staticFile",
  "useCurrentFrame",
  "useCurrentScale",
  "useVideoConfig",
];

const COMMON_REACT_LOCALS = [
  "Fragment",
  "useCallback",
  "useEffect",
  "useMemo",
  "useRef",
  "useState",
];

function stripSupportedImports(code: string) {
  return code
    .replace(/^\s*import\s+type\s+[^;]+;?\s*$/gm, "")
    .replace(/^\s*import\s+[^;]+from\s+["'](?:react|remotion)["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["'](?:react|remotion)["'];?\s*$/gm, "");
}

function collectSupportedImports(code: string): ImportBinding[] {
  const bindings: ImportBinding[] = [];
  const importRegex =
    /^\s*import\s+(.+?)\s+from\s+["'](react|remotion)["'];?\s*$/gm;

  for (const match of code.matchAll(importRegex)) {
    const clause = match[1]?.trim();
    const moduleName = match[2] as "react" | "remotion" | undefined;
    if (!clause || !moduleName) continue;

    const named = clause.match(/\{([^}]+)\}/);
    if (named) {
      for (const rawPart of named[1].split(",")) {
        const part = rawPart.trim();
        if (!part) continue;
        const [importedRaw, localRaw] = part.split(/\s+as\s+/i);
        const imported = importedRaw.trim();
        const local = (localRaw || imported).trim();
        if (isIdentifier(imported) && isIdentifier(local)) {
          bindings.push({moduleName, imported, local});
        }
      }
    }
  }

  return bindings;
}

function buildScopePrelude(imports: ImportBinding[]) {
  const declared = new Set<string>(["React", "Remotion"]);
  const lines: string[] = [];

  for (const name of COMMON_REMOTION_LOCALS) {
    if (!declared.has(name)) {
      declared.add(name);
      lines.push(`const ${name} = Remotion.${name};`);
    }
  }
  for (const name of COMMON_REACT_LOCALS) {
    if (!declared.has(name)) {
      declared.add(name);
      lines.push(`const ${name} = React.${name};`);
    }
  }

  for (const binding of imports) {
    if (declared.has(binding.local)) continue;
    declared.add(binding.local);
    const source = binding.moduleName === "remotion" ? "Remotion" : "React";
    lines.push(`const ${binding.local} = ${source}.${binding.imported};`);
  }

  return lines.join("\n");
}

function isIdentifier(value: string) {
  return /^[A-Za-z_$][\w$]*$/.test(value);
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    // Strip Babel's noisy "(line:col)" prefix for cleaner UI display.
    return err.message.replace(/^.*?:\s*/, "");
  }
  return String(err);
}
