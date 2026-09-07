import { useState, useEffect } from "react";
import { WifiOff, Wifi, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator = ({ className }: OfflineIndicatorProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show "back online" message briefly
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium transition-all duration-300 animate-slide-down",
        isOnline 
          ? "bg-emerald-500 text-white" 
          : "bg-amber-500 text-amber-950",
        className
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" aria-hidden="true" />
          <span>You're back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          <span>You're offline. Some features may be unavailable.</span>
        </>
      )}
      <button
        onClick={() => setShowBanner(false)}
        className={cn(
          "ml-2 p-1 rounded-full transition-colors",
          isOnline ? "hover:bg-emerald-600" : "hover:bg-amber-600"
        )}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
