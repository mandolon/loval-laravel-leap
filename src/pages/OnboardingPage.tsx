import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { AVATAR_COLORS } from "@/constants/avatarColors";

// Utility: robust initials (first + last) from a full name
function getInitials(name?: string) {
  const safe = (name || " ").trim().replace(/\s+/g, " ");
  if (!safe) return "PW";
  const parts = safe.split(" ");
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  const combo = (first + last).toUpperCase();
  return combo || "PW";
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  const handleJoin = () => {
    setJoining(true);
    setTimeout(() => {
      setJoining(false);
      setStep(2);
    }, 800);
  };

  const handleConfirmProfile = async () => {
    setLoading(true);
    try {
      // Update user avatar and title
      const { error: userError } = await supabase
        .from('users')
        .update({ avatar_url: selectedAvatar, title })
        .eq('id', user?.id);

      if (userError) throw userError;

      // Update user preferences to mark onboarding as completed
      // Note: This will fail gracefully if migration hasn't been applied yet
      try {
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .update({ onboarding_completed: true })
          .eq('user_id', user?.id);

        if (prefsError) {
          console.warn('Could not update onboarding_completed (migration may not be applied):', prefsError);
        }
      } catch (prefsError) {
        // Silently continue if column doesn't exist yet
        console.warn('Onboarding tracking not available yet');
      }

      // Update local user state
      await updateUser({ avatar_url: selectedAvatar, title });

      setStep(3);
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save your preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    // Get first workspace and navigate to team dashboard
    const fetchAndNavigate = async () => {
      try {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (workspace?.id) {
          navigate(`/team/workspace/${workspace.id}`, { replace: true });
        } else {
          navigate('/team/workspace', { replace: true });
        }
      } catch (error) {
        console.error('Error navigating:', error);
        navigate('/team/workspace', { replace: true });
      }
    };

    fetchAndNavigate();
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Airy gradient — concentrated top, fade to white bottom (matches auth) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45rem 30rem at 50% 4%, hsl(215 75% 94%) 0%, hsl(220 35% 97%) 35%, hsl(0 0% 100%) 100%)",
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center select-none">
        {/* Step 1 — Join invite */}
        {step === 1 && (
          <div className="w-full max-w-[440px]">
            <p className="text-sm text-slate-500 mb-4">Welcome, {user?.name?.split(' ')[0]}</p>
            <h1 className="text-lg font-medium text-slate-800">Join the PinerWorks Workspace</h1>
            <p className="text-sm text-slate-500 mt-2">Invited by Armando Lopez (armando@rehome.build)</p>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-6 h-9 w-full rounded-lg font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed bg-[#202020] text-white hover:bg-[#111]"
            >
              {joining && <Loader2 className="h-4 w-4 animate-spin" />}
              {joining ? "Joining workspace…" : "Join PinerWorks"}
            </button>

            <button
              onClick={handleJoin}
              className="mt-3 text-[13px] text-slate-500 hover:text-[#00639b] hover:underline transition"
            >
              Decline invite
            </button>
          </div>
        )}

        {/* Step 2 — Avatar + Title customization */}
        {step === 2 && (
          <div className="w-full max-w-[720px] flex flex-col md:flex-row items-start justify-center gap-10">
            {/* Left Section */}
            <div className="text-left max-w-[320px] w-full">
              <h1 className="text-xl font-semibold text-slate-800 mb-2">Let's personalize your experience</h1>
              <p className="text-sm text-slate-500 mb-6">Choose your avatar color and add your title.</p>

              <label className="text-sm font-medium text-slate-700 block mb-1">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Architect, Designer, etc."
                className="w-full h-8 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 px-3 outline-none hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc]"
              />

              <div className="mt-6">
                <label className="text-sm font-medium text-slate-700 block mb-2">Avatar Color</label>
                <div className="grid grid-cols-6 gap-3">
                  {AVATAR_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAvatar(color)}
                      className={`h-10 w-10 rounded-full border-2 transition hover:scale-105 ${
                        selectedAvatar === color ? "border-[#00639b] ring-2 ring-[#9ecafc]" : "border-slate-200"
                      }`}
                      style={{ background: color }}
                      aria-label={`Avatar color ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleConfirmProfile}
                disabled={!selectedAvatar || !title || loading}
                className="mt-8 h-9 w-full rounded-lg font-semibold bg-[#00639b] text-white hover:bg-[#005480] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Saving…" : "Continue"}
              </button>
            </div>

            {/* Right Section — Avatar Preview */}
            <div className="flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-white shadow-sm p-8 w-[280px] h-[280px]">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-white font-semibold text-2xl"
                style={{ background: selectedAvatar }}
              >
                {initials}
              </div>
              <p className="mt-4 font-semibold text-slate-800">{user?.name}</p>
              <p className="text-sm text-slate-500 mt-1">{title ? `PinerWorks ${title}` : "PinerWorks Member"}</p>
            </div>
          </div>
        )}

        {/* Step 3 — Completion */}
        {step === 3 && (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-medium text-slate-800">All set!</h1>
            <p className="text-sm text-slate-500 mt-2">Your profile is ready. Welcome to PinerWorks.</p>
            <button
              onClick={handleComplete}
              className="mt-6 h-9 w-48 rounded-lg font-semibold bg-[#00639b] text-white hover:bg-[#005480]"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
