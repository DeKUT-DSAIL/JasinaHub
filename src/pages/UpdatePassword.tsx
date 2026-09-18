import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if recovery session or auth session is already established
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    // Supabase fires PASSWORD_RECOVERY or SIGNED_IN event when recovery token is parsed
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // If no recovery session shows up after 6s, the link is considered invalid or expired
    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) setLinkInvalid(true);
        return r;
      });
    }, 6000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      setErrors({ password: passwordValidation.error.errors[0].message });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirm: "Passwords do not match" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      // Sign out recovery session so the user logs in cleanly with the new password
      await supabase.auth.signOut();

      toast({
        title: "Password updated successfully",
        description: "You can now log in with your new password.",
      });

      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setErrors({ password: message });
    } finally {
      setIsLoading(false);
    }
  };

  if (linkInvalid) {
    return (
      <AuthLayout title="Link Expired" subtitle="">
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div>
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Request New Reset Link
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout title="Verifying Link" subtitle="">
        <p className="text-sm text-gray-600 text-center">
          Verifying your secure password reset link…
        </p>
      </AuthLayout>
    );
  }

  const passwordMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const passwordStrength =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword);

  return (
    <AuthLayout title="Reset Your Password" subtitle="Enter your new password below">
      <form onSubmit={handlePasswordReset} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-sm font-medium text-gray-900">
            New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              className="pl-10 pr-10 border-2 border-gray-200 focus:border-primary"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {errors.password}
            </p>
          )}
          {newPassword && !errors.password && (
            <p
              className={`text-xs flex items-center gap-1 ${
                passwordStrength ? "text-green-600" : "text-gray-500"
              }`}
            >
              {passwordStrength ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              At least 8 characters with uppercase, lowercase, and number
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900">
            Confirm New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              className="pl-10 pr-10 border-2 border-gray-200 focus:border-primary"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {errors.confirm}
            </p>
          )}
          {confirmPassword && passwordMatch && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Passwords match
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading || !passwordMatch || !passwordStrength}
        >
          {isLoading ? "Updating Password..." : "Reset Password"}
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