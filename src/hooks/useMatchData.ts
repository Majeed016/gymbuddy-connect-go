
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Profile, FitnessProfile, Match, MatchScore } from '@/types/supabase';
import { calculateMatchScore } from '@/utils/matchingUtils';

export const useMatchData = (userId: string | undefined) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState<MatchScore[]>([]);
  const [existingMatches, setExistingMatches] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userFitnessProfile, setUserFitnessProfile] = useState<FitnessProfile | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setDebugInfo(prev => [...prev, "No user logged in"]);
        return;
      }
      
      try {
        // Fetch user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          setDebugInfo(prev => [...prev, `Error fetching profile: ${profileError.message}`]);
          throw profileError;
        }
        
        setUserProfile(profileData);
        
        // Fetch user's fitness profile
        const { data: fitnessProfileData, error: fitnessProfileError } = await supabase
          .from('fitness_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (fitnessProfileError) {
          setDebugInfo(prev => [...prev, `Error fetching fitness profile: ${fitnessProfileError.message}`]);
          throw fitnessProfileError;
        }
        
        if (!fitnessProfileData) {
          setDebugInfo(prev => [...prev, "No fitness profile found for the user"]);
          toast({
            title: "Complete Your Profile",
            description: "Please complete your fitness profile to find matches.",
            variant: "destructive"
          });
          return;
        }
        
        const typedFitnessProfile: FitnessProfile = {
          ...fitnessProfileData,
          fitness_level: fitnessProfileData.fitness_level as 'beginner' | 'intermediate' | 'advanced',
          fitness_goal: fitnessProfileData.fitness_goal as 'bulking' | 'cutting' | 'maintenance' | 'endurance' | 'flexibility' | 'general'
        };
        
        setUserFitnessProfile(typedFitnessProfile);
        
        // Fetch all profiles
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', userId);
        
        if (allProfilesError) {
          setDebugInfo(prev => [...prev, `Error fetching profiles: ${allProfilesError.message}`]);
          throw allProfilesError;
        }
        
        // Fetch all fitness profiles
        const { data: allFitnessProfiles, error: allFitnessProfilesError } = await supabase
          .from('fitness_profiles')
          .select('*')
          .neq('id', userId);
        
        if (allFitnessProfilesError) {
          setDebugInfo(prev => [...prev, `Error fetching all fitness profiles: ${allFitnessProfilesError.message}`]);
          throw allFitnessProfilesError;
        }
        
        // Fetch existing matches to exclude from potential matches
        const { data: userMatches, error: userMatchesError } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
        
        if (userMatchesError) {
          setDebugInfo(prev => [...prev, `Error fetching matches: ${userMatchesError.message}`]);
          throw userMatchesError;
        }
        
        const processedExistingMatches = await Promise.all(
          userMatches.map(async (match) => {
            const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
            
            const otherUserProfile = allProfiles.find(profile => profile.id === otherUserId);
            
            const otherUserFitnessProfile = allFitnessProfiles.find(
              fitnessProfile => fitnessProfile.id === otherUserId
            );
            
            return {
              ...match,
              otherUser: otherUserProfile,
              otherUserFitnessProfile: otherUserFitnessProfile ? {
                ...otherUserFitnessProfile,
                fitness_level: otherUserFitnessProfile.fitness_level as 'beginner' | 'intermediate' | 'advanced',
                fitness_goal: otherUserFitnessProfile.fitness_goal as 'bulking' | 'cutting' | 'maintenance' | 'endurance' | 'flexibility' | 'general'
              } : null,
            };
          })
        );
        
        setExistingMatches(processedExistingMatches);
        
        const existingMatchUserIds = userMatches.flatMap(match => [match.user1_id, match.user2_id]);
        
        // Calculate compatibility scores for all potential matches
        const potentialMatchScores: MatchScore[] = [];
        
        for (const otherUserProfile of allProfiles) {
          // Skip users already matched with
          if (existingMatchUserIds.includes(otherUserProfile.id)) {
            continue;
          }
          
          // Find the fitness profile for this user
          const otherUserFitnessProfile = allFitnessProfiles.find(fp => fp.id === otherUserProfile.id);
          
          // Skip users without complete fitness profiles
          if (!otherUserFitnessProfile || 
              !otherUserFitnessProfile.fitness_level || 
              !otherUserFitnessProfile.fitness_goal ||
              otherUserFitnessProfile.fitness_style.length === 0) {
            continue;
          }
          
          const typedOtherFitnessProfile: FitnessProfile = {
            ...otherUserFitnessProfile,
            fitness_level: otherUserFitnessProfile.fitness_level as 'beginner' | 'intermediate' | 'advanced',
            fitness_goal: otherUserFitnessProfile.fitness_goal as 'bulking' | 'cutting' | 'maintenance' | 'endurance' | 'flexibility' | 'general'
          };
          
          // Calculate match score
          const matchScore = calculateMatchScore(
            profileData,
            typedFitnessProfile,
            otherUserProfile,
            typedOtherFitnessProfile
          );
          
          potentialMatchScores.push(matchScore);
        }
        
        // Filter out matches with very low compatibility
        const filteredMatches = potentialMatchScores.filter(match => match.compatibilityScore > 0.3);
        
        setDebugInfo(prev => [
          ...prev, 
          `Total potential users: ${allProfiles.length}`,
          `Users with fitness profiles: ${allFitnessProfiles.length}`,
          `Existing matches: ${userMatches.length}`,
          `Potential matches (before filtering): ${potentialMatchScores.length}`,
          `Potential matches (after filtering): ${filteredMatches.length}`,
          ...filteredMatches.map(m => `Match: ${m.profile?.username}, Score: ${m.compatibilityScore.toFixed(2)}, Reasons: ${m.matchReasons.length}`)
        ]);
        
        setPotentialMatches(filteredMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore));
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setDebugInfo(prev => [...prev, `Error: ${error.message}`]);
        toast({
          title: "Error",
          description: "Failed to load match data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, toast]);

  return {
    isLoading,
    potentialMatches,
    existingMatches,
    userProfile,
    userFitnessProfile,
    debugInfo,
    setExistingMatches,
    setPotentialMatches,
    setDebugInfo
  };
};

export default useMatchData;
