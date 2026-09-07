import { useEffect, useRef, useState } from "react";

// Lazy-load mermaid (~1MB) only when a diagram actually renders. We memoise
// the import + initialise call so subsequent diagrams reuse the same module.
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: '"Source Serif 4", Georgia, serif',
        fontSize: 13,
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

interface MermaidDiagramProps {
  chart: string;
  caption: string;
  figureNumber: string;
}

export function MermaidDiagram({ chart, caption, figureNumber }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const renderChart = async () => {
      if (!containerRef.current) return;
      try {
        const mermaid = await getMermaid();
        if (cancelled || !containerRef.current) return;
        const id = `mermaid-${figureNumber.replace(/\s/g, "-")}-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (cancelled) return;
        console.error("Mermaid render error:", e);
        setError(String(e));
      }
    };

    renderChart();
    return () => {
      cancelled = true;
    };
  }, [chart, figureNumber]);

  return (
    <div className="my-6 p-4 bg-muted/20 rounded-lg border border-border mermaid-diagram-break">
      {error ? (
        <pre className="text-destructive text-xs overflow-auto">{error}</pre>
      ) : (
        <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
          <div
            ref={containerRef}
            className="flex justify-center [&_svg]:max-w-full"
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-3 italic text-center">
        {figureNumber}: {caption}
      </p>
    </div>
  );
}
