
export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type FitnessProfile = {
  id: string;
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
  fitness_style: string[];
  preferred_time_slots: string[];
  location: string;
  fitness_goal: 'bulking' | 'cutting' | 'maintenance' | 'endurance' | 'flexibility' | 'general';
  gym_name: string | null;
  availability_days: string[];
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  compatibility_score: number | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  read: boolean | null;
  created_at: string;
};

export type Workout = {
  id: string;
  match_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

export type MatchWithProfiles = Match & {
  otherUser: Profile;
  otherUserFitnessProfile?: FitnessProfile;
};

export type MatchWithOtherUser = Match & {
  otherUser: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
};

export type MatchScore = {
  userId: string;
  profile: Profile;
  fitnessProfile: FitnessProfile;
  compatibilityScore: number;
  matchReasons: string[];
};
