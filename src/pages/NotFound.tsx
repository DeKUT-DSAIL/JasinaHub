import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center glass-card p-8 sm:p-12 rounded-3xl max-w-md">
        <h1 className="mb-4 text-6xl sm:text-8xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg sm:text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="inline-block">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Return to Home
          </button>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
