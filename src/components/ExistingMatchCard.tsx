
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, User, MapPin, Calendar, MessageSquare, Check, X } from "lucide-react";
import { Match, Profile, FitnessProfile } from '@/types/supabase';

interface ExistingMatchCardProps {
  match: Match & {
    otherUser: Profile;
    otherUserFitnessProfile?: FitnessProfile;
  };
  currentUserId: string;
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
}

const ExistingMatchCard: React.FC<ExistingMatchCardProps> = ({ 
  match, 
  currentUserId, 
  onAccept, 
  onReject 
}) => {
  return (
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
          {match.status === 'pending' && match.user2_id === currentUserId && (
            <Badge className="bg-yellow-100 text-yellow-800">Match Request Pending</Badge>
          )}
          {match.status === 'pending' && match.user1_id === currentUserId && (
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
        {match.status === 'pending' && match.user2_id === currentUserId ? (
          <>
            <Button 
              variant="outline" 
              onClick={() => onReject(match.id)}
              className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-5 w-5 mr-1" /> Decline
            </Button>
            <Button 
              onClick={() => onAccept(match.id)}
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
  );
};

export default ExistingMatchCard;
