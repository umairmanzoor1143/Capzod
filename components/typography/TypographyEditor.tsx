"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RotateCcw, Type } from "lucide-react";
import type { TypographyOverrides } from "@/lib/subtitles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Sans (Arial)", value: "Arial, sans-serif" },
  { label: "Sans Bold (Arial Black)", value: "Arial Black, Impact, sans-serif" },
  { label: "Impact", value: "Impact, Arial Black, sans-serif" },
  { label: "Helvetica Neue", value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", Arial, sans-serif' },
  { label: "Gill Sans", value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { label: "Avenir", value: "Avenir, Montserrat, Arial, sans-serif" },
  { label: "Futura", value: "Futura, 'Trebuchet MS', Arial, sans-serif" },
  { label: "Century Gothic", value: '"Century Gothic", AppleGothic, sans-serif' },
  { label: "Franklin Gothic", value: '"Franklin Gothic Medium", Arial, sans-serif' },
  { label: "Optima", value: "Optima, Candara, sans-serif" },
  { label: "Segoe UI", value: '"Segoe UI", Arial, sans-serif' },
  { label: "Roboto", value: "Roboto, Arial, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Poppins", value: "Poppins, Arial, sans-serif" },
  { label: "Montserrat", value: "Montserrat, Arial, sans-serif" },
  { label: "Lato", value: "Lato, Arial, sans-serif" },
  { label: "Open Sans", value: '"Open Sans", Arial, sans-serif' },
  { label: "Nunito", value: "Nunito, Arial, sans-serif" },
  { label: "Raleway", value: "Raleway, Arial, sans-serif" },
  { label: "Bebas Neue", value: '"Bebas Neue", Impact, Arial Black, sans-serif' },
  { label: "Oswald", value: "Oswald, Impact, Arial Black, sans-serif" },
  { label: "Anton", value: "Anton, Impact, Arial Black, sans-serif" },
  { label: "Barlow Condensed", value: '"Barlow Condensed", Impact, Arial Black, sans-serif' },
  { label: "Serif (Georgia)", value: "Georgia, Times New Roman, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Garamond", value: "Garamond, Baskerville, serif" },
  { label: "Baskerville", value: "Baskerville, Georgia, serif" },
  { label: "Palatino", value: '"Palatino Linotype", Palatino, Georgia, serif' },
  { label: "Didot", value: "Didot, 'Bodoni 72', Georgia, serif" },
  { label: "Bodoni 72", value: '"Bodoni 72", Didot, Georgia, serif' },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Mono (Menlo)", value: "Menlo, Monaco, monospace" },
  { label: "Monaco", value: "Monaco, Menlo, monospace" },
  { label: "Consolas", value: "Consolas, Monaco, monospace" },
  { label: "SF Mono", value: '"SF Mono", Menlo, Monaco, monospace' },
  { label: "Andale Mono", value: '"Andale Mono", Menlo, Monaco, monospace' },
  { label: "Comic Sans", value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: "Chalkboard", value: '"Chalkboard SE", "Comic Sans MS", cursive' },
  { label: "Marker Felt", value: '"Marker Felt", fantasy' },
  { label: "Papyrus", value: "Papyrus, fantasy" },
  { label: "Copperplate", value: "Copperplate, 'Copperplate Gothic Light', fantasy" },
  { label: "Brush Script", value: '"Brush Script MT", cursive' },
  { label: "Snell Roundhand", value: '"Snell Roundhand", cursive' },
  { label: "American Typewriter", value: '"American Typewriter", Georgia, serif' },
  { label: "Hoefler Text", value: '"Hoefler Text", Georgia, serif' },
  { label: "Lucida Grande", value: '"Lucida Grande", "Lucida Sans Unicode", sans-serif' },
  { label: "System UI", value: "system-ui, -apple-system, sans-serif" },
];

const WEIGHTS = [400, 500, 600, 700, 800, 900, 950];
const TRANSFORMS: { label: string; value: NonNullable<TypographyOverrides["textTransform"]> }[] = [
  { label: "Aa", value: "none" },
  { label: "AA", value: "uppercase" },
  { label: "aa", value: "lowercase" },
  { label: "Aa", value: "capitalize" },
];
const ALIGNS: { label: string; value: NonNullable<TypographyOverrides["textAlign"]> }[] = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

const INHERIT = "__inherit__";

interface TypographyEditorProps {
  value: TypographyOverrides;
  onChange: (value: TypographyOverrides) => void;
  onReset?: () => void;
  inheritFrom?: TypographyOverrides;
  allowInherit?: boolean;
}

export function TypographyEditor({
  value,
  onChange,
  onReset,
  inheritFrom,
  allowInherit = false,
}: TypographyEditorProps) {
  const set = <K extends keyof TypographyOverrides>(key: K, v: TypographyOverrides[K]) =>
    onChange({ ...value, [key]: v });

  const clear = (key: keyof TypographyOverrides) => {
    const next: TypographyOverrides = { ...value };
    delete next[key];
    onChange(next);
  };

  const eff = (key: keyof TypographyOverrides) =>
    value[key] !== undefined ? value[key] : inheritFrom?.[key];

  return (
    <div className="space-y-4">
      <Section title="Font">
        <Row label="Family" overridden={value.fontFamily !== undefined} onClear={allowInherit ? () => clear("fontFamily") : undefined}>
          <Select
            value={(eff("fontFamily") as string) ?? (allowInherit ? INHERIT : "Arial, sans-serif")}
            onValueChange={(v) => (v === INHERIT ? clear("fontFamily") : set("fontFamily", v))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              {allowInherit && <SelectItem value={INHERIT}>Inherit</SelectItem>}
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs">
                  <span style={{ fontFamily: f.value }}>{f.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Weight" overridden={value.fontWeight !== undefined} onClear={allowInherit ? () => clear("fontWeight") : undefined}>
          <div className="flex gap-1 flex-wrap">
            {WEIGHTS.map((w) => {
              const active = eff("fontWeight") === w;
              return (
                <Button
                  key={w}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => set("fontWeight", w)}
                  className="h-7 min-w-[40px] px-2 text-[11px] font-bold rounded-md"
                  style={{ fontWeight: w }}
                >
                  {w}
                </Button>
              );
            })}
          </div>
        </Row>
      </Section>

      <Separator />

      <Section title="Size & Spacing">
        <SliderRow
          label="Size"
          unit="px"
          min={12}
          max={200}
          step={1}
          value={(eff("fontSize") as number) ?? 46}
          overridden={value.fontSize !== undefined}
          onChange={(v) => set("fontSize", v)}
          onClear={allowInherit ? () => clear("fontSize") : undefined}
        />
        <SliderRow
          label="Line Height"
          min={0.7}
          max={2}
          step={0.05}
          decimals={2}
          value={(eff("lineHeight") as number) ?? 1}
          overridden={value.lineHeight !== undefined}
          onChange={(v) => set("lineHeight", Number(v.toFixed(2)))}
          onClear={allowInherit ? () => clear("lineHeight") : undefined}
        />
        <SliderRow
          label="Letter Spacing"
          unit="px"
          min={-5}
          max={20}
          step={0.5}
          decimals={1}
          value={(eff("letterSpacing") as number) ?? 0}
          overridden={value.letterSpacing !== undefined}
          onChange={(v) => set("letterSpacing", v)}
          onClear={allowInherit ? () => clear("letterSpacing") : undefined}
        />
        <SliderRow
          label="Max Width"
          unit="%"
          min={20}
          max={100}
          step={1}
          value={(eff("maxWidthPercent") as number) ?? 88}
          overridden={value.maxWidthPercent !== undefined}
          onChange={(v) => set("maxWidthPercent", v)}
          onClear={allowInherit ? () => clear("maxWidthPercent") : undefined}
        />
      </Section>

      <Separator />

      <Section title="Layout">
        <Row label="Case" overridden={value.textTransform !== undefined} onClear={allowInherit ? () => clear("textTransform") : undefined}>
          <SegmentGroup
            options={TRANSFORMS}
            value={(eff("textTransform") as string) ?? "none"}
            onChange={(v) => set("textTransform", v as TypographyOverrides["textTransform"])}
          />
        </Row>

        <Row label="Align" overridden={value.textAlign !== undefined} onClear={allowInherit ? () => clear("textAlign") : undefined}>
          <SegmentGroup
            options={ALIGNS}
            value={(eff("textAlign") as string) ?? "center"}
            onChange={(v) => set("textAlign", v as TypographyOverrides["textAlign"])}
          />
        </Row>

        <Row label="Single Line" overridden={value.singleLine !== undefined} onClear={allowInherit ? () => clear("singleLine") : undefined}>
          <Toggle value={!!eff("singleLine")} onChange={(v) => set("singleLine", v)} />
        </Row>
      </Section>

      <Separator />

      <Section title="Color">
        <Row label="Text" overridden={value.color !== undefined} onClear={allowInherit ? () => clear("color") : undefined}>
          <ColorInput value={(eff("color") as string) ?? "#ffffff"} onChange={(v) => set("color", v)} />
        </Row>
        <Row label="Accent" overridden={value.accent !== undefined} onClear={allowInherit ? () => clear("accent") : undefined}>
          <ColorInput value={(eff("accent") as string) ?? "#facc15"} onChange={(v) => set("accent", v)} />
        </Row>
      </Section>

      {onReset && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full text-xs"
        >
          <RotateCcw className="size-3" /> Reset all
        </Button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wide text-muted-foreground">
        <Type className="size-3" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  children,
  overridden,
  onClear,
}: {
  label: string;
  children: React.ReactNode;
  overridden?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-600">{label}</span>
          {overridden && <Badge variant="soft" className="h-4 px-1.5 text-[9px] uppercase">override</Badge>}
        </div>
        {overridden && onClear && (
          <button
            onClick={onClear}
            className="text-[10px] font-semibold text-muted-foreground hover:text-primary"
          >
            inherit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  decimals = 0,
  overridden,
  onClear,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  overridden?: boolean;
  onClear?: () => void;
}) {
  return (
    <Row label={label} overridden={overridden} onClear={onClear}>
      <div className="flex items-center gap-2">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          className="flex-1"
        />
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(decimals))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-7 w-14 px-1.5 text-[11px] text-center font-mono tabular-nums"
        />
        {unit && <span className="text-[10px] text-muted-foreground font-medium w-3">{unit}</span>}
      </div>
    </Row>
  );
}

function SegmentGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-md border border-input bg-secondary/40 p-0.5">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          variant={value === o.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 h-6 px-2 rounded-sm text-[11px] font-semibold",
            value !== o.value && "bg-transparent text-muted-foreground hover:bg-background"
          )}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        value ? "bg-primary" : "bg-secondary"
      )}
      role="switch"
      aria-checked={value}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
          value ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 rounded-md border border-input bg-background p-0.5 cursor-pointer"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 flex-1 px-2 text-[11px] font-mono tabular-nums uppercase"
      />
    </div>
  );
}
