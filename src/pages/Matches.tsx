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
import { Profile, FitnessProfile, Match } from '@/types/supabase';

type PotentialMatch = {
  id: string;
  profile: Profile;
  fitnessProfile: FitnessProfile;
  compatibilityScore: number;
};

const calculateCompatibilityScore = (
  userFitnessProfile: FitnessProfile,
  otherFitnessProfile: FitnessProfile
): number => {
  let score = 0;
  let totalFactors = 0;
  
  // Fitness level matching
  if (userFitnessProfile.fitness_level === otherFitnessProfile.fitness_level) {
    score += 1;
  }
  totalFactors += 1;
  
  // Fitness style matching
  const sharedStyles = userFitnessProfile.fitness_style.filter(style => 
    otherFitnessProfile.fitness_style.includes(style)
  );
  score += (sharedStyles.length / Math.max(userFitnessProfile.fitness_style.length, otherFitnessProfile.fitness_style.length)) * 3;
  totalFactors += 3;
  
  // Availability days matching
  const sharedDays = userFitnessProfile.availability_days.filter(day => 
    otherFitnessProfile.availability_days.includes(day)
  );
  score += (sharedDays.length / 7) * 2;
  totalFactors += 2;
  
  // Time slots matching
  const sharedTimeSlots = userFitnessProfile.preferred_time_slots.filter(slot => 
    otherFitnessProfile.preferred_time_slots.includes(slot)
  );
  score += (sharedTimeSlots.length / Math.max(userFitnessProfile.preferred_time_slots.length, otherFitnessProfile.preferred_time_slots.length)) * 2;
  totalFactors += 2;
  
  // Location and gym matching
  if (
    userFitnessProfile.gym_name && 
    otherFitnessProfile.gym_name && 
    userFitnessProfile.gym_name.toLowerCase() === otherFitnessProfile.gym_name.toLowerCase()
  ) {
    score += 2;
  } else if (
    userFitnessProfile.location.toLowerCase() === otherFitnessProfile.location.toLowerCase()
  ) {
    score += 1;
  }
  totalFactors += 2;
  
  // Fitness goal matching (added more weight)
  if (userFitnessProfile.fitness_goal === otherFitnessProfile.fitness_goal) {
    score += 3;
    totalFactors += 3;
  }
  
  return parseFloat((score / totalFactors).toFixed(2));
};

const getFormattedTimeSlots = (timeSlots: string[]): string[] => {
  const formatMap: Record<string, string> = {
    early_morning: "Early Morning (5am-8am)",
    morning: "Morning (8am-11am)",
    midday: "Midday (11am-2pm)",
    afternoon: "Afternoon (2pm-5pm)",
    evening: "Evening (5pm-8pm)",
    late_evening: "Late Evening (8pm-11pm)",
  };
  
  return timeSlots.map(slot => formatMap[slot] || slot);
};

const getFormattedDays = (days: string[]): string[] => {
  const formatMap: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };
  
  return days.map(day => formatMap[day] || day);
};

const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const Matches = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [existingMatches, setExistingMatches] = useState<any[]>([]);
  const [userFitnessProfile, setUserFitnessProfile] = useState<FitnessProfile | null>(null);
  const [activeTab, setActiveTab] = useState('potential');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setDebugInfo(prev => [...prev, "No user logged in"]);
        return;
      }
      
      try {
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
        
        // Fetch all fitness profiles except the current user's
        const { data: allFitnessProfiles, error: allFitnessProfilesError } = await supabase
          .from('fitness_profiles')
          .select('*')
          .neq('id', user.id);
        
        if (allFitnessProfilesError) {
          setDebugInfo(prev => [...prev, `Error fetching all fitness profiles: ${allFitnessProfilesError.message}`]);
          throw allFitnessProfilesError;
        }
        
        // Fetch corresponding profiles
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('*');
        
        if (allProfilesError) {
          setDebugInfo(prev => [...prev, `Error fetching profiles: ${allProfilesError.message}`]);
          throw allProfilesError;
        }
        
        // Fetch existing matches to exclude from potential matches
        const { data: userMatches, error: userMatchesError } = await supabase
          .from('matches')
          .select('*, profiles(*)')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
        
        if (userMatchesError) {
          setDebugInfo(prev => [...prev, `Error fetching matches: ${userMatchesError.message}`]);
          throw userMatchesError;
        }
        
        const processedExistingMatches = await Promise.all(
          userMatches.map(async (match) => {
            const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
            
            const otherUserProfile = allProfiles.find(profile => profile.id === otherUserId);
            
            const { data: otherUserFitnessProfile } = await supabase
              .from('fitness_profiles')
              .select('*')
              .eq('id', otherUserId)
              .single();
            
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
        
        // Filter out users already in matches and with completed profiles
        const availableProfiles = allFitnessProfiles.filter(
          profile => 
            !existingMatchUserIds.includes(profile.id) && 
            profile.fitness_level && 
            profile.fitness_goal && 
            profile.fitness_style.length > 0
        );
        
        setDebugInfo(prev => [
          ...prev, 
          `Total fitness profiles: ${allFitnessProfiles.length}`,
          `Existing match user IDs: ${existingMatchUserIds.join(', ')}`,
          `Available profiles: ${availableProfiles.length}`
        ]);
        
        const potentialMatchesWithScores = availableProfiles.map(fitnessProfile => {
          const profile = allProfiles.find(p => p.id === fitnessProfile.id);
          
          const typedFitnessProfile: FitnessProfile = {
            ...fitnessProfile,
            fitness_level: fitnessProfile.fitness_level as 'beginner' | 'intermediate' | 'advanced',
            fitness_goal: fitnessProfile.fitness_goal as 'bulking' | 'cutting' | 'maintenance' | 'endurance' | 'flexibility' | 'general'
          };
          
          const compatibilityScore = calculateCompatibilityScore(
            userFitnessProfile, 
            typedFitnessProfile
          );
          
          return {
            id: fitnessProfile.id,
            profile,
            fitnessProfile: typedFitnessProfile,
            compatibilityScore,
          };
        });
        
        // Filter out matches with very low compatibility
        const filteredMatches = potentialMatchesWithScores
          .filter(match => match.compatibilityScore > 0.3)
          .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        
        setDebugInfo(prev => [
          ...prev, 
          `Potential matches after filtering: ${filteredMatches.length}`,
          ...filteredMatches.map(m => `Match: ${m.profile?.username}, Score: ${m.compatibilityScore}`)
        ]);
        
        setPotentialMatches(filteredMatches);
      } catch (error: any) {
        console.error('Error fetching data:', error);
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
        const { error } = await supabase
          .from('matches')
          .insert({
            user1_id: user.id,
            user2_id: matchUserId,
            status: 'pending',
            compatibility_score: potentialMatches.find(m => m.id === matchUserId)?.compatibilityScore || 0,
          });
        
        if (error) throw error;
        
        toast({
          title: "Match Requested",
          description: "Match request has been sent!",
        });
      }
      
      setPotentialMatches(prev => prev.filter(match => match.id !== matchUserId));
      
      if (action === 'accept') {
        const { data: newMatch, error } = await supabase
          .from('matches')
          .select('*, profiles(*)')
          .eq('user1_id', user.id)
          .eq('user2_id', matchUserId)
          .single();
        
        if (error) throw error;
        
        const otherUserProfile = newMatch.profiles;
        
        const { data: otherUserFitnessProfile } = await supabase
          .from('fitness_profiles')
          .select('*')
          .eq('id', matchUserId)
          .single();
        
        setExistingMatches(prev => [...prev, {
          ...newMatch,
          otherUser: otherUserProfile,
          otherUserFitnessProfile,
        }]);
      }
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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">Find Your Gym Buddy</h1>
      {debugInfo.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
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
          {potentialMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {potentialMatches.map(match => (
                <Card key={match.id} className="overflow-hidden">
                  <CardHeader className="bg-purple-50 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-purple-200">
                          <AvatarImage src={match.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-700 text-white">
                            {match.profile?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{match.profile?.full_name || match.profile?.username}</CardTitle>
                          <p className="text-sm text-gray-500">@{match.profile?.username}</p>
                        </div>
                      </div>
                      <Badge className="bg-purple-600">
                        {Math.round(match.compatibilityScore * 100)}% Match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {match.profile?.bio && (
                      <p className="text-sm text-gray-700 mb-3">{match.profile.bio}</p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Activity className="h-4 w-4 mr-2 text-purple-600" />
                      <span className="capitalize">{match.fitnessProfile.fitness_level} level</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2 text-purple-600" />
                      <span className="capitalize">Goal: {match.fitnessProfile.fitness_goal.replace('_', ' ')}</span>
                    </div>
                    
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                      <div>
                        <span>{match.fitnessProfile.location}</span>
                        {match.fitnessProfile.gym_name && (
                          <span className="block text-xs mt-0.5 text-gray-500">
                            {match.fitnessProfile.gym_name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Available on:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getFormattedDays(match.fitnessProfile.availability_days).map((day, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{day}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Preferred times:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getFormattedTimeSlots(match.fitnessProfile.preferred_time_slots).map((slot, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{slot}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-700">Training styles:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {match.fitnessProfile.fitness_style.map((style, i) => (
                          <Badge key={i} className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                            {capitalizeFirstLetter(style)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <Button 
                      variant="outline" 
                      onClick={() => handleMatchAction(match.id, 'reject')}
                      className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-5 w-5 mr-1" /> Skip
                    </Button>
                    <Button 
                      onClick={() => handleMatchAction(match.id, 'accept')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Check className="h-5 w-5 mr-1" /> Connect
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
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
