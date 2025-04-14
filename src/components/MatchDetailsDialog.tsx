
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MatchScore } from '@/types/supabase';
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";
import { formatGoal, formatStyle, getFormattedDays, getFormattedTimeSlots } from '@/utils/matchingUtils';

interface MatchDetailsDialogProps {
  match: MatchScore;
  onClose: () => void;
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
}

const MatchDetailsDialog: React.FC<MatchDetailsDialogProps> = ({ 
  match, 
  onClose, 
  onAccept, 
  onReject 
}) => {
  // Calculate individual scores for each category
  const calculateCategoryScore = (category: string): { percentage: number, detail: string } => {
    const reasons = match.matchReasons.filter(reason => reason.toLowerCase().includes(category.toLowerCase()));
    
    if (reasons.length === 0) {
      return { percentage: 0, detail: `No matching ${category}` };
    }
    
    let percentage = 0;
    let detail = "";
    
    if (category === "goal") {
      percentage = reasons.length > 0 ? 100 : 0;
      detail = reasons[0] || `No matching ${category}`;
    } else if (category === "style") {
      // Extract the number of shared styles from the reason text
      const styleCountMatch = reasons[0]?.match(/share (\d+) training styles/i);
      const sharedCount = styleCountMatch ? parseInt(styleCountMatch[1]) : 0;
      percentage = Math.min(sharedCount * 25, 100); // 25% per shared style, max 100%
      detail = reasons[0] || `No matching ${category}`;
    } else if (category === "time") {
      const timeCountMatch = reasons[0]?.match(/(\d+) compatible workout times/i);
      const compatibleCount = timeCountMatch ? parseInt(timeCountMatch[1]) : 0;
      percentage = Math.min(compatibleCount * 33, 100); // 33% per time slot, max 100%
      detail = reasons[0] || `No matching ${category}`;
    } else if (category === "location") {
      // Check if there are matching locations or gyms
      const hasLocation = reasons.some(r => r.includes("both in"));
      const hasGym = reasons.some(r => r.includes("both work out at"));
      percentage = hasGym ? 100 : (hasLocation ? 60 : 0);
      detail = reasons.find(r => r.includes("both work out at")) || 
               reasons.find(r => r.includes("both in")) || 
               `No matching ${category}`;
    } else if (category === "availability") {
      const daysCountMatch = reasons[0]?.match(/share (\d+) days/i);
      const daysCount = daysCountMatch ? parseInt(daysCountMatch[1]) : 0;
      percentage = Math.min(daysCount * 14, 100); // ~14% per day, max 100%
      detail = reasons[0] || `No matching ${category}`;
    } else if (category === "level") {
      percentage = reasons.length > 0 ? 100 : 0;
      detail = reasons[0] || `No matching ${category}`;
    }
    
    return { percentage, detail };
  };
  
  const goalScore = calculateCategoryScore("goal");
  const styleScore = calculateCategoryScore("style");
  const timeScore = calculateCategoryScore("time");
  const locationScore = calculateCategoryScore("location");
  const availabilityScore = calculateCategoryScore("availability");
  const levelScore = calculateCategoryScore("level");
  
  const scoreCategories = [
    { name: "Fitness Goal", score: goalScore },
    { name: "Training Style", score: styleScore },
    { name: "Workout Times", score: timeScore },
    { name: "Location", score: locationScore },
    { name: "Availability", score: availabilityScore },
    { name: "Fitness Level", score: levelScore }
  ];
  
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <Avatar className="h-10 w-10 border border-purple-200">
              <AvatarImage src={match.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-purple-700 text-white">
                {match.profile?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <DialogTitle className="text-xl">
              {match.profile?.full_name || match.profile?.username}
            </DialogTitle>
            <Badge className="bg-purple-600 ml-auto">
              {Math.round(match.compatibilityScore * 100)}% Match
            </Badge>
          </div>
          <DialogDescription>
            Detailed compatibility breakdown with {match.profile?.username}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3">Compatibility Breakdown</h3>
            
            <div className="space-y-3">
              {scoreCategories.map((category, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className="text-sm text-gray-500">{category.score.percentage}%</span>
                  </div>
                  <Progress value={category.score.percentage} className="h-2" />
                  <p className="text-xs text-gray-600 italic">{category.score.detail}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-1">Fitness Level</h4>
              <p className="text-sm capitalize">{match.fitnessProfile.fitness_level}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-1">Fitness Goal</h4>
              <p className="text-sm">{formatGoal(match.fitnessProfile.fitness_goal)}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-1">Location</h4>
              <p className="text-sm">{match.fitnessProfile.location}</p>
              {match.fitnessProfile.gym_name && (
                <p className="text-xs text-gray-500">{match.fitnessProfile.gym_name}</p>
              )}
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-1">Training Styles</h4>
              <div className="flex flex-wrap gap-1">
                {match.fitnessProfile.fitness_style.map((style, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {formatStyle(style)}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="col-span-2">
              <h4 className="font-medium text-sm mb-1">Available Days</h4>
              <div className="flex flex-wrap gap-1">
                {getFormattedDays(match.fitnessProfile.availability_days).map((day, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{day}</Badge>
                ))}
              </div>
            </div>
            
            <div className="col-span-2">
              <h4 className="font-medium text-sm mb-1">Preferred Times</h4>
              <div className="flex flex-wrap gap-1">
                {getFormattedTimeSlots(match.fitnessProfile.preferred_time_slots).map((slot, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{slot}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MatchDetailsDialog;
