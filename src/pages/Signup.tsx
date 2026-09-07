import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, CheckCircle2, AlertCircle, Mic, Headphones, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailOnlySchema = z.string()
  .trim()
  .email("Invalid email address")
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format")
  .max(255);

const DIALECT_OPTIONS = [
  "Kĩ-mũrang'a",
  "Gi-gabete",
  "kĩ-ndia/gĩ-gĩchũgũ",
  "kĩ-mathĩra",
] as const;

const STEPS = [
  { number: 1, title: "Personal Info", subtitle: "Tell us about yourself" },
  { number: 2, title: "Contact", subtitle: "How to reach you" },
  { number: 3, title: "Profile", subtitle: "Your preferences" },
  { number: 4, title: "Security", subtitle: "Secure your account" },
];

// Per-step validation schemas
const step1Schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50).regex(/^[a-zA-Z\s\-']+$/, "Invalid characters in name"),
  lastName: z.string().trim().min(1, "Last name is required").max(50).regex(/^[a-zA-Z\s\-']+$/, "Invalid characters in name"),
  age: z.number({ required_error: "Age is required", invalid_type_error: "Age must be a number" })
    .int("Age must be a whole number").min(18, "You must be at least 18").max(120, "Please enter a valid age"),
  gender: z.string().min(1, "Gender is required"),
});

const step2Schema = z.object({
  email: emailOnlySchema,
  phoneNumber: z.string().regex(/^[0-9]{9}$/, "Phone number must be exactly 9 digits").optional().or(z.literal("")),
});

const step3Schema = z.object({
  dialect: z.string().min(1, "Dialect is required"),
  accountType: z.enum(["recording_volunteer", "transcriber"], { required_error: "Please select an account type" }),
});

const step4Schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

export default function Signup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailValidity, setEmailValidity] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phoneNumber: "",
    age: "", gender: "", dialect: "",
    accountType: "" as "" | "recording_volunteer" | "transcriber",
    password: "", confirmPassword: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        toast({ title: "Welcome!", description: "Your account has been created successfully." });
        navigate("/dashboard");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'email') {
      if (value.trim() === '') setEmailValidity('idle');
      else setEmailValidity(emailOnlySchema.safeParse(value).success ? 'valid' : 'invalid');
    }
  };

  const validateStep = (step: number): boolean => {
    const data = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber,
      age: formData.age ? parseInt(formData.age, 10) : undefined,
      gender: formData.gender,
      dialect: formData.dialect,
      accountType: formData.accountType || undefined,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    let result;
    switch (step) {
      case 1: result = step1Schema.safeParse(data); break;
      case 2: result = step2Schema.safeParse(data); break;
      case 3: result = step3Schema.safeParse(data); break;
      case 4: result = step4Schema.safeParse(data); break;
      default: return false;
    }

    if (!result.success) {
      toast({ title: "Please check your input", description: result.error.errors[0].message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const goToStep = (target: number) => {
    if (isAnimating) return;
    setDirection(target > currentStep ? 'forward' : 'backward');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(target);
      setIsAnimating(false);
    }, 250);
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    goToStep(currentStep + 1);
  };

  const handleBack = () => goToStep(currentStep - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            ...(formData.phoneNumber ? { phone_number: formData.phoneNumber } : {}),
            age: parseInt(formData.age, 10),
            gender: formData.gender,
            dialect: formData.dialect,
            account_type: formData.accountType,
          }
        }
      });

      if (error) {
        toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
        return;
      }
      if (data.user && !data.session) {
        toast({ title: "Check Your Email", description: "We've sent you a confirmation link." });
      } else {
        toast({ title: "Account Created!", description: "Your account has been created successfully." });
        navigate("/dashboard");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getIconColor = (fieldName: string) =>
    focusedField === fieldName || (formData as any)[fieldName]?.length > 0 ? 'text-primary' : 'text-muted-foreground';

  const baseInputStyles = "h-12 bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 shadow-sm rounded-xl border";
  const standardInputStyles = `${baseInputStyles} border-border focus:border-primary`;
  const labelClasses = "text-xs uppercase tracking-wider text-muted-foreground font-semibold ml-1";

  const getAnimationClass = () => {
    if (!isAnimating) return "opacity-100 translate-x-0";
    return direction === 'forward'
      ? "opacity-0 -translate-x-8"
      : "opacity-0 translate-x-8";
  };

  return (
    <AuthLayout title="Create Account" subtitle={STEPS[currentStep - 1].subtitle}>
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                    currentStep > step.number
                      ? 'bg-primary text-primary-foreground scale-100'
                      : currentStep === step.number
                      ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap transition-colors duration-300 ${
                  currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-5 relative overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: currentStep > step.number ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={`transition-all duration-300 ease-out ${getAnimationClass()}`}>
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className={labelClasses}>First Name</Label>
                  <div className={`relative transition-all duration-200 ${focusedField === 'firstName' ? 'scale-[1.01]' : ''}`}>
                    <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${getIconColor('firstName')}`} />
                    <Input id="firstName" placeholder="John" className={`${standardInputStyles} pl-11`}
                      value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)}
                      onFocus={() => setFocusedField('firstName')} onBlur={() => setFocusedField(null)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className={labelClasses}>Last Name</Label>
                  <div className={`relative transition-all duration-200 ${focusedField === 'lastName' ? 'scale-[1.01]' : ''}`}>
                    <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${getIconColor('lastName')}`} />
                    <Input id="lastName" placeholder="Doe" className={`${standardInputStyles} pl-11`}
                      value={formData.lastName} onChange={(e) => handleChange("lastName", e.target.value)}
                      onFocus={() => setFocusedField('lastName')} onBlur={() => setFocusedField(null)} required />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="age" className={labelClasses}>Age</Label>
                  <Input id="age" type="number" placeholder="e.g. 25" min={18} max={120}
                    className={standardInputStyles} value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    onFocus={() => setFocusedField('age')} onBlur={() => setFocusedField(null)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className={labelClasses}>Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                    <SelectTrigger className={`${standardInputStyles} px-3`} aria-label="Select gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="email" className={labelClasses}>Email Address</Label>
                  {emailValidity === 'invalid' && <span className="text-[10px] font-medium text-destructive animate-in fade-in">Invalid format</span>}
                  {emailValidity === 'valid' && <span className="text-[10px] font-medium text-primary animate-in fade-in">Looks good</span>}
                </div>
                <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'scale-[1.01]' : ''}`}>
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${getIconColor('email')}`} />
                  <Input id="email" type="email" placeholder="you@company.com"
                    className={`${baseInputStyles} pl-11 pr-10 ${
                      focusedField === 'email'
                        ? emailValidity === 'valid' ? 'border-primary' : emailValidity === 'invalid' ? 'border-destructive' : 'border-primary'
                        : emailValidity === 'invalid' ? 'border-destructive' : 'border-border'
                    }`}
                    value={formData.email} onChange={(e) => handleChange("email", e.target.value)}
                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} required />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {emailValidity === 'valid' && <CheckCircle2 className="w-5 h-5 text-primary animate-in zoom-in duration-300" />}
                    {emailValidity === 'invalid' && <AlertCircle className="w-5 h-5 text-destructive animate-in zoom-in duration-300" />}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className={labelClasses}>Phone Number</Label>
                <div className={`relative transition-all duration-200 ${focusedField === 'phoneNumber' ? 'scale-[1.01]' : ''}`}>
                  <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-10 ${getIconColor('phoneNumber')}`} />
                  <div className="relative">
                    <div className="absolute left-11 top-1/2 -translate-y-1/2 flex items-center h-full">
                      <span className="text-sm font-medium text-muted-foreground border-r border-border pr-3 mr-3 h-6 flex items-center">+254</span>
                    </div>
                    <Input id="phoneNumber" type="tel" placeholder="712 345 678"
                      className={`${standardInputStyles} pl-[5.5rem]`}
                      value={formData.phoneNumber}
                      onChange={(e) => handleChange("phoneNumber", e.target.value.replace(/\D/g, ''))}
                      onFocus={() => setFocusedField('phoneNumber')} onBlur={() => setFocusedField(null)} maxLength={9} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Profile */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label htmlFor="dialect" className={labelClasses}>Dialect</Label>
                <Select value={formData.dialect} onValueChange={(v) => handleChange("dialect", v)}>
                  <SelectTrigger className={`${standardInputStyles} px-3`} aria-label="Select dialect">
                    <SelectValue placeholder="Select your dialect" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIALECT_OPTIONS.map((dialect) => (
                      <SelectItem key={dialect} value={dialect}>{dialect}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={labelClasses}>I want to sign up as</Label>
                <div className="flex gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formData.accountType === "recording_volunteer"}
                      onCheckedChange={() => handleChange("accountType", "recording_volunteer")} aria-label="Recording Volunteer" />
                    <Mic className={`w-4 h-4 ${formData.accountType === "recording_volunteer" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm text-foreground">Recording Volunteer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formData.accountType === "transcriber"}
                      onCheckedChange={() => handleChange("accountType", "transcriber")} aria-label="Transcriber" />
                    <Headphones className={`w-4 h-4 ${formData.accountType === "transcriber" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm text-foreground">Transcriber</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Security */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label htmlFor="password" className={labelClasses}>Password</Label>
                <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'scale-[1.01]' : ''}`}>
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${getIconColor('password')}`} />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters"
                    className={`${standardInputStyles} pl-11 pr-10`} value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className={labelClasses}>Confirm Password</Label>
                <div className={`relative transition-all duration-200 ${focusedField === 'confirmPassword' ? 'scale-[1.01]' : ''}`}>
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${getIconColor('confirmPassword')}`} />
                  <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter password"
                    className={`${standardInputStyles} pl-11 pr-10`} value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)} required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 space-y-4">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}
                className="h-12 px-5 rounded-xl font-semibold" disabled={isAnimating}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {currentStep < 4 ? (
              <Button type="button" onClick={handleNext}
                className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 rounded-xl text-primary-foreground"
                disabled={isAnimating}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit"
                className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 rounded-xl text-primary-foreground"
                disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : "Create Account"}
              </Button>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
