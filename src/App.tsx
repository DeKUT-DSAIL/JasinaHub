import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { AdminRoute } from "@/components/Auth/AdminRoute";
import { AuthProvider } from "@/components/Auth/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { SkipToContent } from "@/components/ui/SkipToContent";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { PresenceTracker } from "@/components/PresenceTracker";
import { ThemeProvider } from "@/components/ThemeProvider";
import UpdatePassword from "./pages/UpdatePassword";

// Helper to retry dynamic imports on chunk load failures
const lazyRetry = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch(() => {
      // Force reload on stale chunk errors
      window.location.reload();
      return importFn();
    })
  );

// Lazy load pages for code splitting
const Login = lazyRetry(() => import("./pages/Login"));
const Signup = lazyRetry(() => import("./pages/Signup"));
const ForgotPassword = lazyRetry(() => import("./pages/ForgotPassword"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Questions = lazyRetry(() => import("./pages/Questions"));
const Completion = lazyRetry(() => import("./pages/Completion"));
const MyResponses = lazyRetry(() => import("./pages/MyResponses"));
const Admin = lazyRetry(() => import("./pages/Admin"));
const Docs = lazyRetry(() => import("./pages/Docs"));
const Transcribe = lazyRetry(() => import("./pages/Transcribe"));
const MyTranscriptions = lazyRetry(() => import("./pages/MyTranscriptions"));
const Feedback = lazyRetry(() => import("./pages/Feedback"));
const PrivacyPolicy = lazyRetry(() => import("./pages/PrivacyPolicy"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4" role="status" aria-label="Loading page">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SkipToContent />
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <PresenceTracker>
            <Suspense fallback={<PageLoader />}>
              <main id="main-content" tabIndex={-1} className="outline-none">
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/questions" element={<ProtectedRoute><Questions /></ProtectedRoute>} />
                  <Route path="/completion" element={<ProtectedRoute><Completion /></ProtectedRoute>} />
                  <Route path="/my-responses" element={<ProtectedRoute><MyResponses /></ProtectedRoute>} />
                  <Route path="/transcribe" element={<ProtectedRoute><Transcribe /></ProtectedRoute>} />
                  <Route path="/my-transcriptions" element={<ProtectedRoute><MyTranscriptions /></ProtectedRoute>} />
                  <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                  <Route path="/docs" element={<AdminRoute><Docs /></AdminRoute>} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </Suspense>
            </PresenceTracker>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
