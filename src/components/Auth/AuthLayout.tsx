import { ReactNode, useState } from "react";
import { Mic, Shield, Cloud, Heart } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

// Aurora animation styles
const animationStyles = `
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;

const features = [
  { icon: Mic, label: "Voice Recording", description: "Share your health experiences" },
  { icon: Shield, label: "Secure & Private", description: "Your data is protected" },
  { icon: Cloud, label: "Cloud Synced", description: "Access anywhere, anytime" },
  { icon: Heart, label: "Health Focused", description: "Contributing to research" },
];

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen relative w-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
      <style>{animationStyles}</style>

      {/* Aurora Background */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-300/30 rounded-full blur-[100px] mix-blend-multiply animate-blob" />
        <div className="absolute top-[5%] right-[-5%] w-[35rem] h-[35rem] bg-indigo-200/40 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[10%] w-[40rem] h-[40rem] bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Logo with error handling */}
            <div className="flex justify-center mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
              {!logoError ? (
                <img
                  src="/DSAIL Health.png"
                  alt="JasinaHub"
                  className="h-16 w-auto drop-shadow-md"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="h-16 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-primary">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Mic className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-2xl font-bold">JasinaHub</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card */}
            <div className="bg-white/80 backdrop-blur-md border border-white/50 shadow-xl rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
              {children}
            </div>

            {/* Trust Badge */}
            <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <p className="text-xs text-gray-500">
                © 2026 DSAIL
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Branded Panel (Desktop Only) */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary via-blue-600 to-indigo-700 items-center justify-center p-12 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl -ml-48 -mb-48" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

          <div className="relative z-10 max-w-md text-white">
            {/* Tagline */}
            <div className="mb-12 animate-in fade-in slide-in-from-right-4 duration-700">
              <p className="text-blue-100 text-lg leading-relaxed">
                Join in contributing to health research through voice data collection.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={feature.label}
                  className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-right-4"
                  style={{ animationDelay: `${(index + 2) * 100}ms` }}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{feature.label}</h3>
                  <p className="text-blue-200 text-xs">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            {/* <div className="mt-10 flex gap-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
              <div>
                <p className="text-3xl font-bold">1000+</p>
                <p className="text-blue-200 text-sm">Contributors</p>
              </div>
              <div>
                <p className="text-3xl font-bold">50K+</p>
                <p className="text-blue-200 text-sm">Recordings</p>
              </div>
              <div>
                <p className="text-3xl font-bold">100%</p>
                <p className="text-blue-200 text-sm">Secure</p>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};
