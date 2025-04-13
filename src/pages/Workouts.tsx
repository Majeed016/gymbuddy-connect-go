
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MatchWithProfiles, Workout } from '@/types/supabase';
import { Loader2, Calendar as CalendarIcon, Timer, MapPin, Plus, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const workoutFormSchema = z.object({
  match_id: z.string().uuid(),
  scheduled_at: z.date(),
  duration_minutes: z.number().min(15).max(180),
  location: z.string().min(3, "Location is required"),
  notes: z.string().optional(),
});

type WorkoutFormValues = z.infer<typeof workoutFormSchema>;

const Workouts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const matchId = queryParams.get('matchId');
  
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithProfiles[]>([]);
  const [workouts, setWorkouts] = useState<(Workout & {match: MatchWithProfiles})[]>([]);
  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      match_id: matchId || '',
      scheduled_at: addDays(new Date(), 1),
      duration_minutes: 60,
      location: '',
      notes: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id, status')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .eq('status', 'accepted');
        
        if (matchesError) throw matchesError;
        
        // Fetch profiles for matches
        const matchesWithProfiles = await Promise.all(
          matchesData.map(async (match) => {
            const user1Id = match.user1_id;
            const user2Id = match.user2_id;
            
            const { data: user1Profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user1Id)
              .single();
              
            const { data: user2Profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user2Id)
              .single();
              
            const { data: user1FitnessProfile } = await supabase
              .from('fitness_profiles')
              .select('*')
              .eq('id', user1Id)
              .single();
              
            const { data: user2FitnessProfile } = await supabase
              .from('fitness_profiles')
              .select('*')
              .eq('id', user2Id)
              .single();
            
            return {
              ...match,
              profiles: {
                user1: {
                  ...user1Profile,
                  fitness_profile: user1FitnessProfile,
                },
                user2: {
                  ...user2Profile,
                  fitness_profile: user2FitnessProfile,
                },
              },
            } as MatchWithProfiles;
          })
        );
        
        setMatches(matchesWithProfiles);
        
        // Fetch workouts
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .in('match_id', matchesWithProfiles.map(m => m.id))
          .order('scheduled_at', { ascending: true });
        
        if (workoutsError) throw workoutsError;
        
        // Combine workouts with match data
        const workoutsWithMatchData = workoutsData.map(workout => {
          const match = matchesWithProfiles.find(m => m.id === workout.match_id);
          return {
            ...workout,
            match,
          };
        });
        
        setWorkouts(workoutsWithMatchData);
        
        // If a match ID was provided in the URL, set it in the form
        if (matchId) {
          form.setValue('match_id', matchId);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load workout data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast, form, matchId]);

  const onSubmit = async (values: WorkoutFormValues) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('workouts')
        .insert({
          match_id: values.match_id,
          scheduled_at: values.scheduled_at.toISOString(),
          duration_minutes: values.duration_minutes,
          location: values.location,
          notes: values.notes || null,
          status: 'scheduled',
        });
      
      if (error) throw error;
      
      toast({
        title: "Workout Scheduled",
        description: "Your workout has been successfully scheduled!",
      });
      
      setDialogOpen(false);
      
      // Refresh workout data
      const { data: newWorkout, error: fetchError } = await supabase
        .from('workouts')
        .select('*')
        .eq('match_id', values.match_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (fetchError) throw fetchError;
      
      const match = matches.find(m => m.id === values.match_id);
      
      setWorkouts(prev => [...prev, {
        ...newWorkout,
        match,
      }]);
      
      // Reset form
      form.reset({
        match_id: '',
        scheduled_at: addDays(new Date(), 1),
        duration_minutes: 60,
        location: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error scheduling workout:', error);
      toast({
        title: "Error",
        description: "Failed to schedule workout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateWorkoutStatus = async (workoutId: string, status: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutId);
      
      if (error) throw error;
      
      toast({
        title: status === 'completed' ? "Workout Completed" : "Workout Cancelled",
        description: status === 'completed' 
          ? "Great job! Your workout has been marked as completed." 
          : "Your workout has been cancelled.",
      });
      
      // Update workout status in state
      setWorkouts(prev => 
        prev.map(workout => 
          workout.id === workoutId 
            ? { ...workout, status } 
            : workout
        )
      );
    } catch (error) {
      console.error('Error updating workout status:', error);
      toast({
        title: "Error",
        description: "Failed to update workout status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter workouts based on selected tab
  const now = new Date();
  const filteredWorkouts = workouts.filter(workout => {
    const workoutDate = new Date(workout.scheduled_at);
    
    if (selectedTab === 'upcoming') {
      return workoutDate >= now && workout.status === 'scheduled';
    } else if (selectedTab === 'completed') {
      return workout.status === 'completed';
    } else if (selectedTab === 'cancelled') {
      return workout.status === 'cancelled';
    } else {
      return workoutDate < now && workout.status === 'scheduled';
    }
  });

  const getOtherUser = (match: MatchWithProfiles) => {
    if (!user) return null;
    return match.user1_id === user.id ? match.profiles.user2 : match.profiles.user1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-700 mb-4 md:mb-0">Workouts</h1>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-5 w-5 mr-2" /> Schedule Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Schedule a New Workout</DialogTitle>
              <DialogDescription>
                Plan your next workout session with your gym buddy.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                {matches.length > 0 ? (
                  <FormField
                    control={form.control}
                    name="match_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gym Buddy</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your gym buddy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {matches.map(match => {
                              const otherUser = getOtherUser(match);
                              return (
                                <SelectItem key={match.id} value={match.id}>
                                  {otherUser?.full_name || otherUser?.username}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the workout partner you want to train with.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-500 mb-2">You don't have any gym buddies yet.</p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/matches')}
                      className="text-purple-600"
                    >
                      Find Gym Buddies
                    </Button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="scheduled_at"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date & Time</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP 'at' p")
                                ) : (
                                  <span>Pick a date and time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                            <div className="p-3 border-t border-border">
                              <Input
                                type="time"
                                value={format(field.value || new Date(), "HH:mm")}
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(':').map(Number);
                                  const newDate = new Date(field.value);
                                  newDate.setHours(hours);
                                  newDate.setMinutes(minutes);
                                  field.onChange(newDate);
                                }}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          When do you want to work out?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select workout duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="75">1 hour 15 minutes</SelectItem>
                            <SelectItem value="90">1 hour 30 minutes</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How long will your workout session be?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Gym name or address" {...field} />
                      </FormControl>
                      <FormDescription>
                        Where will you meet for your workout?
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="E.g., What you'll be training, what to bring, etc."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional details for your workout.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    Schedule Workout
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="missed">Missed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTab}>
          {filteredWorkouts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkouts.map(workout => {
                const workoutDate = new Date(workout.scheduled_at);
                const otherUser = getOtherUser(workout.match);
                
                return (
                  <Card key={workout.id} className="overflow-hidden">
                    <CardHeader className="bg-purple-50 pb-2 flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          Workout with {otherUser?.full_name || otherUser?.username}
                          {workout.status === 'completed' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {workout.status === 'cancelled' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          {selectedTab === 'missed' && (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          {format(workoutDate, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start text-sm text-gray-600">
                        <Timer className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                        <span>{workout.duration_minutes} minutes</span>
                      </div>
                      
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                        <span>{workout.location}</span>
                      </div>
                      
                      {workout.notes && (
                        <div className="pt-2 text-sm text-gray-700">
                          <p className="font-medium mb-1">Notes:</p>
                          <p>{workout.notes}</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between pt-0">
                      {workout.status === 'scheduled' && selectedTab === 'upcoming' && (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={() => updateWorkoutStatus(workout.id, 'cancelled')}
                            className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => updateWorkoutStatus(workout.id, 'completed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark as Completed
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 mx-auto mb-6 text-gray-300" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                No {selectedTab} workouts
              </h3>
              <p className="text-gray-500 mb-6">
                {selectedTab === 'upcoming' && "You don't have any upcoming workouts scheduled."}
                {selectedTab === 'completed' && "You haven't completed any workouts yet."}
                {selectedTab === 'missed' && "You don't have any missed workouts."}
                {selectedTab === 'cancelled' && "You don't have any cancelled workouts."}
              </p>
              {selectedTab === 'upcoming' && (
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Schedule a Workout
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Workouts;
