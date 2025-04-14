
import { useState } from 'react';
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DebugInfoDisplay from '@/components/DebugInfoDisplay';
import PotentialMatches from '@/components/PotentialMatches';
import ExistingMatches from '@/components/ExistingMatches';
import useMatchData from '@/hooks/useMatchData';

const Matches = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('potential');
  
  const {
    isLoading,
    potentialMatches,
    existingMatches,
    debugInfo,
    setPotentialMatches,
    setExistingMatches,
    setDebugInfo
  } = useMatchData(user?.id);

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

  const handleExistingMatchAction = (matchId: string, action: 'accept' | 'reject') => {
    handleMatchResponse(matchId, action);
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
      
      <DebugInfoDisplay debugInfo={debugInfo} />
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="potential">Potential Matches</TabsTrigger>
          <TabsTrigger value="existing">My Matches</TabsTrigger>
        </TabsList>
        
        <TabsContent value="potential">
          <PotentialMatches 
            potentialMatches={potentialMatches}
            onAccept={(userId) => handleMatchAction(userId, 'accept')}
            onReject={(userId) => handleMatchAction(userId, 'reject')}
          />
        </TabsContent>
        
        <TabsContent value="existing">
          <ExistingMatches 
            matches={existingMatches}
            currentUserId={user?.id || ''}
            onAccept={handleExistingMatchAction}
            onReject={handleExistingMatchAction}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Matches;
