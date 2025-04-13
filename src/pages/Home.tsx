import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Users, Dumbbell, ArrowRight, Activity, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FitnessProfile, Profile, Match, Workout, Message } from '@/types/supabase';

type DashboardData = {
  profile: Profile | null;
  fitnessProfile: FitnessProfile | null;
  matches: {
    total: number;
    pending: number;
    accepted: number;
  };
  upcomingWorkouts: (Workout & { partnerName: string })[];
  recentMessages: {
    id: string;
    matchId: string;
    message: string;
    senderName: string;
    senderAvatar: string | null;
    createdAt: string;
  }[];
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} min ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hr ago`;
  } else if (diffDay === 1) {
    return 'yesterday';
  } else if (diffDay < 7) {
    return `${diffDay} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const Home = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    profile: null,
    fitnessProfile: null,
    matches: { total: 0, pending: 0, accepted: 0 },
    upcomingWorkouts: [],
    recentMessages: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        const { data: fitnessProfileData } = await supabase
          .from('fitness_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        const { data: matchesData } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
        
        const matchCounts = {
          total: matchesData?.length || 0,
          pending: matchesData?.filter(m => m.status === 'pending').length || 0,
          accepted: matchesData?.filter(m => m.status === 'accepted').length || 0,
        };
        
        const { data: workoutsData } = await supabase
          .from('workouts')
          .select('*')
          .in('match_id', matchesData?.map(m => m.id) || [])
          .eq('status', 'scheduled')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(3);
        
        const processedWorkouts = await Promise.all(
          (workoutsData || []).map(async (workout) => {
            const match = matchesData?.find(m => m.id === workout.match_id);
            if (!match) return { 
              ...workout, 
              partnerName: 'Unknown',
              status: workout.status as 'scheduled' | 'completed' | 'cancelled'
            };
            
            const partnerId = match.user1_id === user.id ? match.user2_id : match.user1_id;
            const { data: partnerData } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('id', partnerId)
              .single();
            
            return {
              ...workout,
              partnerName: partnerData?.full_name || partnerData?.username || 'Unknown',
              status: workout.status as 'scheduled' | 'completed' | 'cancelled'
            };
          })
        );
        
        let typedFitnessProfile: FitnessProfile | null = null;
        if (fitnessProfileData) {
          typedFitnessProfile = {
            ...fitnessProfileData,
            fitness_level: fitnessProfileData.fitness_level as 'beginner' | 'intermediate' | 'advanced',
            fitness_goal: fitnessProfileData.fitness_goal as 'bulking' | 'cutting' | 'maintenance' | 'endurance' | 'flexibility' | 'general'
          };
        }
        
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .in('match_id', matchesData?.filter(m => m.status === 'accepted').map(m => m.id) || [])
          .order('created_at', { ascending: false })
          .limit(5);
        
        const processedMessages = await Promise.all(
          (messagesData || []).map(async (message) => {
            const { data: senderData } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', message.sender_id)
              .single();
            
            return {
              id: message.id,
              matchId: message.match_id,
              message: message.message,
              senderName: senderData?.full_name || senderData?.username || 'Unknown',
              senderAvatar: senderData?.avatar_url,
              createdAt: message.created_at,
            };
          })
        );
        
        setDashboardData({
          profile: profileData,
          fitnessProfile: typedFitnessProfile,
          matches: matchCounts,
          upcomingWorkouts: processedWorkouts,
          recentMessages: processedMessages,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && !authLoading) {
      fetchDashboardData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-5xl font-bold text-purple-800 mb-6">Find Your Perfect Gym Buddy</h1>
            <p className="text-xl text-gray-700 mb-8">
              Connect with like-minded fitness enthusiasts, schedule workouts, and achieve your fitness goals together.
            </p>
            <div className="space-x-4">
              <Link to="/auth">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 mb-2 text-purple-600" />
                <CardTitle>Find Your Match</CardTitle>
                <CardDescription>
                  Our smart algorithm matches you with compatible workout partners based on your fitness goals, schedule, and training style.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <MessageSquare className="h-10 w-10 mb-2 text-purple-600" />
                <CardTitle>Chat & Plan</CardTitle>
                <CardDescription>
                  Message your gym buddies to coordinate workouts, share tips, and stay motivated.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Calendar className="h-10 w-10 mb-2 text-purple-600" />
                <CardTitle>Schedule Workouts</CardTitle>
                <CardDescription>
                  Plan and track your workout sessions, never miss a gym day with your buddy.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-purple-700 mb-6">Ready to Find Your Gym Buddy?</h2>
            <Link to="/auth">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Sign Up Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-purple-700">
        Welcome, {dashboardData.profile?.full_name || dashboardData.profile?.username || 'there'}!
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fitness Level</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Activity className="mr-2 h-5 w-5 text-purple-600" />
              {dashboardData.fitnessProfile ? (
                <span className="capitalize">{dashboardData.fitnessProfile.fitness_level}</span>
              ) : (
                <span className="text-gray-400">Not set</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!dashboardData.fitnessProfile && (
              <Link to="/setup-fitness-profile" className="text-sm text-purple-600 hover:underline">
                Complete your fitness profile
              </Link>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gym Buddies</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-purple-600" />
              {dashboardData.matches.accepted}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500">
            {dashboardData.matches.pending > 0 && (
              <div className="mb-1">
                {dashboardData.matches.pending} pending match{dashboardData.matches.pending !== 1 ? 'es' : ''}
              </div>
            )}
            
            <Link to="/matches" className="text-purple-600 hover:underline">
              Find more gym buddies
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Workouts</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Dumbbell className="mr-2 h-5 w-5 text-purple-600" />
              {dashboardData.upcomingWorkouts.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/workouts" className="text-sm text-purple-600 hover:underline">
              View schedule
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fitness Goal</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-purple-600" />
              {dashboardData.fitnessProfile ? (
                <span className="capitalize">{dashboardData.fitnessProfile.fitness_goal.replace('_', ' ')}</span>
              ) : (
                <span className="text-gray-400">Not set</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!dashboardData.fitnessProfile && (
              <Link to="/setup-fitness-profile" className="text-sm text-purple-600 hover:underline">
                Set your fitness goal
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="overflow-hidden">
          <CardHeader className="bg-purple-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-purple-600" />
                Upcoming Workouts
              </CardTitle>
              <Link to="/workouts">
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {dashboardData.upcomingWorkouts.length > 0 ? (
              <div className="divide-y">
                {dashboardData.upcomingWorkouts.map((workout) => {
                  const workoutDate = new Date(workout.scheduled_at);
                  
                  return (
                    <div key={workout.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">Workout with {workout.partnerName}</div>
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                          {workoutDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {workoutDate.toLocaleDateString(undefined, { weekday: 'long' })} at{' '}
                        {workoutDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{workout.duration_minutes} minutes</span>
                        <span className="mx-2">•</span>
                        <span>{workout.location}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <h3 className="font-medium text-lg mb-2">No upcoming workouts</h3>
                <p className="text-gray-500 mb-4">Schedule a workout with one of your gym buddies!</p>
                <Link to="/workouts">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Schedule a Workout
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="bg-purple-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-purple-600" />
                Recent Messages
              </CardTitle>
              <Link to="/chat">
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {dashboardData.recentMessages.length > 0 ? (
              <div className="divide-y">
                {dashboardData.recentMessages.map((message) => (
                  <div key={message.id} className="py-4 first:pt-0 last:pb-0">
                    <Link to={`/chat?matchId=${message.matchId}`} className="block">
                      <div className="flex items-start mb-2">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={message.senderAvatar || undefined} />
                          <AvatarFallback className="bg-purple-200 text-purple-700">
                            {message.senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{message.senderName}</span>
                            <span className="text-xs text-gray-500">{formatRelativeTime(message.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-1">{message.message}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <h3 className="font-medium text-lg mb-2">No messages yet</h3>
                <p className="text-gray-500 mb-4">Start a conversation with one of your gym buddies!</p>
                <Link to="/chat">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Go to Messages
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-purple-600" />
              Find Gym Buddies
            </CardTitle>
            <CardDescription>
              Connect with fitness enthusiasts who match your workout style and schedule
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/matches" className="w-full">
              <Button variant="outline" className="w-full justify-between border-purple-200 text-purple-700 hover:bg-purple-100">
                Browse Matches
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-purple-600" />
              Message Your Buddies
            </CardTitle>
            <CardDescription>
              Chat with your gym partners to plan workouts and stay motivated
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/chat" className="w-full">
              <Button variant="outline" className="w-full justify-between border-purple-200 text-purple-700 hover:bg-purple-100">
                Go to Messages
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-purple-600" />
              Schedule Workouts
            </CardTitle>
            <CardDescription>
              Plan and organize your gym sessions with your workout partners
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/workouts" className="w-full">
              <Button variant="outline" className="w-full justify-between border-purple-200 text-purple-700 hover:bg-purple-100">
                Manage Schedule
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Home;
