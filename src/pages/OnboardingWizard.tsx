import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVATAR_COLORS } from "@/apps/team/lib/settings-constants";
import { getAvatarInitials } from "@/utils/avatarUtils";

export default function OnboardingWizard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [workspace, setWorkspace] = useState<any>(null);
  const [workspaceCreator, setWorkspaceCreator] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const loadWorkspaceData = async () => {
    try {
      // Fetch first workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (workspaceError) {
        console.error("Error loading workspace:", workspaceError);
        return;
      }

      if (workspaceData) {
        setWorkspace(workspaceData);

        // Fetch workspace creator separately to avoid FK join issues
        const { data: memberData, error: memberError } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", workspaceData.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (memberError) {
          console.error("Error loading workspace member:", memberError);
        }

        if (memberData?.user_id) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("name, email")
            .eq("id", memberData.user_id)
            .single();

          if (userError) {
            console.error("Error loading user data:", userError);
          }

          if (userData) {
            setWorkspaceCreator(userData);
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error in loadWorkspaceData:", error);
    }
  };

  const handleComplete = async () => {
    if (!user || !selectedColor || !jobTitle.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          avatar_url: selectedColor,
          title: jobTitle.trim(),
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      await updateUser({
        avatar_url: selectedColor,
        title: jobTitle.trim(),
        onboarding_completed: true,
      });

      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify onboarding completion
      const { data: updatedProfile } = await supabase
        .from("users")
        .select("id, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!updatedProfile?.onboarding_completed) {
        throw new Error("Failed to update onboarding status");
      }

      // Navigate to workspace based on role
      if (workspace) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        const role = roleData?.role || "team";
        navigate(`/${role}/workspace/${workspace.short_id}`, { replace: true });
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const initials = getAvatarInitials(user.name);
  const canContinueStep2 = selectedColor && jobTitle.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(215,75%,94%)] via-[hsl(220,35%,97%)] to-white flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Step 1 - Workspace Invitation */}
        {step === 1 && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-foreground">
                Join the {workspace.name} Workspace
              </h1>
              <p className="text-lg text-muted-foreground">
                Invited by {workspaceCreator?.name || "Administrator"} ({workspaceCreator?.email || ""})
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={() => setStep(2)}
                className="bg-foreground text-background hover:bg-foreground/90 px-8 py-6 text-lg h-auto"
              >
                Join {workspace.name}
              </Button>
              <button
                onClick={() => setStep(2)}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Decline invite
              </button>
            </div>

            <div className="pt-8 text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        )}

        {/* Step 2 - Personalization */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8">
              {/* Left side - Form */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">
                    Personalize your profile
                  </h2>
                  <p className="text-muted-foreground">
                    Choose your avatar color and add your job title
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      placeholder="Architect, Designer, etc."
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Avatar Color</Label>
                    <div className="grid grid-cols-6 gap-3">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className="relative w-12 h-12 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          style={{ backgroundColor: color }}
                        >
                          {selectedColor === color && (
                            <Check className="absolute inset-0 m-auto w-6 h-6 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(3)}
                  disabled={!canContinueStep2}
                  className="w-full h-12 text-lg"
                >
                  Continue
                </Button>
              </div>

              {/* Right side - Preview */}
              <div className="flex items-center justify-center">
                <div className="bg-gradient-to-br from-background to-muted rounded-xl p-8 shadow-lg border">
                  <div className="space-y-6 text-center">
                    <div
                      className="w-32 h-32 rounded-full mx-auto flex items-center justify-center text-white text-4xl font-semibold"
                      style={{ backgroundColor: selectedColor || AVATAR_COLORS[0] }}
                    >
                      {initials}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-foreground">
                        {user.name}
                      </h3>
                      <p className="text-muted-foreground">
                        {workspace.name} {jobTitle.trim() ? jobTitle : "Member"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 text-xs text-center text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        )}

        {/* Step 3 - Completion */}
        {step === 3 && (
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-foreground">All set!</h1>
              <p className="text-lg text-muted-foreground">
                Welcome to {workspace.name}. You're ready to start collaborating with your team.
              </p>
            </div>

            <Button
              onClick={handleComplete}
              disabled={loading}
              className="px-8 py-6 text-lg h-auto"
            >
              {loading ? "Setting up..." : "Go to dashboard"}
            </Button>

            <div className="pt-8 text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
