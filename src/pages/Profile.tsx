
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { User, Activity, Calendar, Clock, MapPin, Dumbbell } from "lucide-react";
import { FitnessProfile, Profile as ProfileType } from '@/types/supabase';

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

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user) return;
      
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        
        setProfile(profileData);
        
        // Fetch fitness profile
        const { data: fitnessProfileData, error: fitnessProfileError } = await supabase
          .from('fitness_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (fitnessProfileError && fitnessProfileError.code !== 'PGRST116') {
          throw fitnessProfileError;
        }
        
        if (fitnessProfileData) {
          // Type cast to match our FitnessProfile type
          const typedFitnessProfile: FitnessProfile = {
            ...fitnessProfileData,
            fitness_level: fitnessProfileData.fitness_level as 'beginner' | 'intermediate' | 'advanced',
            fitness_goal: fitnessProfileData.fitness_goal as 'bulking' | 'cutting' | 'maintenance' | 'endurance' | 'flexibility' | 'general'
          };
          
          setFitnessProfile(typedFitnessProfile);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [user, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-700">My Profile</h1>
        
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/setup-profile')}
          >
            Edit Profile
          </Button>
          {fitnessProfile && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/setup-fitness-profile')}
            >
              Edit Fitness Profile
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-100 text-purple-800 text-2xl">
                    {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl text-center">{profile?.full_name}</CardTitle>
              <CardDescription className="text-center">@{profile?.username}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {profile?.bio && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Bio</h3>
                  <p className="text-gray-700">{profile.bio}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center text-gray-700">
                  <User className="h-5 w-5 mr-3 text-gray-400" />
                  <span>{user?.email}</span>
                </div>
                
                {fitnessProfile?.location && (
                  <div className="flex items-start text-gray-700">
                    <MapPin className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                    <div>
                      <div>{fitnessProfile.location}</div>
                      {fitnessProfile.gym_name && (
                        <div className="text-sm text-gray-500">{fitnessProfile.gym_name}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {fitnessProfile ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Fitness Profile</CardTitle>
                <CardDescription>
                  Your workout preferences and fitness details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <Activity className="h-4 w-4 mr-2" /> Fitness Level
                    </h3>
                    <p className="text-lg font-medium capitalize">{fitnessProfile.fitness_level}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <Dumbbell className="h-4 w-4 mr-2" /> Fitness Goal
                    </h3>
                    <p className="text-lg font-medium capitalize">{fitnessProfile.fitness_goal.replace('_', ' ')}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <Dumbbell className="h-4 w-4 mr-2" /> Training Styles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {fitnessProfile.fitness_style.map((style, index) => (
                      <Badge key={index} className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                        {capitalizeFirstLetter(style)}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" /> Availability
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {getFormattedDays(fitnessProfile.availability_days).map((day, index) => (
                      <Badge key={index} variant="outline">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <Clock className="h-4 w-4 mr-2" /> Preferred Time Slots
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {getFormattedTimeSlots(fitnessProfile.preferred_time_slots).map((slot, index) => (
                      <Badge key={index} variant="outline">
                        {slot}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-8 text-center">
              <div>
                <Dumbbell className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                <h3 className="text-2xl font-medium mb-2">Complete Your Fitness Profile</h3>
                <p className="text-gray-500 mb-6">
                  Set up your fitness profile to find compatible gym buddies and get personalized workout matches.
                </p>
                <Button 
                  onClick={() => navigate('/setup-fitness-profile')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Complete Fitness Profile
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
