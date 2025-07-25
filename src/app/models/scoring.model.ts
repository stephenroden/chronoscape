import { Coordinates, validateCoordinates } from './coordinates.model';

/**
 * Represents a user's guess for a photo
 */
export interface Guess {
  year: number;
  coordinates: Coordinates;
}

/**
 * Represents the score for a single photo
 */
export interface Score {
  photoId: string;
  yearScore: number;
  locationScore: number;
  totalScore: number;
}

/**
 * State for managing scoring throughout the game
 */
export interface ScoringState {
  scores: Score[];
  totalScore: number;
  currentGuess: Guess | null;
  loading: boolean;
  error: string | null;
}

/**
 * Validates a user's year guess according to game rules
 * @param year - The year guess to validate
 * @returns true if year guess is valid, false otherwise
 */
export function validateYearGuess(year: number): boolean {
  if (typeof year !== 'number' || !Number.isInteger(year)) {
    return false;
  }

  const currentYear = new Date().getFullYear();
  
  // Year must be between 1900 and current year (inclusive)
  if (year < 1900 || year > currentYear) {
    return false;
  }

  return true;
}

/**
 * Validates a complete guess object
 * @param guess - The guess to validate
 * @returns true if guess is valid, false otherwise
 */
export function validateGuess(guess: Guess): boolean {
  if (!guess || typeof guess !== 'object') {
    return false;
  }

  // Validate year guess
  if (!validateYearGuess(guess.year)) {
    return false;
  }

  // Validate coordinates using existing validation function
  if (!guess.coordinates || !validateCoordinates(guess.coordinates)) {
    return false;
  }

  return true;
}

/**
 * Validates a score object
 * @param score - The score to validate
 * @returns true if score is valid, false otherwise
 */
export function validateScore(score: Score): boolean {
  if (!score || typeof score !== 'object') {
    return false;
  }

  // Validate photo ID
  if (!score.photoId || typeof score.photoId !== 'string' || score.photoId.trim().length === 0) {
    return false;
  }

  // Validate year score (0-5000 points)
  if (typeof score.yearScore !== 'number' || 
      score.yearScore < 0 || 
      score.yearScore > 5000 || 
      !Number.isInteger(score.yearScore)) {
    return false;
  }

  // Validate location score (0-5000 points)
  if (typeof score.locationScore !== 'number' || 
      score.locationScore < 0 || 
      score.locationScore > 5000 || 
      !Number.isInteger(score.locationScore)) {
    return false;
  }

  // Validate total score (should equal sum of year and location scores)
  const expectedTotal = score.yearScore + score.locationScore;
  if (score.totalScore !== expectedTotal) {
    return false;
  }

  return true;
}

/**
 * Validates scoring state
 * @param scoringState - The scoring state to validate
 * @returns true if scoring state is valid, false otherwise
 */
export function validateScoringState(scoringState: ScoringState): boolean {
  if (!scoringState || typeof scoringState !== 'object') {
    return false;
  }

  // Validate scores array
  if (!Array.isArray(scoringState.scores)) {
    return false;
  }

  // Validate each score in the array
  for (const score of scoringState.scores) {
    if (!validateScore(score)) {
      return false;
    }
  }

  // Validate total score
  if (typeof scoringState.totalScore !== 'number' || 
      scoringState.totalScore < 0 || 
      !Number.isInteger(scoringState.totalScore)) {
    return false;
  }

  // Total score should equal sum of all individual scores
  const expectedTotal = scoringState.scores.reduce((sum, score) => sum + score.totalScore, 0);
  if (scoringState.totalScore !== expectedTotal) {
    return false;
  }

  // Current guess can be null or a valid Guess object
  if (scoringState.currentGuess !== null && !validateGuess(scoringState.currentGuess)) {
    return false;
  }

  return true;
}

