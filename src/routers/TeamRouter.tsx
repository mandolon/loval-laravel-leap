import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import TeamApp from "@/apps/team/TeamApp";
import OnboardingPage from "@/pages/OnboardingPage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function TeamRouter() {
  const { user } = useUser();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has completed onboarding
        const { data, error } = await supabase
          .from('user_preferences')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking onboarding status:', error);
        }

        // If no preferences exist or onboarding_completed is null/false, show onboarding
        const completed = data?.onboarding_completed ?? false;
        setOnboardingComplete(completed);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        // On error, assume onboarding is needed
        setOnboardingComplete(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user?.id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Show onboarding if not completed
  if (onboardingComplete === false) {
    return <OnboardingPage />;
  }

  // Show main team app if onboarding is completed
  return <TeamApp />;
}
