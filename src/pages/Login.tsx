import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6).max(72),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        toast({
          title: "Welcome!",
          description: "You've been signed in successfully.",
        });
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validationResult = loginSchema.safeParse({ email: email.trim(), password });
      if (!validationResult.success) {
        toast({ title: "Validation Error", description: validationResult.error.errors[0].message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validationResult.data.email,
        password: validationResult.data.password,
      });
      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        return;
      }
      if (data.user) {
        toast({ title: "Welcome Back!", description: "Successfully logged in." });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = "h-12 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 shadow-sm rounded-xl border";

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your journey"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '50ms' }}>
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-500 font-semibold ml-1">
              Email Address
            </Label>
            <div className={`relative group motion-safe:transition-all duration-200 ${focusedField === 'email' ? 'scale-[1.01]' : ''}`}>
              <Mail 
                className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 motion-safe:transition-all duration-200 ${
                  focusedField === 'email' || email ? 'text-primary scale-110' : 'text-gray-400'
                }`}
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                className={`${inputStyles} pl-11`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms' }}>
            <div className="flex justify-between items-center ml-1">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 font-medium hover:underline transition-all"
              >
                Forgot password?
              </Link>
            </div>
            <div className={`relative group motion-safe:transition-all duration-200 ${focusedField === 'password' ? 'scale-[1.01]' : ''}`}>
              <Lock 
                className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 motion-safe:transition-all duration-200 ${
                  focusedField === 'password' || password ? 'text-primary scale-110' : 'text-gray-400'
                }`}
                aria-hidden="true"
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`${inputStyles} pl-11 pr-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 motion-safe:transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms' }}>
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 motion-safe:active:scale-[0.98] motion-safe:transition-all duration-200 shadow-lg shadow-primary/25 rounded-xl text-white"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Signing In...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </Button>
        </div>

        <div className="text-center pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms' }}>
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
