import { Coordinates } from './coordinates.model';
import { Guess } from './scoring.model';

/**
 * Performance categories for year accuracy
 */
export type YearAccuracy = 'perfect' | 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Performance categories for location accuracy
 */
export type LocationAccuracy = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Enhanced photo metadata for detailed feedback
 */
export interface EnhancedPhotoMetadata {
  photographer?: string;
  historicalContext?: string;
  interestingFacts?: string[];
  detailedDescription?: string;
  era?: string;
  significance?: string;
}

/**
 * Enhanced feedback provided after each guess
 */
export interface EnhancedFeedback {
  correctYear: number;
  correctLocation: Coordinates;
  userGuess: Guess;
  distanceKm: number;
  yearAccuracy: YearAccuracy;
  locationAccuracy: LocationAccuracy;
  photoContext: EnhancedPhotoMetadata;
  yearDifference: number;
  performanceSummary: string;
}

/**
 * Validates enhanced photo metadata
 * @param metadata - The metadata to validate
 * @returns true if metadata is valid, false otherwise
 */
export function validateEnhancedPhotoMetadata(metadata: EnhancedPhotoMetadata): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }

  // All fields are optional, but if present must be strings or string arrays
  if (metadata.photographer !== undefined && typeof metadata.photographer !== 'string') {
    return false;
  }

  if (metadata.historicalContext !== undefined && typeof metadata.historicalContext !== 'string') {
    return false;
  }

  if (metadata.detailedDescription !== undefined && typeof metadata.detailedDescription !== 'string') {
    return false;
  }

  if (metadata.era !== undefined && typeof metadata.era !== 'string') {
    return false;
  }

  if (metadata.significance !== undefined && typeof metadata.significance !== 'string') {
    return false;
  }

  if (metadata.interestingFacts !== undefined) {
    if (!Array.isArray(metadata.interestingFacts)) {
      return false;
    }
    for (const fact of metadata.interestingFacts) {
      if (typeof fact !== 'string') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates enhanced feedback object
 * @param feedback - The feedback to validate
 * @returns true if feedback is valid, false otherwise
 */
export function validateEnhancedFeedback(feedback: EnhancedFeedback): boolean {
  if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback)) {
    return false;
  }

  // Validate correct year
  if (typeof feedback.correctYear !== 'number' || 
      feedback.correctYear < 1900 || 
      feedback.correctYear > new Date().getFullYear()) {
    return false;
  }

  // Validate correct location
  if (!feedback.correctLocation || 
      typeof feedback.correctLocation.latitude !== 'number' ||
      typeof feedback.correctLocation.longitude !== 'number') {
    return false;
  }

  // Validate user guess
  if (!feedback.userGuess || 
      typeof feedback.userGuess.year !== 'number' ||
      !feedback.userGuess.coordinates) {
    return false;
  }

  // Validate distance
  if (typeof feedback.distanceKm !== 'number' || feedback.distanceKm < 0) {
    return false;
  }

  // Validate year difference
  if (typeof feedback.yearDifference !== 'number') {
    return false;
  }

  // Validate accuracy categories
  const validYearAccuracies: YearAccuracy[] = ['perfect', 'excellent', 'good', 'fair', 'poor'];
  const validLocationAccuracies: LocationAccuracy[] = ['excellent', 'good', 'fair', 'poor'];

  if (!validYearAccuracies.includes(feedback.yearAccuracy)) {
    return false;
  }

  if (!validLocationAccuracies.includes(feedback.locationAccuracy)) {
    return false;
  }

  // Validate performance summary
  if (typeof feedback.performanceSummary !== 'string') {
    return false;
  }

  // Validate photo context
  if (!validateEnhancedPhotoMetadata(feedback.photoContext)) {
    return false;
  }

  return true;
}