
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, User, MapPin, Calendar, Clock, X, Check } from "lucide-react";
import { MatchScore } from '@/types/supabase';
import { getFormattedDays, getFormattedTimeSlots } from '@/utils/matchingUtils';

interface MatchCardProps {
  match: MatchScore;
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onAccept, onReject }) => {
  return (
    <Card className="overflow-hidden">
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
        
        <div className="bg-purple-50 p-3 rounded-md mb-3">
          <h4 className="font-medium text-purple-700 mb-2">Why you match:</h4>
          <ul className="text-sm space-y-1">
            {match.matchReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        
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
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <Button 
          variant="outline" 
          onClick={() => onReject(match.userId)}
          className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-5 w-5 mr-1" /> Skip
        </Button>
        <Button 
          onClick={() => onAccept(match.userId)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Check className="h-5 w-5 mr-1" /> Connect
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MatchCard;
