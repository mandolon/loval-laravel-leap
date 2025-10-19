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
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Airy gradient — concentrated top, fade to white bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(45rem 30rem at 50% 4%, hsl(215 75% 94%) 0%, hsl(220 35% 97%) 35%, hsl(0 0% 100%) 100%)',
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <form onSubmit={view === 'login' ? handleSignIn : handleSignUp} className="w-full max-w-[440px]">
          {/* Header */}
          <div className="flex flex-col items-center text-center select-none">
            {view === 'login' ? (
              <>
                <h1 className="text-2xl font-semibold text-slate-800">Welcome back!</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('signup')}
                    className="text-[#3a78bd] hover:text-[#2c5e96] hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-slate-800">Seconds to sign up!</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-[#3a78bd] hover:text-[#2c5e96] hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}
          </div>

          {/* OAuth */}
          <div className="mt-8">
            <button
              type="button"
              className="h-10 w-full rounded-lg border border-slate-200 bg-transparent transition text-slate-700 text-sm font-medium relative inline-flex items-center justify-center hover:border-[#d2e3fc] hover:bg-[#f0f5fe] active:border-[#00639b]"
              disabled
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-4">
                <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                <path d="M8.99976 18C11.4298 18 13.467 17.1941 14.9561 15.8195L12.0475 13.5613C11.2416 14.1013 10.2107 14.4204 8.99976 14.4204C6.65567 14.4204 4.67158 12.8372 3.96385 10.71H0.957031V13.0418C2.43794 15.9831 5.48158 18 8.99976 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M8.99976 3.57955C10.3211 3.57955 11.5075 4.03364 12.4402 4.92545L15.0216 2.34409C13.4629 0.891818 11.4257 0 8.99976 0C5.48158 0 2.43794 2.01682 0.957031 4.95818L3.96385 7.29C4.67158 5.16273 6.65567 3.57955 8.99976 3.57955Z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Inputs */}
          <div className="mt-4 space-y-3">
            {view === 'signup' && (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  disabled={loading}
                  className="w-1/2 h-8 rounded-lg border bg-white text-[13px] text-slate-800 placeholder:text-slate-400 placeholder:text-[13px] px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  disabled={loading}
                  className="w-1/2 h-8 rounded-lg border bg-white text-[13px] text-slate-800 placeholder:text-slate-400 placeholder:text-[13px] px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
                />
              </div>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email"
              disabled={loading}
              className="w-full h-8 rounded-lg border bg-white text-[13px] text-slate-800 placeholder:text-slate-400 placeholder:text-[13px] px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
                className="w-full h-8 rounded-lg border bg-white text-[13px] text-slate-800 placeholder:text-slate-400 placeholder:text-[13px] pr-10 px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">{error}</div>
            )}
          </div>

          {/* Primary action */}
          <button
            type="submit"
            disabled={loading || !email || !password || (view === 'signup' && !firstName)}
            className="mt-5 h-9 w-full rounded-lg font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed bg-[#00639b] text-white hover:bg-[#005480] disabled:bg-slate-200 disabled:text-slate-400"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? (view === 'login' ? 'Signing in…' : 'Signing up…') : view === 'login' ? 'Log In' : 'Sign up with Email'}
          </button>

          {view === 'login' && (
            <div className="mt-3 text-center">
              <a href="#" className="text-sm text-[#3a78bd] hover:text-[#2c5e96] hover:underline">Forgot Password?</a>
            </div>
          )}

          {/* Footer */}
          <p className="mt-16 text-center text-[11px] text-slate-500">
            By continuing, you agree to our <a className="text-[#3a78bd] hover:text-[#2c5e96] hover:underline" href="#">Terms of Service</a> and <a className="text-[#3a78bd] hover:text-[#2c5e96] hover:underline" href="#">Privacy Policy</a>. Need help?
          </p>
        </form>
      </div>
    </div>
  );
}
