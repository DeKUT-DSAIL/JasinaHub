import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

// Lazy-load mermaid (~1MB) only when a diagram actually renders.
let interactiveMermaidPromise: Promise<typeof import("mermaid").default> | null = null;

function getInteractiveMermaid() {
  if (!interactiveMermaidPromise) {
    interactiveMermaidPromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: '"Source Serif 4", Georgia, serif',
        fontSize: 16,
      });
      return mermaid;
    });
  }
  return interactiveMermaidPromise;
}

function createMermaidId(prefix: string, title: string) {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "diagram";

  return `${prefix}-${safeTitle}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface InteractiveMermaidDiagramProps {
  chart: string;
  title: string;
}

export function InteractiveMermaidDiagram({ chart, title }: InteractiveMermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [modalZoom, setModalZoom] = useState(1);

  const renderDiagram = useCallback(async (container: HTMLDivElement, prefix: string) => {
    try {
      const mermaid = await getInteractiveMermaid();
      const id = createMermaidId(prefix, title);
      const { svg } = await mermaid.render(id, chart);
      container.innerHTML = svg;
      setError(null);
    } catch (e) {
      console.error("Mermaid render error:", e);
      setError(String(e));
    }
  }, [chart, title]);

  useEffect(() => {
    if (!containerRef.current) return;
    renderDiagram(containerRef.current, "interactive-mermaid-inline");
  }, [renderDiagram]);

  useEffect(() => {
    if (!isFullscreen || !modalContainerRef.current) return;
    renderDiagram(modalContainerRef.current, "interactive-mermaid-modal");
  }, [isFullscreen, renderDiagram]);

  const handleZoomIn = useCallback((isModal: boolean) => {
    if (isModal) {
      setModalZoom((prev) => Math.min(prev + 0.25, 3));
    } else {
      setZoom((prev) => Math.min(prev + 0.25, 3));
    }
  }, []);

  const handleZoomOut = useCallback((isModal: boolean) => {
    if (isModal) {
      setModalZoom((prev) => Math.max(prev - 0.25, 0.5));
    } else {
      setZoom((prev) => Math.max(prev - 0.25, 0.5));
    }
  }, []);

  const handleResetZoom = useCallback((isModal: boolean) => {
    if (isModal) {
      setModalZoom(1);
    } else {
      setZoom(1);
    }
  }, []);

  const getSafeName = useCallback(() => {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "diagram"
    );
  }, [title]);

  const buildCleanSvg = useCallback((svgEl: SVGSVGElement) => {
    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    cloned.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    const bbox = svgEl.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(bbox.width));
    const height = Math.max(1, Math.ceil(bbox.height));
    cloned.setAttribute("width", String(width));
    cloned.setAttribute("height", String(height));
    if (!cloned.getAttribute("viewBox")) {
      cloned.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    // Replace foreignObject elements with native SVG <text> nodes to avoid
    // tainting the canvas during rasterisation.
    const svgNS = "http://www.w3.org/2000/svg";
    const liveForeignObjects = Array.from(svgEl.querySelectorAll("foreignObject"));
    const clonedForeignObjects = Array.from(cloned.querySelectorAll("foreignObject"));

    clonedForeignObjects.forEach((cfo, idx) => {
      const live = liveForeignObjects[idx];
      const sampleEl = (live?.querySelector("div, span, p") as HTMLElement | null) ?? null;
      const computed = sampleEl ? window.getComputedStyle(sampleEl) : null;

      const fontFamily = computed?.fontFamily || '"Source Serif 4", Georgia, serif';
      const fontSize = computed?.fontSize || "14px";
      const fontWeight = computed?.fontWeight || "normal";
      const color = computed?.color || "#1f2937";

      const text = (live?.textContent || cfo.textContent || "").trim();
      const foWidth = parseFloat(cfo.getAttribute("width") || "0") || 0;
      const foHeight = parseFloat(cfo.getAttribute("height") || "0") || 0;
      const foX = parseFloat(cfo.getAttribute("x") || "0") || 0;
      const foY = parseFloat(cfo.getAttribute("y") || "0") || 0;

      const textEl = document.createElementNS(svgNS, "text");
      textEl.setAttribute("x", String(foX + foWidth / 2));
      textEl.setAttribute("y", String(foY + foHeight / 2));
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("dominant-baseline", "middle");
      textEl.setAttribute("font-family", fontFamily);
      textEl.setAttribute("font-size", fontSize);
      textEl.setAttribute("font-weight", fontWeight);
      textEl.setAttribute("fill", color);

      // Wrap long lines naively by splitting on existing line breaks
      const lines = text.split(/\n+/).filter(Boolean);
      if (lines.length <= 1) {
        textEl.textContent = text;
      } else {
        const lineHeight = parseFloat(fontSize) * 1.2 || 16;
        const startY = foY + foHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
        textEl.setAttribute("y", String(startY));
        lines.forEach((line, i) => {
          const tspan = document.createElementNS(svgNS, "tspan");
          tspan.setAttribute("x", String(foX + foWidth / 2));
          if (i > 0) tspan.setAttribute("dy", String(lineHeight));
          tspan.textContent = line;
          textEl.appendChild(tspan);
        });
      }

      cfo.parentNode?.replaceChild(textEl, cfo);
    });

    const serialized = new XMLSerializer().serializeToString(cloned);
    return { serialized, width, height };
  }, []);

  const handleDownloadSvg = useCallback((sourceContainer: HTMLDivElement | null) => {
    if (!sourceContainer) return;
    const svgEl = sourceContainer.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) {
      toast({ title: "No diagram available to download", variant: "destructive" });
      return;
    }
    try {
      const { serialized } = buildCleanSvg(svgEl);
      const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getSafeName()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Diagram downloaded as SVG" });
    } catch (err) {
      console.error("Failed to export diagram as SVG:", err);
      toast({ title: "Failed to export diagram as SVG", variant: "destructive" });
    }
  }, [buildCleanSvg, getSafeName]);

  const handleDownloadPng = useCallback(async (sourceContainer: HTMLDivElement | null) => {
    if (!sourceContainer) return;
    const svgEl = sourceContainer.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) {
      toast({ title: "No diagram available to download", variant: "destructive" });
      return;
    }

    try {
      const { serialized, width, height } = buildCleanSvg(svgEl);

      // Use a base64 data URL — avoids blob-URL taint quirks in some browsers
      const encoded = window.btoa(unescape(encodeURIComponent(serialized)));
      const dataUrl = `data:image/svg+xml;base64,${encoded}`;

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load SVG for export"));
        img.src = dataUrl;
      });

      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast({ title: "Canvas not supported in this browser", variant: "destructive" });
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast({ title: "Failed to render PNG. Try SVG instead.", variant: "destructive" });
          return;
        }
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${getSafeName()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        toast({ title: "Diagram downloaded as PNG" });
      }, "image/png");
    } catch (err) {
      console.error("Failed to export diagram as PNG:", err);
      toast({ title: "PNG export failed. Try downloading as SVG instead.", variant: "destructive" });
    }
  }, [buildCleanSvg, getSafeName]);

  const ZoomControls = ({ isModal = false }: { isModal?: boolean }) => {
    const currentZoom = isModal ? modalZoom : zoom;

    return (
      <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut(isModal);
          }}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-mono min-w-[3ch] text-center text-muted-foreground">
          {Math.round(currentZoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn(isModal);
          }}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            handleResetZoom(isModal);
          }}
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`absolute top-2 right-2 z-10 flex items-center gap-2 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <ZoomControls />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 bg-background/90 backdrop-blur-sm shadow-md"
                onClick={(e) => e.stopPropagation()}
                aria-label="Download diagram"
                title="Download diagram"
              >
                <Download className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleDownloadPng(containerRef.current)}>
                Download as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadSvg(containerRef.current)}>
                Download as SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-background/90 backdrop-blur-sm shadow-md"
            onClick={() => {
              setIsFullscreen(true);
              setModalZoom(1);
            }}
            aria-label="View full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {error ? (
          <pre className="text-destructive text-xs overflow-auto">{error}</pre>
        ) : (
          <div
            className="overflow-auto cursor-grab active:cursor-grabbing bg-background rounded-lg border border-border p-4"
            style={{ maxHeight: "60vh" }}
          >
            <div
              ref={containerRef}
              className="flex justify-center [&_svg]:max-w-none transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
            />
          </div>
        )}
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Fullscreen interactive view for the {title} diagram.
          </DialogDescription>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium truncate">{title}</p>
            <div className="flex items-center gap-2">
              <ZoomControls isModal />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    aria-label="Download diagram"
                    title="Download diagram"
                  >
                    <Download className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownloadPng(modalContainerRef.current)}>
                    Download as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadSvg(modalContainerRef.current)}>
                    Download as SVG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(false)}
                aria-label="Exit full screen"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {error ? (
              <pre className="text-destructive text-xs overflow-auto">{error}</pre>
            ) : (
              <div
                ref={modalContainerRef}
                className="flex justify-center min-w-max [&_svg]:max-w-none transition-transform duration-200"
                style={{ transform: `scale(${modalZoom})`, transformOrigin: "center top" }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
