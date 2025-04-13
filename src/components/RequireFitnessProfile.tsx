
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RequireFitnessProfileProps = {
  children: ReactNode;
};

const RequireFitnessProfile = ({ children }: RequireFitnessProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasFitnessProfile, setHasFitnessProfile] = useState(false);

  useEffect(() => {
    const checkFitnessProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('fitness_profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        setHasFitnessProfile(!!data);
      } catch (error) {
        console.error('Error checking fitness profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFitnessProfile();
  }, [user]);

  useEffect(() => {
    if (!isLoading && !hasFitnessProfile) {
      navigate('/setup-fitness-profile');
    }
  }, [hasFitnessProfile, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!hasFitnessProfile) {
    return null;
  }

  return <>{children}</>;
};

export default RequireFitnessProfile;
