
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, X, Check, MapPin, Calendar, Clock, Activity, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Profile, FitnessProfile, Match, MatchScore } from '@/types/supabase';
import MatchCard from '@/components/MatchCard';
import { calculateMatchScore, getTopMatches, getFormattedTimeSlots, getFormattedDays } from '@/utils/matchingUtils';

const Matches = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState<MatchScore[]>([]);
  const [existingMatches, setExistingMatches] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userFitnessProfile, setUserFitnessProfile] = useState<FitnessProfile | null>(null);
  const [activeTab, setActiveTab] = useState('potential');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setDebugInfo(prev => [...prev, "No user logged in"]);
        return;
      }
      
      try {
        // Fetch user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
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
          .eq('id', user.id)
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
          .neq('id', user.id);
        
        if (allProfilesError) {
          setDebugInfo(prev => [...prev, `Error fetching profiles: ${allProfilesError.message}`]);
          throw allProfilesError;
        }
        
        // Fetch all fitness profiles
        const { data: allFitnessProfiles, error: allFitnessProfilesError } = await supabase
          .from('fitness_profiles')
          .select('*')
          .neq('id', user.id);
        
        if (allFitnessProfilesError) {
          setDebugInfo(prev => [...prev, `Error fetching all fitness profiles: ${allFitnessProfilesError.message}`]);
          throw allFitnessProfilesError;
        }
        
        // Fetch existing matches to exclude from potential matches
        const { data: userMatches, error: userMatchesError } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
        
        if (userMatchesError) {
          setDebugInfo(prev => [...prev, `Error fetching matches: ${userMatchesError.message}`]);
          throw userMatchesError;
        }
        
        const processedExistingMatches = await Promise.all(
          userMatches.map(async (match) => {
            const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
            
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
  }, [user, toast]);

  const handleMatchAction = async (matchUserId: string, action: 'accept' | 'reject') => {
    if (!user) return;
    
    try {
      if (action === 'accept') {
        // Find the match details
        const matchDetails = potentialMatches.find(m => m.userId === matchUserId);
        
        if (!matchDetails) {
          throw new Error("Match details not found");
        }
        
        // Create the match in the database
        const { error } = await supabase
          .from('matches')
          .insert({
            user1_id: user.id,
            user2_id: matchUserId,
            status: 'pending',
            compatibility_score: matchDetails.compatibilityScore,
          });
        
        if (error) throw error;
        
        toast({
          title: "Match Requested",
          description: "Match request has been sent!",
        });
        
        // Update the existing matches list
        const { data: newMatch, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('user1_id', user.id)
          .eq('user2_id', matchUserId)
          .single();
        
        if (matchError) throw matchError;
        
        setExistingMatches(prev => [...prev, {
          ...newMatch,
          otherUser: matchDetails.profile,
          otherUserFitnessProfile: matchDetails.fitnessProfile,
        }]);
      }
      
      // Remove the match from the potential matches list
      setPotentialMatches(prev => prev.filter(match => match.userId !== matchUserId));
      
    } catch (error: any) {
      console.error('Error processing match action:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMatchResponse = async (matchId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);
      
      if (error) throw error;
      
      setExistingMatches(prev => 
        prev.map(match => 
          match.id === matchId 
            ? { ...match, status: action === 'accept' ? 'accepted' : 'rejected' } 
            : match
        )
      );
      
      toast({
        title: action === 'accept' ? "Match Accepted" : "Match Rejected",
        description: action === 'accept' 
          ? "You've accepted the match request!" 
          : "You've rejected the match request.",
      });
    } catch (error: any) {
      console.error('Error responding to match:', error);
      toast({
        title: "Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Get top 3 matches unless showAllMatches is true
  const displayedMatches = showAllMatches 
    ? potentialMatches 
    : getTopMatches(potentialMatches, 3);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">Find Your Gym Buddy</h1>
      
      {debugInfo.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-4 overflow-auto max-h-60">
          <h3 className="font-bold mb-2">Debug Information:</h3>
          {debugInfo.map((info, index) => (
            <p key={index} className="text-xs text-gray-600">{info}</p>
          ))}
        </div>
      )}
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="potential">Potential Matches</TabsTrigger>
          <TabsTrigger value="existing">My Matches</TabsTrigger>
        </TabsList>
        
        <TabsContent value="potential">
          {displayedMatches.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedMatches.map(match => (
                  <MatchCard 
                    key={match.userId}
                    match={match}
                    onAccept={(userId) => handleMatchAction(userId, 'accept')}
                    onReject={(userId) => handleMatchAction(userId, 'reject')}
                  />
                ))}
              </div>
              
              {potentialMatches.length > 3 && (
                <div className="text-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllMatches(!showAllMatches)}
                    className="border-purple-200 text-purple-700"
                  >
                    {showAllMatches ? "Show Top 3 Matches" : `Show All Matches (${potentialMatches.length})`}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-gray-700 mb-2">No potential matches found</h3>
              <p className="text-gray-500">
                We couldn't find any potential gym buddies for you at the moment. 
                Check back later or adjust your fitness profile to find more matches.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="existing">
          {existingMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {existingMatches.map(match => (
                <Card key={match.id} className={`overflow-hidden ${
                  match.status === 'rejected' ? 'opacity-60' : ''
                }`}>
                  <CardHeader className="bg-purple-50 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-purple-200">
                          <AvatarImage src={match.otherUser?.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-700 text-white">
                            {match.otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{match.otherUser?.full_name || match.otherUser?.username}</CardTitle>
                          <p className="text-sm text-gray-500">@{match.otherUser?.username}</p>
                        </div>
                      </div>
                      {match.compatibility_score && (
                        <Badge className="bg-purple-600">
                          {Math.round(match.compatibility_score * 100)}% Match
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="mb-2">
                      {match.status === 'pending' && match.user2_id === user?.id && (
                        <Badge className="bg-yellow-100 text-yellow-800">Match Request Pending</Badge>
                      )}
                      {match.status === 'pending' && match.user1_id === user?.id && (
                        <Badge className="bg-yellow-100 text-yellow-800">Request Sent</Badge>
                      )}
                      {match.status === 'accepted' && (
                        <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      )}
                      {match.status === 'rejected' && (
                        <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      )}
                    </div>
                    
                    {match.otherUser?.bio && (
                      <p className="text-sm text-gray-700 mb-3">{match.otherUser.bio}</p>
                    )}
                    
                    {match.otherUserFitnessProfile && (
                      <>
                        <div className="flex items-center text-sm text-gray-600">
                          <Activity className="h-4 w-4 mr-2 text-purple-600" />
                          <span className="capitalize">{match.otherUserFitnessProfile.fitness_level} level</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2 text-purple-600" />
                          <span className="capitalize">Goal: {match.otherUserFitnessProfile.fitness_goal.replace('_', ' ')}</span>
                        </div>
                        
                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                          <div>
                            <span>{match.otherUserFitnessProfile.location}</span>
                            {match.otherUserFitnessProfile.gym_name && (
                              <span className="block text-xs mt-0.5 text-gray-500">
                                {match.otherUserFitnessProfile.gym_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    {match.status === 'pending' && match.user2_id === user?.id ? (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => handleMatchResponse(match.id, 'reject')}
                          className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-5 w-5 mr-1" /> Decline
                        </Button>
                        <Button 
                          onClick={() => handleMatchResponse(match.id, 'accept')}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Check className="h-5 w-5 mr-1" /> Accept
                        </Button>
                      </>
                    ) : match.status === 'accepted' ? (
                      <>
                        <Button 
                          variant="outline"
                          className="flex-1 mr-2"
                          onClick={() => window.location.href = `/chat?matchId=${match.id}`}
                        >
                          <MessageSquare className="h-5 w-5 mr-1" /> Message
                        </Button>
                        <Button 
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => window.location.href = `/schedule?matchId=${match.id}`}
                        >
                          <Calendar className="h-5 w-5 mr-1" /> Schedule
                        </Button>
                      </>
                    ) : (
                      <div className="w-full">
                        {match.status === 'pending' && (
                          <p className="text-sm text-center text-gray-500">Waiting for response...</p>
                        )}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-gray-700 mb-2">No matches yet</h3>
              <p className="text-gray-500">
                You haven't connected with any gym buddies yet.
                Go to the "Potential Matches" tab to find potential workout partners!
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Matches;
