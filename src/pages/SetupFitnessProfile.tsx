
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fitnessLevels = ['beginner', 'intermediate', 'advanced'] as const;
const fitnessStyles = [
  { id: 'cardio', label: 'Cardio' },
  { id: 'strength', label: 'Strength Training' },
  { id: 'functional', label: 'Functional Training' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'pilates', label: 'Pilates' },
  { id: 'calisthenics', label: 'Calisthenics' },
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'running', label: 'Running' },
] as const;

const fitnessGoals = ['bulking', 'cutting', 'maintenance', 'endurance', 'flexibility', 'general'] as const;

const daysOfWeek = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
  { id: 'sun', label: 'Sunday' },
] as const;

const timeSlots = [
  { id: 'early_morning', label: 'Early Morning (5am-8am)' },
  { id: 'morning', label: 'Morning (8am-11am)' },
  { id: 'midday', label: 'Midday (11am-2pm)' },
  { id: 'afternoon', label: 'Afternoon (2pm-5pm)' },
  { id: 'evening', label: 'Evening (5pm-8pm)' },
  { id: 'late_evening', label: 'Late Evening (8pm-11pm)' },
] as const;

const fitnessProfileSchema = z.object({
  fitness_level: z.enum(fitnessLevels),
  fitness_style: z.array(z.string()).min(1, "Select at least one fitness style"),
  fitness_goal: z.enum(fitnessGoals),
  location: z.string().min(3, "Please enter a valid location"),
  gym_name: z.string().optional(),
  availability_days: z.array(z.string()).min(1, "Select at least one day"),
  preferred_time_slots: z.array(z.string()).min(1, "Select at least one time slot"),
});

type FitnessProfileFormValues = z.infer<typeof fitnessProfileSchema>;

const SetupFitnessProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FitnessProfileFormValues>({
    resolver: zodResolver(fitnessProfileSchema),
    defaultValues: {
      fitness_level: 'beginner',
      fitness_style: [],
      fitness_goal: 'general',
      location: '',
      gym_name: '',
      availability_days: [],
      preferred_time_slots: [],
    },
  });

  const onSubmit = async (data: FitnessProfileFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('fitness_profiles')
        .upsert({
          id: user.id,
          fitness_level: data.fitness_level,
          fitness_style: data.fitness_style,
          fitness_goal: data.fitness_goal,
          location: data.location,
          gym_name: data.gym_name || null,
          availability_days: data.availability_days,
          preferred_time_slots: data.preferred_time_slots,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      toast({
        title: "Profile completed",
        description: "Your fitness profile has been set up successfully!",
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Error setting up fitness profile:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-purple-700">Your Fitness Profile</CardTitle>
          <CardDescription>
            Tell us about your fitness preferences to help us find the perfect gym buddy for you
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fitness_level"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Fitness Level</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="beginner" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Beginner - New to working out or returning after a long break
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="intermediate" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Intermediate - Consistent with workouts for 6+ months
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="advanced" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Advanced - Very experienced, training consistently for years
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fitness_style"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Fitness Style</FormLabel>
                      <FormDescription>
                        Select the types of training you enjoy (select at least one)
                      </FormDescription>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {fitnessStyles.map((style) => (
                        <FormField
                          key={style.id}
                          control={form.control}
                          name="fitness_style"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={style.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(style.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, style.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== style.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {style.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fitness_goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Fitness Goal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your primary fitness goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bulking">Bulking - Building muscle mass</SelectItem>
                        <SelectItem value="cutting">Cutting - Losing fat while maintaining muscle</SelectItem>
                        <SelectItem value="maintenance">Maintenance - Maintaining current physique</SelectItem>
                        <SelectItem value="endurance">Endurance - Improving cardiovascular health</SelectItem>
                        <SelectItem value="flexibility">Flexibility - Improving mobility and flexibility</SelectItem>
                        <SelectItem value="general">General - Overall fitness and health</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the goal that best describes what you're working towards
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
                      <Input placeholder="e.g., Downtown San Francisco, CA" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter your general location to find workout partners nearby
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gym_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gym Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 24 Hour Fitness Downtown" {...field} />
                    </FormControl>
                    <FormDescription>
                      If you have a primary gym, enter it here to find buddies at the same location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availability_days"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Availability</FormLabel>
                      <FormDescription>
                        Which days are you typically available to work out?
                      </FormDescription>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {daysOfWeek.map((day) => (
                        <FormField
                          key={day.id}
                          control={form.control}
                          name="availability_days"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, day.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== day.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {day.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_time_slots"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Preferred Time Slots</FormLabel>
                      <FormDescription>
                        When do you typically prefer to work out?
                      </FormDescription>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <FormField
                          key={slot.id}
                          control={form.control}
                          name="preferred_time_slots"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={slot.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(slot.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, slot.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== slot.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {slot.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SetupFitnessProfile;
