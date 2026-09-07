import { cn } from "@/lib/utils";

interface SkipToContentProps {
  targetId?: string;
  className?: string;
}

export const SkipToContent = ({ 
  targetId = "main-content",
  className 
}: SkipToContentProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "skip-link",
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200]",
        "bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "motion-safe:transition-all duration-200",
        className
      )}
      aria-label="Skip navigation and go to main content"
    >
      Skip to main content
    </a>
  );
};
