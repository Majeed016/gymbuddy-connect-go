
import React from 'react';
import ExistingMatchCard from './ExistingMatchCard';
import { Match, Profile, FitnessProfile } from '@/types/supabase';

interface ExistingMatchesProps {
  matches: Array<Match & {
    otherUser: Profile;
    otherUserFitnessProfile?: FitnessProfile;
  }>;
  currentUserId: string;
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
}

const ExistingMatches: React.FC<ExistingMatchesProps> = ({ 
  matches, 
  currentUserId, 
  onAccept, 
  onReject 
}) => {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-gray-700 mb-2">No matches yet</h3>
        <p className="text-gray-500">
          You haven't connected with any gym buddies yet.
          Go to the "Potential Matches" tab to find potential workout partners!
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {matches.map(match => (
        <ExistingMatchCard
          key={match.id}
          match={match}
          currentUserId={currentUserId}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  );
};

export default ExistingMatches;
