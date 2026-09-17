// One shared type per recurring attribute; attrs written to the DOM, null = attribute not set
// Kept apart from styles-schema.ts so a map module can describe its own layer's style, see src/modules
import { z } from "zod";

export const opacity = z.number().nullable();
export const color = z.string().nullable();
export const strokeWidth = z.number().nullable();
export const strokeDasharray = z.string().nullable().default(null);
export const strokeLinecap = z.string().nullable();
export const strokeLinejoin = z.string().nullable();
export const letterSpacing = z.number().nullable();
export const fontFamily = z.string();
export const fontWeight = z.number().int().min(100).max(950).nullable().default(null);
export const filter = z.string().nullable();
export const mask = z.string().nullable();
export const transform = z.string().nullable();
export const percentage = z.string().regex(/^-?\d+(\.\d+)?%$/);
export const fontSize = z.string(); // font sizes carry legacy dialects ("6%", "12px", "18"), so no format validator
export const styleAttr = z.string().nullable(); // CSSStyleDeclaration.cssText: text-shadow, text-transform and label shift transform live here

export const strokeAttrs = {
  stroke: color,
  "stroke-width": strokeWidth,
  "stroke-dasharray": strokeDasharray,
  "stroke-linecap": strokeLinecap
};
export const fillAttrs = { fill: color, "fill-opacity": opacity };
