
import { FitnessProfile, Profile, MatchScore } from "@/types/supabase";

/**
 * Calculate a compatibility score between two fitness profiles
 * based on shared goals, preferred workout time, location, and fitness level
 */
export const calculateMatchScore = (
  currentUserProfile: Profile,
  currentUserFitnessProfile: FitnessProfile,
  otherUserProfile: Profile,
  otherUserFitnessProfile: FitnessProfile
): MatchScore => {
  let score = 0;
  const matchReasons: string[] = [];
  
  // +3 points for each matching fitness goal
  if (currentUserFitnessProfile.fitness_goal === otherUserFitnessProfile.fitness_goal) {
    score += 3;
    matchReasons.push(`You both have the same fitness goal: ${formatGoal(currentUserFitnessProfile.fitness_goal)}`);
  }
  
  // +3 points for each matching fitness style
  const sharedStyles = currentUserFitnessProfile.fitness_style.filter(style => 
    otherUserFitnessProfile.fitness_style.includes(style)
  );
  
  if (sharedStyles.length > 0) {
    score += sharedStyles.length * 3;
    matchReasons.push(`You share ${sharedStyles.length} training styles: ${sharedStyles.map(formatStyle).join(', ')}`);
  }
  
  // +2 points for matching time slots
  const sharedTimeSlots = currentUserFitnessProfile.preferred_time_slots.filter(slot => 
    otherUserFitnessProfile.preferred_time_slots.includes(slot)
  );
  
  if (sharedTimeSlots.length > 0) {
    score += Math.min(sharedTimeSlots.length * 2, 6); // Cap at 6 points
    matchReasons.push(`You have ${sharedTimeSlots.length} compatible workout times`);
  }
  
  // +2 points if location is the same
  if (currentUserFitnessProfile.location === otherUserFitnessProfile.location) {
    score += 2;
    matchReasons.push(`You're both in ${currentUserFitnessProfile.location}`);
  }
  
  // +3 points if gym name matches (more specific than just location)
  if (
    currentUserFitnessProfile.gym_name && 
    otherUserFitnessProfile.gym_name && 
    currentUserFitnessProfile.gym_name.toLowerCase() === otherUserFitnessProfile.gym_name.toLowerCase()
  ) {
    score += 3;
    matchReasons.push(`You both work out at ${currentUserFitnessProfile.gym_name}`);
  }
  
  // +1 point if fitness level matches
  if (currentUserFitnessProfile.fitness_level === otherUserFitnessProfile.fitness_level) {
    score += 1;
    matchReasons.push(`You're both at a ${currentUserFitnessProfile.fitness_level} fitness level`);
  }
  
  // +2 points for each matching availability day
  const sharedDays = currentUserFitnessProfile.availability_days.filter(day => 
    otherUserFitnessProfile.availability_days.includes(day)
  );
  
  if (sharedDays.length > 0) {
    score += Math.min(sharedDays.length * 2, 8); // Cap at 8 points
    matchReasons.push(`You share ${sharedDays.length} days of availability`);
  }
  
  // Normalize score to be between 0 and 1
  const maxPossibleScore = 25; // Approximate max score based on our criteria
  const normalizedScore = parseFloat((score / maxPossibleScore).toFixed(2));
  
  return {
    userId: otherUserProfile.id,
    profile: otherUserProfile,
    fitnessProfile: otherUserFitnessProfile,
    compatibilityScore: normalizedScore,
    matchReasons,
  };
};

/**
 * Get the top N matches from a list of potential matches
 */
export const getTopMatches = (matches: MatchScore[], limit: number = 3): MatchScore[] => {
  return [...matches]
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
};

/**
 * Format a fitness goal to be more readable
 */
export const formatGoal = (goal: string): string => {
  const formatMap: Record<string, string> = {
    'bulking': 'Muscle building',
    'cutting': 'Fat loss',
    'maintenance': 'Maintaining fitness',
    'endurance': 'Improving endurance',
    'flexibility': 'Increasing flexibility',
    'general': 'General fitness'
  };
  
  return formatMap[goal] || goal.charAt(0).toUpperCase() + goal.slice(1);
};

/**
 * Format a fitness style to be more readable
 */
export const formatStyle = (style: string): string => {
  const formatMap: Record<string, string> = {
    'cardio': 'Cardio',
    'strength': 'Strength Training',
    'functional': 'Functional Training',
    'hiit': 'HIIT',
    'yoga': 'Yoga',
    'pilates': 'Pilates',
    'calisthenics': 'Calisthenics',
    'crossfit': 'CrossFit',
    'swimming': 'Swimming',
    'running': 'Running'
  };
  
  return formatMap[style] || style.charAt(0).toUpperCase() + style.slice(1);
};

/**
 * Format time slots to be more readable
 */
export const getFormattedTimeSlots = (timeSlots: string[]): string[] => {
  const formatMap: Record<string, string> = {
    'early_morning': 'Early Morning (5am-8am)',
    'morning': 'Morning (8am-11am)',
    'midday': 'Midday (11am-2pm)',
    'afternoon': 'Afternoon (2pm-5pm)',
    'evening': 'Evening (5pm-8pm)',
    'late_evening': 'Late Evening (8pm-11pm)',
  };
  
  return timeSlots.map(slot => formatMap[slot] || slot);
};

/**
 * Format days to be more readable
 */
export const getFormattedDays = (days: string[]): string[] => {
  const formatMap: Record<string, string> = {
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday',
    'sun': 'Sunday',
  };
  
  return days.map(day => formatMap[day] || day);
};
