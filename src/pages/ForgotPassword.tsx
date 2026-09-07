import { useState } from "react";
import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Eye, EyeOff, Lock, CheckCircle, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schemas
const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export default function ForgotPassword() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // Validate email format
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setErrors({ email: emailValidation.error.errors[0].message });
      setIsLoading(false);
      return;
    }

    // Move directly to password reset step
    // The edge function will verify if the user exists
    setStep("password");
    setIsLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // Validate password
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      setErrors({ password: passwordValidation.error.errors[0].message });
      setIsLoading(false);
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setErrors({ confirm: "Passwords do not match" });
      setIsLoading(false);
      return;
    }

    try {
      // Call edge function to reset password
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          email: email,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Password reset successful",
        description: "You can now login with your new password",
      });

      // Redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Password reset form
  if (step === "password") {
    const passwordMatch = newPassword && confirmPassword && newPassword === confirmPassword;
    const passwordStrength = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword);

    return (
      <AuthLayout
        title="Reset Your Password"
        subtitle={`Reset password for ${email}`}
      >
        <form onSubmit={handlePasswordReset} className="space-y-6">
          {/* New Password */}
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
              <div className="text-xs space-y-1">
                <p className={`flex items-center gap-1 ${passwordStrength ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordStrength ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  At least 8 characters with uppercase, lowercase, and number
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
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
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("email")}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Email
            </Button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  // Step 1: Email entry form
  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email address to continue"
    >
      <form onSubmit={handleEmailSubmit} className="space-y-6">
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
          {errors.email && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Continue"}
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