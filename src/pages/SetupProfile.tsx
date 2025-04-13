
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Profile } from '@/types/supabase';

const profileFormSchema = z.object({
  username: z.string().min(3).max(30),
  full_name: z.string().min(2).max(50),
  bio: z.string().max(300).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const SetupProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      full_name: "",
      bio: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        setProfile(data);
        form.reset({
          username: data.username,
          full_name: data.full_name || '',
          bio: data.bio || '',
        });
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile information.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, form, toast]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          full_name: data.full_name,
          bio: data.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      // If user doesn't have a fitness profile yet, navigate to fitness profile setup
      if (!profile?.id) {
        navigate('/setup-fitness-profile');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-purple-700">Set Up Your Profile</CardTitle>
          <CardDescription>
            Tell us a bit about yourself so others can get to know you
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="your_username" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your public username that others will see.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your full name will be visible to your connections.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell others about yourself, your fitness journey, and what you're looking for in a gym buddy."
                        {...field}
                        className="min-h-24"
                      />
                    </FormControl>
                    <FormDescription>
                      Keep it short and friendly. Max 300 characters.
                    </FormDescription>
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
                  'Save & Continue'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SetupProfile;
