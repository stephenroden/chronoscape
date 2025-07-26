import { Injectable } from '@angular/core';
import { Photo } from '../models/photo.model';
import { Coordinates } from '../models/coordinates.model';

/**
 * Service for parsing and processing photo metadata from Wikimedia Commons
 */
@Injectable({
  providedIn: 'root'
})
export class PhotoMetadataService {
  private readonly MIN_YEAR = 1900;
  private readonly MAX_YEAR = new Date().getFullYear();

  /**
   * Parse date from various metadata formats
   */
  parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    // Remove HTML tags if present
    const cleanDate = dateString.replace(/<[^>]*>/g, '').trim();
    
    // Try various date formats
    const dateFormats = [
      /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
      /(\d{4})\/(\d{2})\/(\d{2})/,  // YYYY/MM/DD
      /(\d{2})\/(\d{2})\/(\d{4})/,  // MM/DD/YYYY
      /(\d{4})/  // Just year
    ];

    for (const format of dateFormats) {
      const match = cleanDate.match(format);
      if (match) {
        if (format === dateFormats[3]) { // Just year
          return new Date(parseInt(match[1]), 0, 1);
        } else if (format === dateFormats[2]) { // MM/DD/YYYY
          return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
        } else { // YYYY-MM-DD or YYYY/MM/DD
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
      }
    }

    // Fallback to Date constructor
    const fallbackDate = new Date(cleanDate);
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
  }

  /**
   * Parse GPS coordinates from metadata
   */
  parseCoordinates(latString?: string, lonString?: string): Coordinates | null {
    if (!latString || !lonString) return null;

    try {
      // Remove HTML tags and extract numeric values
      const cleanLat = latString.replace(/<[^>]*>/g, '').trim();
      const cleanLon = lonString.replace(/<[^>]*>/g, '').trim();

      // Parse DMS (Degrees, Minutes, Seconds) format if present
      const dmsRegex = /(\d+)°\s*(\d+)'?\s*(\d+(?:\.\d+)?)"?\s*([NSEW])/;
      
      let latitude: number;
      let longitude: number;

      const latMatch = cleanLat.match(dmsRegex);
      if (latMatch) {
        const [, degrees, minutes, seconds, direction] = latMatch;
        latitude = parseInt(degrees) + parseInt(minutes) / 60 + parseFloat(seconds) / 3600;
        if (direction === 'S') latitude = -latitude;
      } else {
        latitude = parseFloat(cleanLat);
      }

      const lonMatch = cleanLon.match(dmsRegex);
      if (lonMatch) {
        const [, degrees, minutes, seconds, direction] = lonMatch;
        longitude = parseInt(degrees) + parseInt(minutes) / 60 + parseFloat(seconds) / 3600;
        if (direction === 'W') longitude = -longitude;
      } else {
        longitude = parseFloat(cleanLon);
      }

      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude) || 
          latitude < -90 || latitude > 90 || 
          longitude < -180 || longitude > 180) {
        return null;
      }

      return { latitude, longitude };
    } catch (error) {
      console.warn('Error parsing coordinates:', error);
      return null;
    }
  }

  /**
   * Extract year from date
   */
  extractYear(date: Date | null): number | null {
    if (!date) return null;
    const year = date.getFullYear();
    return (year >= this.MIN_YEAR && year <= this.MAX_YEAR) ? year : null;
  }

  /**
   * Clean and format description text
   */
  cleanDescription(description?: string): string {
    if (!description) return '';
    
    return description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Extract license information
   */
  extractLicense(extmetadata: any): string {
    const license = extmetadata?.LicenseShortName?.value || 
                   extmetadata?.UsageTerms?.value || 
                   'Unknown';
    return this.cleanDescription(license);
  }

  /**
   * Extract artist/photographer information
   */
  extractArtist(extmetadata: any): string {
    const artist = extmetadata?.Artist?.value || 'Unknown';
    return this.cleanDescription(artist);
  }
}