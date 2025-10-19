import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters").max(255, "Password too long"),
  first_name: z.string().trim().min(1, "First name is required").max(50, "First name too long").optional(),
  last_name: z.string().trim().max(50, "Last name too long").optional(),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const validated = authSchema.parse({ email, password, first_name: firstName, last_name: lastName });
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: validated.first_name || validated.email.split('@')[0],
            last_name: validated.last_name || '',
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(signUpError.message);
        }
      } else {
        toast({
          title: "Account created!",
          description: "You can now sign in with your credentials.",
        });
        // Auto sign in after signup
        await handleSignIn(e, validated.email, validated.password);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent, emailOverride?: string, passwordOverride?: string) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const validated = authSchema.parse({ 
        email: emailOverride || email, 
        password: passwordOverride || password 
      });
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate("/");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(45rem 30rem at 50% 4%, hsl(215 75% 94%) 0%, hsl(220 35% 97%) 35%, hsl(0 0% 100%) 100%)'
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">
            {view === 'login' ? (
              <>
                Sign in or{' '}
                <button
                  onClick={() => setView('signup')}
                  className="text-[#3a78bd] hover:text-[#2c5e96] transition-colors"
                  type="button"
                >
                  create an account
                </button>
              </>
            ) : (
              <>
                Create an account or{' '}
                <button
                  onClick={() => setView('login')}
                  className="text-[#3a78bd] hover:text-[#2c5e96] transition-colors"
                  type="button"
                >
                  sign in
                </button>
              </>
            )}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={view === 'login' ? handleSignIn : handleSignUp} className="space-y-4">
          {/* Google OAuth Placeholder */}
          <button
            type="button"
            className="w-full h-9 flex items-center justify-center gap-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            disabled
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
              <path d="M8.99976 18C11.4298 18 13.467 17.1941 14.9561 15.8195L12.0475 13.5613C11.2416 14.1013 10.2107 14.4204 8.99976 14.4204C6.65567 14.4204 4.67158 12.8372 3.96385 10.71H0.957031V13.0418C2.43794 15.9831 5.48158 18 8.99976 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M8.99976 3.57955C10.3211 3.57955 11.5075 4.03364 12.4402 4.92545L15.0216 2.34409C13.4629 0.891818 11.4257 0 8.99976 0C5.48158 0 2.43794 2.01682 0.957031 4.95818L3.96385 7.29C4.67158 5.16273 6.65567 3.57955 8.99976 3.57955Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* First Name & Last Name (Signup only) */}
          {view === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-xs font-medium text-slate-700">
                  First name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5 h-8 text-[13px] border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs font-medium text-slate-700">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5 h-8 text-[13px] border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-xs font-medium text-slate-700">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-8 text-[13px] border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-xs font-medium text-slate-700">
              Password
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-[13px] pr-9 border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
                required
                disabled={loading}
                placeholder={view === 'signup' ? "At least 6 characters" : ""}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot Password (Login only) */}
          {view === 'login' && (
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-[#3a78bd] hover:text-[#2c5e96] transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !email || !password || (view === 'signup' && !firstName)}
            className="w-full h-9 bg-[#00639b] hover:bg-[#005480] text-white text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {view === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              view === 'login' ? 'Sign in' : 'Create account'
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="text-[#3a78bd] hover:text-[#2c5e96]">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-[#3a78bd] hover:text-[#2c5e96]">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
