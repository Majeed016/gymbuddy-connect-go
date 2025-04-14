import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, CheckCircle, AlertTriangle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DayPicker } from "react-day-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Profile, FitnessProfile, Match, Workout, MatchWithProfiles } from '@/types/supabase';

const workoutFormSchema = z.object({
  scheduled_at: z.date(),
  duration: z.string().min(1, {
    message: "Please enter the duration.",
  }),
  location: z.string().min(3, {
    message: "Location must be at least 3 characters.",
  }),
  notes: z.string().optional(),
})

type WorkoutFormValues = z.infer<typeof workoutFormSchema>

const Workouts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Array<Workout & { match: MatchWithProfiles }>>([]);
  const [pastWorkouts, setPastWorkouts] = useState<Array<Workout & { match: MatchWithProfiles }>>([]);
  const [matches, setMatches] = useState<MatchWithProfiles[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithProfiles | null>(null);
  const [open, setOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      scheduled_at: new Date(),
      duration: "60",
      location: "",
      notes: "",
    },
  });

  const editForm = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      scheduled_at: new Date(),
      duration: "60",
      location: "",
      notes: "",
    },
  });

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        if (!user) {
          setDebugInfo(prev => [...prev, "No user logged in"]);
          return;
        }

        // Step 1: Fetch accepted matches for the current user
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (matchesError) {
          setDebugInfo(prev => [...prev, `Error fetching matches: ${matchesError.message}`]);
          throw matchesError;
        }

        if (!matchesData || matchesData.length === 0) {
          setDebugInfo(prev => [...prev, "No matches found for user"]);
          setIsLoading(false);
          return;
        }

        // Step 2: Fetch profiles for all users involved in matches
        const otherUserIds = matchesData.map(match => 
          match.user1_id === user.id ? match.user2_id : match.user1_id
        );

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', otherUserIds);

        if (profilesError) {
          setDebugInfo(prev => [...prev, `Error fetching profiles: ${profilesError.message}`]);
          throw profilesError;
        }

        // Step 3: Fetch fitness profiles for the other users
        const { data: fitnessProfilesData, error: fitnessProfilesError } = await supabase
          .from('fitness_profiles')
          .select('*')
          .in('id', otherUserIds);

        if (fitnessProfilesError) {
          setDebugInfo(prev => [...prev, `Error fetching fitness profiles: ${fitnessProfilesError.message}`]);
          throw fitnessProfilesError;
        }

        // Step 4: Combine match data with profiles
        const enhancedMatches = matchesData.map(match => {
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          const otherUserProfile = profilesData.find(profile => profile.id === otherUserId);
          const otherUserFitnessProfile = fitnessProfilesData.find(fp => fp.id === otherUserId);
          
          return {
            ...match,
            otherUser: otherUserProfile as Profile,
            otherUserFitnessProfile: otherUserFitnessProfile as FitnessProfile
          } as MatchWithProfiles;
        });

        setMatches(enhancedMatches);

        // Step 5: Fetch workouts for these matches
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .in('match_id', matchesData.map(match => match.id));

        if (workoutsError) {
          setDebugInfo(prev => [...prev, `Error fetching workouts: ${workoutsError.message}`]);
          throw workoutsError;
        }

        // Step 6: Combine workout data with match data
        const workoutsWithMatches = workoutsData.map(workout => {
          const matchData = enhancedMatches.find(match => match.id === workout.match_id);
          return {
            ...workout,
            match: matchData as MatchWithProfiles
          } as Workout & { match: MatchWithProfiles };
        });

        // Step 7: Separate past and future workouts
        const now = new Date();
        const futureWorkouts = workoutsWithMatches.filter(
          workout => new Date(workout.scheduled_at) >= now
        );
        const pastWorkouts = workoutsWithMatches.filter(
          workout => new Date(workout.scheduled_at) < now
        );

        setWorkouts(futureWorkouts);
        setPastWorkouts(pastWorkouts);
      } catch (error: any) {
        console.error('Error fetching workouts:', error);
        setDebugInfo(prev => [...prev, `Error in fetchWorkouts: ${error.message || JSON.stringify(error)}`]);
        toast({
          title: "Error",
          description: "Failed to load workouts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkouts();
  }, [user, toast]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleWorkoutCompletion = async (workoutId: string) => {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({ status: 'completed' })
        .eq('id', workoutId);

      if (error) throw error;

      setWorkouts(prev => prev.map(workout =>
        workout.id === workoutId ? { ...workout, status: 'completed' } : workout
      ));

      toast({
        title: "Workout Completed",
        description: "Great job on completing your workout!",
      });
    } catch (error: any) {
      console.error('Error updating workout status:', error);
      toast({
        title: "Error",
        description: "Failed to update workout status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWorkoutCancellation = async (workoutId: string) => {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({ status: 'cancelled' })
        .eq('id', workoutId);

      if (error) throw error;

      setWorkouts(prev => prev.map(workout =>
        workout.id === workoutId ? { ...workout, status: 'cancelled' } : workout
      ));

      toast({
        title: "Workout Cancelled",
        description: "Workout has been cancelled.",
      });
    } catch (error: any) {
      console.error('Error cancelling workout:', error);
      toast({
        title: "Error",
        description: "Failed to cancel workout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleWorkout = async (data: WorkoutFormValues) => {
    if (!selectedMatch) {
      toast({
        title: "Error",
        description: "Please select a match to schedule a workout with.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          match_id: selectedMatch.id,
          scheduled_at: data.scheduled_at.toISOString(),
          duration: parseInt(data.duration),
          location: data.location,
          notes: data.notes,
          status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled'
        })
        .select('*')
        .single();

      if (workoutError) throw workoutError;

      setWorkouts(prev => [
        ...prev,
        {
          ...workoutData,
          match: selectedMatch
        } as Workout & { match: MatchWithProfiles }
      ]);

      toast({
        title: "Workout Scheduled",
        description: "Your workout has been scheduled successfully!",
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Error scheduling workout:', error);
      toast({
        title: "Error",
        description: "Failed to schedule workout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditWorkout = async (workout: Workout) => {
    setEditingWorkout(workout);
    setIsEditing(true);

    // Set default values for the edit form
    editForm.reset({
      scheduled_at: new Date(workout.scheduled_at),
      duration: workout.duration,
      location: workout.location,
      notes: workout.notes || '',
    });
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
      <h1 className="text-3xl font-bold mb-6 text-purple-700">Your Workouts</h1>

      {debugInfo.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-2">Debug Information:</h3>
          {debugInfo.map((info, index) => (
            <p key={index} className="text-xs text-gray-600">{info}</p>
          ))}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Schedule a New Workout</CardTitle>
          <CardDescription>Plan your next session with a gym buddy</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleScheduleWorkout)} className="space-y-4">
              <FormField
                control={form.control}
                name="scheduled_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Date</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DayPicker
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Choose the date you plan to work out.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 60" {...field} />
                    </FormControl>
                    <FormDescription>
                      How long will the workout last?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Downtown Gym" {...field} />
                    </FormControl>
                    <FormDescription>
                      Where will the workout take place?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Focus on legs" {...field} />
                    </FormControl>
                    <FormDescription>
                      Any specific details about the workout?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="match_id"
                render={() => (
                  <FormItem>
                    <FormLabel>Select a Match</FormLabel>
                    <Select onValueChange={(value) => {
                      const match = matches.find(match => match.id === value);
                      setSelectedMatch(match || null);
                    }}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a match" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {matches.map((match) => (
                          <SelectItem key={match.id} value={match.id}>
                            {match.otherUser?.full_name || match.otherUser?.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Who are you planning to work out with?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                Schedule Workout
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <h2 className="text-2xl font-semibold mb-4">Upcoming Workouts</h2>
      {workouts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workouts.map(workout => (
            <Card key={workout.id} className="bg-white shadow-md rounded-md overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Workout with {workout.match.otherUser?.full_name || workout.match.otherUser?.username}
                </CardTitle>
                {workout.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {workout.status === 'cancelled' && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-sm text-gray-500">
                  <Calendar className="inline-block h-4 w-4 mr-1 align-middle" />
                  {formatDate(new Date(workout.scheduled_at))}
                </div>
                <div className="text-sm text-gray-500">
                  <Clock className="inline-block h-4 w-4 mr-1 align-middle" />
                  {workout.duration} Minutes
                </div>
                <div className="text-sm text-gray-500">
                  <MapPin className="inline-block h-4 w-4 mr-1 align-middle" />
                  {workout.location}
                </div>
                {workout.notes && (
                  <div className="text-sm text-gray-500">
                    Notes: {workout.notes}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center p-4">
                {workout.status === 'scheduled' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWorkoutCompletion(workout.id)}
                      className="bg-green-500 hover:bg-green-700 text-white"
                    >
                      Complete
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleWorkoutCancellation(workout.id)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {workout.status === 'completed' && (
                  <div className="text-green-500 font-semibold">Completed!</div>
                )}
                {workout.status === 'cancelled' && (
                  <div className="text-red-500 font-semibold">Cancelled</div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No upcoming workouts scheduled</h3>
          <p className="text-gray-500">
            Schedule a workout above to get started!
          </p>
        </div>
      )}

      <Separator className="my-6" />

      <h2 className="text-2xl font-semibold mb-4">Past Workouts</h2>
      {pastWorkouts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastWorkouts.map(workout => (
            <Card key={workout.id} className="bg-white shadow-md rounded-md overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Workout with {workout.match.otherUser?.full_name || workout.match.otherUser?.username}
                </CardTitle>
                {workout.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {workout.status === 'cancelled' && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-sm text-gray-500">
                  <Calendar className="inline-block h-4 w-4 mr-1 align-middle" />
                  {formatDate(new Date(workout.scheduled_at))}
                </div>
                <div className="text-sm text-gray-500">
                  <Clock className="inline-block h-4 w-4 mr-1 align-middle" />
                  {workout.duration} Minutes
                </div>
                <div className="text-sm text-gray-500">
                  <MapPin className="inline-block h-4 w-4 mr-1 align-middle" />
                  {workout.location}
                </div>
                {workout.notes && (
                  <div className="text-sm text-gray-500">
                    Notes: {workout.notes}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center p-4">
                {workout.status === 'completed' && (
                  <div className="text-green-500 font-semibold">Completed!</div>
                )}
                {workout.status === 'cancelled' && (
                  <div className="text-red-500 font-semibold">Cancelled</div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No past workouts</h3>
        </div>
      )}
    </div>
  );
};

export default Workouts;
