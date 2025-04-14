
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MatchScore } from '@/types/supabase';
import MatchCard from '@/components/MatchCard';
import { getTopMatches } from '@/utils/matchingUtils';
import MatchDetailsDialog from '@/components/MatchDetailsDialog';

interface PotentialMatchesProps {
  potentialMatches: MatchScore[];
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
}

const PotentialMatches: React.FC<PotentialMatchesProps> = ({ 
  potentialMatches, 
  onAccept, 
  onReject 
}) => {
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchScore | null>(null);
  
  // Get top 3 matches unless showAllMatches is true
  const displayedMatches = showAllMatches 
    ? potentialMatches 
    : getTopMatches(potentialMatches, 3);
    
  if (displayedMatches.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-gray-700 mb-2">No potential matches found</h3>
        <p className="text-gray-500">
          We couldn't find any potential gym buddies for you at the moment. 
          Check back later or adjust your fitness profile to find more matches.
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedMatches.map(match => (
          <MatchCard 
            key={match.userId}
            match={match}
            onAccept={onAccept}
            onReject={onReject}
            onViewDetails={() => setSelectedMatch(match)}
          />
        ))}
      </div>
      
      {potentialMatches.length > 3 && (
        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => setShowAllMatches(!showAllMatches)}
            className="border-purple-200 text-purple-700"
          >
            {showAllMatches ? "Show Top 3 Matches" : `Show All Matches (${potentialMatches.length})`}
          </Button>
        </div>
      )}

      {selectedMatch && (
        <MatchDetailsDialog
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onAccept={onAccept}
          onReject={onReject}
        />
      )}
    </>
  );
};

export default PotentialMatches;
