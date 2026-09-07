import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  pullProgress,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const isReady = pullProgress >= 1;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        height: `${Math.min(pullDistance, threshold * 1.5)}px`,
        transition: isRefreshing ? 'none' : 'height 0.2s ease-out',
      }}
    >
      <div
        className={`
          w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200
          flex items-center justify-center transition-all duration-200
          ${isReady || isRefreshing ? 'scale-100 opacity-100' : 'scale-75 opacity-70'}
        `}
        style={{
          transform: `rotate(${pullProgress * 180}deg) scale(${0.75 + pullProgress * 0.25})`,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <ArrowDown
            className={`w-5 h-5 transition-colors ${
              isReady ? 'text-primary' : 'text-slate-400'
            }`}
          />
        )}
      </div>
    </div>
  );
};
