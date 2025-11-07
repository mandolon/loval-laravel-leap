import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Avatar gradient options
const AVATAR_OPTIONS = [
  'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(200, 70%, 60%) 0%, hsl(240, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(140, 70%, 60%) 0%, hsl(180, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(40, 70%, 60%) 0%, hsl(80, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(0, 70%, 60%) 0%, hsl(40, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(160, 70%, 60%) 0%, hsl(200, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(320, 70%, 60%) 0%, hsl(0, 80%, 65%) 100%)',
  'linear-gradient(135deg, hsl(260, 70%, 60%) 0%, hsl(300, 80%, 65%) 100%)',
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleConfirmAvatar = async () => {
    setLoading(true);
    try {
      // Update user avatar
      const { error: userError } = await supabase
        .from('users')
        .update({ avatar_url: selectedAvatar })
        .eq('id', user?.id);

      if (userError) throw userError;

      // Update user preferences to mark onboarding as completed
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .update({ onboarding_completed: true })
        .eq('user_id', user?.id);

      if (prefsError) throw prefsError;

      // Update local user state
      await updateUser({ avatar_url: selectedAvatar });

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 1 && "Welcome to the Team! 👋"}
            {step === 2 && "Choose Your Avatar"}
            {step === 3 && "All Set! 🎉"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Let's get you set up"}
            {step === 2 && "Pick a color that represents you"}
            {step === 3 && "You're ready to start"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Welcome Question */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-lg">Hi <span className="font-semibold">{user?.name}</span>!</p>
                <p className="text-muted-foreground">
                  We're excited to have you on board. Let's personalize your profile in just a few quick steps.
                </p>
                {/* ADD YOUR CUSTOM QUESTION/CONTENT HERE */}
                <div className="bg-muted p-6 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This is where you can add your custom question or content.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleNext} size="lg">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Avatar Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Select an avatar color that suits your style
                </p>
                <div className="grid grid-cols-4 gap-4">
                  {AVATAR_OPTIONS.map((gradient, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAvatar(gradient)}
                      className={`aspect-square rounded-full transition-all ${
                        selectedAvatar === gradient
                          ? 'ring-4 ring-primary ring-offset-4 ring-offset-background scale-110'
                          : 'hover:scale-105 opacity-70 hover:opacity-100'
                      }`}
                      style={{ background: gradient }}
                      aria-label={`Avatar option ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="flex justify-center pt-4">
                  <div
                    className="w-32 h-32 rounded-full shadow-lg flex items-center justify-center text-4xl font-bold text-white"
                    style={{ background: selectedAvatar }}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button onClick={handleBack} variant="outline" disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleConfirmAvatar} size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div
                    className="w-32 h-32 rounded-full shadow-lg flex items-center justify-center text-4xl font-bold text-white"
                    style={{ background: selectedAvatar }}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <p className="text-lg font-medium">Perfect, {user?.name}!</p>
                <p className="text-muted-foreground">
                  Your profile is all set up. You're ready to start collaborating with your team.
                </p>
              </div>
              <div className="flex justify-center">
                <Button onClick={handleComplete} size="lg" className="px-8">
                  Get Started
                </Button>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex justify-center gap-2 pt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step
                    ? 'w-8 bg-primary'
                    : s < step
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
