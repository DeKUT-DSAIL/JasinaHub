import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator = ({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) => {
  const requirements = useMemo(() => [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /[0-9]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 0) return { level: 0, label: "", color: "bg-gray-200" };
    if (metCount === 1) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (metCount === 2) return { level: 2, label: "Fair", color: "bg-orange-500" };
    if (metCount === 3) return { level: 3, label: "Good", color: "bg-yellow-500" };
    return { level: 4, label: "Strong", color: "bg-green-500" };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">Password strength</span>
          <span className={`text-xs font-semibold ${
            strength.level <= 1 ? 'text-red-600' : 
            strength.level === 2 ? 'text-orange-600' : 
            strength.level === 3 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                level <= strength.level ? strength.color : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {requirements.map((req, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 text-xs transition-all duration-200 ${
                req.met ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {req.met ? (
                <Check className="w-3 h-3 flex-shrink-0" />
              ) : (
                <X className="w-3 h-3 flex-shrink-0" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
