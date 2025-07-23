import { Injectable } from '@angular/core';
import { Coordinates } from '../models/coordinates.model';
import { Score, Guess } from '../models/scoring.model';

/**
 * Service for calculating scores based on year and location accuracy
 */
@Injectable({
  providedIn: 'root'
})
export class ScoringService {

  /**
   * Calculates score for year guess based on accuracy
   * @param guess - The guessed year
   * @param actual - The actual year
   * @returns Score points (0-5000)
   */
  calculateYearScore(guess: number, actual: number): number {
    const difference = Math.abs(guess - actual);

    // Exact match: 5000 points
    if (difference === 0) {
      return 5000;
    }

    // Within 1 year: 4500 points
    if (difference <= 1) {
      return 4500;
    }

    // Within 5 years: 3000 points
    if (difference <= 5) {
      return 3000;
    }

    // Within 10 years: 1500 points
    if (difference <= 10) {
      return 1500;
    }

    // More than 10 years: 0 points
    return 0;
  }

  /**
   * Calculates score for location guess based on distance accuracy
   * @param guessCoords - The guessed coordinates
   * @param actualCoords - The actual coordinates
   * @returns Score points (0-5000)
   */
  calculateLocationScore(guessCoords: Coordinates, actualCoords: Coordinates): number {
    const distance = this.calculateDistance(guessCoords, actualCoords);

    // Within 1km: 5000 points
    if (distance <= 1) {
      return 5000;
    }

    // Within 10km: 4000 points
    if (distance <= 10) {
      return 4000;
    }

    // Within 50km: 2500 points
    if (distance <= 50) {
      return 2500;
    }

    // Within 200km: 1000 points
    if (distance <= 200) {
      return 1000;
    }

    // More than 200km: 0 points
    return 0;
  }

  /**
   * Calculates the distance between two coordinates using the Haversine formula
   * @param coord1 - First coordinate point
   * @param coord2 - Second coordinate point
   * @returns Distance in kilometers
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    
    const lat1Rad = this.toRadians(coord1.latitude);
    const lat2Rad = this.toRadians(coord2.latitude);
    const deltaLatRad = this.toRadians(coord2.latitude - coord1.latitude);
    const deltaLonRad = this.toRadians(coord2.longitude - coord1.longitude);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Calculates total score for a complete guess
   * @param photoId - ID of the photo being scored
   * @param guess - User's guess containing year and coordinates
   * @param actualYear - The actual year of the photo
   * @param actualCoords - The actual coordinates of the photo
   * @returns Complete score object
   */
  calculateScore(
    photoId: string, 
    guess: Guess, 
    actualYear: number, 
    actualCoords: Coordinates
  ): Score {
    const yearScore = this.calculateYearScore(guess.year, actualYear);
    const locationScore = this.calculateLocationScore(guess.coordinates, actualCoords);
    
    return {
      photoId,
      yearScore,
      locationScore,
      totalScore: yearScore + locationScore
    };
  }

  /**
   * Calculates total score from an array of individual scores
   * @param scores - Array of individual photo scores
   * @returns Total cumulative score
   */
  getTotalScore(scores: Score[]): number {
    return scores.reduce((total, score) => total + score.totalScore, 0);
  }

  /**
   * Converts degrees to radians
   * @param degrees - Angle in degrees
   * @returns Angle in radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}