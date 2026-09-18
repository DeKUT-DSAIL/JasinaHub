import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper to determine redirect URL: always target jasinahub.vercel.app in production
  const getRedirectUrl = () => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      // If developing locally, redirect to localhost
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return `${origin}/update-password`;
      }
    }
    return "https://jasinahub.vercel.app/update-password";
  };

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResetRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const validation = emailSchema.safeParse(email.trim());
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const redirectTo = getRedirectUrl();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        }
      );

      if (resetError) throw resetError;

      setIsSubmitted(true);
      setResendCooldown(60);

      toast({
        title: "Reset link sent",
        description: "Check your email for the password reset link.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset link";
      setError(msg);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success Confirmation Screen
  if (isSubmitted) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle={`We've sent a password reset link to ${email}`}
      >
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Click the link in the email to reset your password on{" "}
              <strong className="text-gray-900">jasinahub.vercel.app</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              If you don't see it within a minute, please check your spam or junk folder.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resendCooldown > 0 || isLoading}
              onClick={() => handleResetRequest()}
              className="inline-flex items-center justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Email"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSubmitted(false);
                setError(null);
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Change Email Address
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Link
              to="/login"
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Initial Email Entry Screen
  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email address to receive a reset link"
    >
      <form onSubmit={handleResetRequest} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-900">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="pl-10 border-2 border-gray-200 focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
        </Button>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
