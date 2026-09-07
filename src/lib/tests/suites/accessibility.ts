import { TestSuite, assert } from "../types";

function parseHsl(value: string): [number, number, number] | null {
  // Expects "H S% L%" tokens from CSS variables
  const m = value.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function relLum([r, g, b]: [number, number, number]) {
  const f = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]) {
  const la = relLum(a), lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const accessibilitySuite: TestSuite = {
  id: "accessibility",
  name: "Accessibility (a11y) Smoke Tests",
  description: "WCAG-aligned DOM checks on the currently rendered page.",
  tests: [
    {
      id: "images-have-alt",
      name: "All <img> elements have alt attribute",
      run: async () => {
        const imgs = Array.from(document.images);
        const missing = imgs.filter(i => !i.hasAttribute("alt"));
        assert(missing.length === 0, `${missing.length}/${imgs.length} images missing alt`);
        return { details: { totalImages: imgs.length } };
      },
    },
    {
      id: "buttons-accessible-name",
      name: "All <button> elements have an accessible name",
      run: async () => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const nameless = buttons.filter(b => {
          const text = (b.textContent || "").trim();
          const aria = b.getAttribute("aria-label");
          const labelledby = b.getAttribute("aria-labelledby");
          const title = b.getAttribute("title");
          return !text && !aria && !labelledby && !title;
        });
        assert(nameless.length === 0, `${nameless.length}/${buttons.length} buttons missing accessible name`);
        return { details: { totalButtons: buttons.length } };
      },
    },
    {
      id: "inputs-have-labels",
      name: "All form inputs have a label or aria-label",
      run: async () => {
        const inputs = Array.from(document.querySelectorAll("input, textarea, select"))
          .filter(el => (el as HTMLInputElement).type !== "hidden");
        const unlabelled = inputs.filter(el => {
          const id = el.getAttribute("id");
          const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
          const placeholder = el.getAttribute("placeholder");
          const labelMatch = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
          const wrappingLabel = el.closest("label");
          return !aria && !labelMatch && !wrappingLabel && !placeholder;
        });
        assert(unlabelled.length === 0, `${unlabelled.length}/${inputs.length} inputs unlabelled`);
        return { details: { totalInputs: inputs.length } };
      },
    },
    {
      id: "heading-hierarchy",
      name: "Heading hierarchy doesn't skip levels",
      run: async () => {
        const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
          .map(h => parseInt(h.tagName.substring(1), 10));
        const skips: string[] = [];
        for (let i = 1; i < headings.length; i++) {
          if (headings[i] - headings[i - 1] > 1) {
            skips.push(`h${headings[i - 1]} → h${headings[i]}`);
          }
        }
        assert(skips.length === 0, `Skipped levels: ${skips.join(", ")}`);
        return { details: { totalHeadings: headings.length } };
      },
    },
    {
      id: "primary-text-contrast",
      name: "Foreground/background contrast ≥ 4.5:1 (WCAG AA)",
      run: async () => {
        const styles = getComputedStyle(document.documentElement);
        const fg = parseHsl(styles.getPropertyValue("--foreground"));
        const bg = parseHsl(styles.getPropertyValue("--background"));
        assert(!!fg && !!bg, "Could not read --foreground / --background tokens");
        const ratio = contrastRatio(hslToRgb(...fg!), hslToRgb(...bg!));
        assert(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)}:1 (need 4.5:1)`);
        return { details: { ratio: ratio.toFixed(2) } };
      },
    },
    {
      id: "lang-attribute",
      name: "Document <html> has lang attribute",
      run: async () => {
        const lang = document.documentElement.getAttribute("lang");
        assert(!!lang, "Missing lang attribute on <html>");
        return { details: { lang } };
      },
    },
    {
      id: "viewport-meta",
      name: "Viewport meta tag present (mobile usability)",
      run: async () => {
        const meta = document.querySelector('meta[name="viewport"]');
        assert(!!meta, "Missing <meta name=\"viewport\">");
        return { details: { content: meta!.getAttribute("content") } };
      },
    },
  ],
};