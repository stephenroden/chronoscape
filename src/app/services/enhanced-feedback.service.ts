import { Injectable } from '@angular/core';
import { Coordinates } from '../models/coordinates.model';
import { Photo } from '../models/photo.model';
import { Guess } from '../models/scoring.model';
import { 
  EnhancedFeedback, 
  EnhancedPhotoMetadata, 
  YearAccuracy, 
  LocationAccuracy 
} from '../models/enhanced-feedback.model';
import { ScoringService } from './scoring.service';

/**
 * Service for generating detailed post-guess feedback with enhanced information
 */
@Injectable({
  providedIn: 'root'
})
export class EnhancedFeedbackService {

  constructor(private scoringService: ScoringService) {}

  /**
   * Generates comprehensive feedback for a user's guess
   * @param photo - The photo that was guessed
   * @param guess - The user's guess
   * @returns Enhanced feedback with detailed information
   */
  generateFeedback(photo: Photo, guess: Guess): EnhancedFeedback {
    const distanceKm = this.scoringService.calculateDistance(guess.coordinates, photo.coordinates);
    const yearDifference = Math.abs(guess.year - photo.year);
    
    const yearAccuracy = this.categorizeYearAccuracy(yearDifference);
    const locationAccuracy = this.categorizeLocationAccuracy(distanceKm);
    
    const photoContext = this.enhancePhotoMetadata(photo);
    const performanceSummary = this.generatePerformanceSummary(yearAccuracy, locationAccuracy, yearDifference, distanceKm);

    return {
      correctYear: photo.year,
      correctLocation: photo.coordinates,
      userGuess: guess,
      distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
      yearAccuracy,
      locationAccuracy,
      photoContext,
      yearDifference,
      performanceSummary
    };
  }

  /**
   * Calculates distance between two coordinates using the Haversine formula
   * @param coord1 - First coordinate point
   * @param coord2 - Second coordinate point
   * @returns Distance in kilometers
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    return this.scoringService.calculateDistance(coord1, coord2);
  }

  /**
   * Categorizes year accuracy based on the difference from correct year
   * @param yearDifference - Absolute difference between guess and correct year
   * @returns Year accuracy category
   */
  categorizeYearAccuracy(yearDifference: number): YearAccuracy {
    if (yearDifference === 0) {
      return 'perfect';
    } else if (yearDifference <= 1) {
      return 'excellent';
    } else if (yearDifference <= 5) {
      return 'good';
    } else if (yearDifference <= 10) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Categorizes location accuracy based on distance from correct location
   * @param distanceKm - Distance in kilometers from correct location
   * @returns Location accuracy category
   */
  categorizeLocationAccuracy(distanceKm: number): LocationAccuracy {
    if (distanceKm <= 10) {
      return 'excellent';
    } else if (distanceKm <= 50) {
      return 'good';
    } else if (distanceKm <= 200) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Enhances photo metadata with additional context and interesting facts
   * @param photo - The photo to enhance
   * @returns Enhanced photo metadata
   */
  enhancePhotoMetadata(photo: Photo): EnhancedPhotoMetadata {
    const enhanced: EnhancedPhotoMetadata = {
      photographer: photo.metadata.photographer,
      detailedDescription: photo.description || this.generateDetailedDescription(photo),
      historicalContext: this.generateHistoricalContext(photo),
      interestingFacts: this.generateInterestingFacts(photo),
      era: this.determineEra(photo.year),
      significance: this.generateSignificance(photo)
    };

    return enhanced;
  }

  /**
   * Generates a performance summary based on accuracy categories
   * @param yearAccuracy - Year accuracy category
   * @param locationAccuracy - Location accuracy category
   * @param yearDifference - Actual year difference
   * @param distanceKm - Actual distance in kilometers
   * @returns Human-readable performance summary
   */
  generatePerformanceSummary(
    yearAccuracy: YearAccuracy, 
    locationAccuracy: LocationAccuracy, 
    yearDifference: number, 
    distanceKm: number
  ): string {
    const yearSummary = this.getYearSummaryText(yearAccuracy, yearDifference);
    const locationSummary = this.getLocationSummaryText(locationAccuracy, distanceKm);
    
    return `${yearSummary} ${locationSummary}`;
  }

  /**
   * Generates detailed description if not provided
   * @param photo - The photo to describe
   * @returns Generated description
   */
  private generateDetailedDescription(photo: Photo): string {
    const era = this.determineEra(photo.year);
    return `A historical photograph from ${photo.year}, capturing a moment from the ${era} era. This image provides a glimpse into life during this period.`;
  }

  /**
   * Generates historical context for the photo
   * @param photo - The photo to provide context for
   * @returns Historical context string
   */
  private generateHistoricalContext(photo: Photo): string {
    const era = this.determineEra(photo.year);
    const decade = Math.floor(photo.year / 10) * 10;
    
    // Generate context based on era and decade
    if (photo.year >= 1900 && photo.year < 1920) {
      return `This photograph was taken during the early 20th century, a time of rapid industrialization and social change. The ${decade}s were marked by technological advancement and cultural transformation.`;
    } else if (photo.year >= 1920 && photo.year < 1940) {
      return `Captured during the interwar period, this image reflects life in the ${decade}s. This era saw significant economic and social developments, including the Roaring Twenties and the Great Depression.`;
    } else if (photo.year >= 1940 && photo.year < 1960) {
      return `This photograph dates from the mid-20th century, during the ${decade}s. This period was shaped by World War II and its aftermath, leading to major social and technological changes.`;
    } else if (photo.year >= 1960 && photo.year < 1980) {
      return `From the ${decade}s, this image captures a time of cultural revolution and social change. This era was marked by significant movements in civil rights, technology, and popular culture.`;
    } else if (photo.year >= 1980 && photo.year < 2000) {
      return `This photograph from the ${decade}s represents the late 20th century, a period of technological advancement and globalization. The era saw rapid changes in communication and lifestyle.`;
    } else {
      return `This early 21st century photograph from ${photo.year} captures our modern era, characterized by digital technology and global connectivity.`;
    }
  }

  /**
   * Generates interesting facts about the photo's time period
   * @param photo - The photo to generate facts for
   * @returns Array of interesting facts
   */
  private generateInterestingFacts(photo: Photo): string[] {
    const facts: string[] = [];
    const decade = Math.floor(photo.year / 10) * 10;
    
    // Add era-specific facts
    if (photo.year >= 1900 && photo.year < 1920) {
      facts.push(`In ${photo.year}, the world was experiencing rapid industrialization and urbanization.`);
      facts.push('Photography was becoming more accessible to the general public during this period.');
    } else if (photo.year >= 1920 && photo.year < 1940) {
      facts.push(`The ${decade}s saw the rise of mass media and popular culture.`);
      facts.push('Color photography was still experimental and expensive during this time.');
    } else if (photo.year >= 1940 && photo.year < 1960) {
      facts.push(`World War II significantly impacted daily life during the ${decade}s.`);
      facts.push('This period marked the beginning of the modern suburban lifestyle.');
    } else if (photo.year >= 1960 && photo.year < 1980) {
      facts.push(`The ${decade}s were a time of significant social and cultural change.`);
      facts.push('Color photography became more widely available and affordable.');
    } else if (photo.year >= 1980 && photo.year < 2000) {
      facts.push(`The ${decade}s saw the rise of personal computers and digital technology.`);
      facts.push('Film photography reached its peak before digital cameras emerged.');
    } else {
      facts.push('Digital photography revolutionized how we capture and share images.');
      facts.push('Social media began changing how photographs are distributed and viewed.');
    }

    // Add location-specific fact if possible
    facts.push(`This photograph was taken at coordinates ${photo.coordinates.latitude.toFixed(4)}, ${photo.coordinates.longitude.toFixed(4)}.`);

    return facts;
  }

  /**
   * Determines the historical era based on the year
   * @param year - The year to categorize
   * @returns Era description
   */
  private determineEra(year: number): string {
    if (year >= 1900 && year < 1920) {
      return 'Edwardian/Early Modern';
    } else if (year >= 1920 && year < 1940) {
      return 'Interwar Period';
    } else if (year >= 1940 && year < 1960) {
      return 'Mid-Century Modern';
    } else if (year >= 1960 && year < 1980) {
      return 'Cultural Revolution';
    } else if (year >= 1980 && year < 2000) {
      return 'Late 20th Century';
    } else {
      return 'Digital Age';
    }
  }

  /**
   * Generates significance description for the photo
   * @param photo - The photo to describe significance for
   * @returns Significance description
   */
  private generateSignificance(photo: Photo): string {
    return `This photograph serves as a historical document, preserving a moment from ${photo.year} and providing insight into the visual culture and daily life of that era.`;
  }

  /**
   * Gets human-readable text for year accuracy
   * @param yearAccuracy - Year accuracy category
   * @param yearDifference - Actual year difference
   * @returns Human-readable year summary
   */
  private getYearSummaryText(yearAccuracy: YearAccuracy, yearDifference: number): string {
    switch (yearAccuracy) {
      case 'perfect':
        return 'Perfect year guess! You got the exact year right.';
      case 'excellent':
        return `Excellent year guess! You were only ${yearDifference} year${yearDifference === 1 ? '' : 's'} off.`;
      case 'good':
        return `Good year guess! You were ${yearDifference} years off.`;
      case 'fair':
        return `Fair year guess. You were ${yearDifference} years off.`;
      case 'poor':
        return `Your year guess was ${yearDifference} years off.`;
      default:
        return 'Year guess evaluated.';
    }
  }

  /**
   * Gets human-readable text for location accuracy
   * @param locationAccuracy - Location accuracy category
   * @param distanceKm - Actual distance in kilometers
   * @returns Human-readable location summary
   */
  private getLocationSummaryText(locationAccuracy: LocationAccuracy, distanceKm: number): string {
    const formattedDistance = distanceKm < 1 ? 
      `${Math.round(distanceKm * 1000)} meters` : 
      `${Math.round(distanceKm * 100) / 100} km`;

    switch (locationAccuracy) {
      case 'excellent':
        return `Excellent location guess! You were only ${formattedDistance} away.`;
      case 'good':
        return `Good location guess! You were ${formattedDistance} away.`;
      case 'fair':
        return `Fair location guess. You were ${formattedDistance} away.`;
      case 'poor':
        return `Your location guess was ${formattedDistance} away from the correct location.`;
      default:
        return 'Location guess evaluated.';
    }
  }
}