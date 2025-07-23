import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, filter } from 'rxjs/operators';
import { Photo, validatePhotoMetadata } from '../models/photo.model';
import { Coordinates } from '../models/coordinates.model';

/**
 * Raw response structure from Wikimedia Commons API
 */
interface WikimediaImageInfoResponse {
  query: {
    pages: {
      [key: string]: {
        title: string;
        imageinfo: Array<{
          url: string;
          extmetadata?: {
            DateTime?: { value: string };
            DateTimeOriginal?: { value: string };
            GPSLatitude?: { value: string };
            GPSLongitude?: { value: string };
            Artist?: { value: string };
            LicenseShortName?: { value: string };
            UsageTerms?: { value: string };
            ImageDescription?: { value: string };
          };
          metadata?: Array<{
            name: string;
            value: string | number;
          }>;
        }>;
      };
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private readonly API_BASE_URL = 'https://commons.wikimedia.org/w/api.php';
  private readonly MIN_YEAR = 1900;
  private readonly MAX_YEAR = new Date().getFullYear();

  constructor(private http: HttpClient) { }

  /**
   * Fetches random historical photos from Wikimedia Commons using geosearch
   * @param count - Number of photos to fetch
   * @returns Observable of Photo array
   */
  fetchRandomPhotos(count: number): Observable<Photo[]> {
    const locations = this.getRandomLocations(count);

    return forkJoin(
      locations.map(location => this.searchPhotosByLocation(location))
    ).pipe(
      map(locationResults => locationResults.flat()),
      switchMap(searchResults => this.getPhotoDetails(searchResults)),
      map(photos => this.filterValidPhotos(photos)),
      map(photos => this.selectDiversePhotos(photos, count)),
      catchError(error => {
        console.error('Error fetching photos:', error);
        return of([]);
      })
    );
  }

  /**
   * Validates photo metadata according to game requirements
   * @param photo - Photo to validate
   * @returns true if photo meets requirements
   */
  validatePhotoMetadata(photo: Photo): boolean {
    return validatePhotoMetadata(photo);
  }

  /**
   * Processes raw Wikimedia data into Photo objects
   * @param rawData - Raw API response data
   * @returns Processed Photo object or null if invalid
   */
  processPhotoData(rawData: any): Photo | null {
    try {
      if (!rawData) return null;
      const imageInfo = rawData.imageinfo?.[0];
      if (!imageInfo) return null;

      const extmetadata = imageInfo.extmetadata || {};
      const metadata = imageInfo.metadata || [];

      // Extract year from various date fields
      const year = this.extractYear(extmetadata);
      if (!year || year < this.MIN_YEAR || year > this.MAX_YEAR) {
        return null;
      }

      // Extract coordinates
      const coordinates = this.extractCoordinates(extmetadata, metadata);
      if (!coordinates || (coordinates.latitude === 0 && coordinates.longitude === 0)) return null;

      // Create photo object
      const photo: Photo = {
        id: rawData.title.replace('File:', ''),
        url: imageInfo.url,
        title: this.cleanTitle(rawData.title),
        description: this.extractDescription(extmetadata),
        year,
        coordinates,
        source: 'Wikimedia Commons',
        metadata: {
          photographer: this.extractArtist(extmetadata),
          license: this.extractLicense(extmetadata),
          originalSource: imageInfo.url,
          dateCreated: new Date(year, 0, 1) // Use January 1st of the year
        }
      };

      return this.validatePhotoMetadata(photo) ? photo : null;
    } catch (error) {
      console.error('Error processing photo data:', error);
      return null;
    }
  }

  /**
   * Gets diverse geographic locations for photo searching
   */
  private getRandomLocations(count: number): Coordinates[] {
    const allLocations: Coordinates[] = [
      { latitude: 40.7589, longitude: -73.9851 }, // New York City
      { latitude: 51.5074, longitude: -0.1278 },  // London
      { latitude: 48.8566, longitude: 2.3522 },   // Paris
      { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
      { latitude: -33.8688, longitude: 151.2093 }, // Sydney
      { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
      { latitude: 52.5200, longitude: 13.4050 },  // Berlin
      { latitude: 41.9028, longitude: 12.4964 },  // Rome
      { latitude: 55.7558, longitude: 37.6176 },  // Moscow
      { latitude: 39.9042, longitude: 116.4074 }, // Beijing
      { latitude: -22.9068, longitude: -43.1729 }, // Rio de Janeiro
      { latitude: 19.4326, longitude: -99.1332 }, // Mexico City
      { latitude: 30.0444, longitude: 31.2357 },  // Cairo
      { latitude: -26.2041, longitude: 28.0473 }, // Johannesburg
      { latitude: 28.6139, longitude: 77.2090 },  // New Delhi
    ];

    // Shuffle and take the requested count
    const shuffled = [...allLocations].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Searches for photos near a specific location using geosearch
   */
  private searchPhotosByLocation(location: Coordinates): Observable<any[]> {
    const params = new HttpParams()
      .set('action', 'query')
      .set('list', 'geosearch')
      .set('gscoord', `${location.latitude}|${location.longitude}`)
      .set('gsradius', '10000') // 10km radius
      .set('gslimit', '20') // Get more results per location
      .set('gsnamespace', '6') // File namespace
      .set('format', 'json')
      .set('origin', '*');

    return this.http.get<any>(this.API_BASE_URL, { params })
      .pipe(
        map(response => response.query?.geosearch || []),
        filter(results => results.length > 0),
        catchError(error => {
          console.error('Geosearch error for location:', location, error);
          return of([]);
        })
      );
  }

  /**
   * Gets detailed information for multiple photos, chunking requests to respect API limits
   */
  private getPhotoDetails(searchResults: any[]): Observable<Photo[]> {
    if (!searchResults.length) return of([]);

    // Chunk the results to respect the API limit of 50 titles per request
    const chunks = this.chunkArray(searchResults, 50);

    return forkJoin(
      chunks.map(chunk => this.getPhotoDetailsChunk(chunk))
    ).pipe(
      map(chunkResults => chunkResults.flat()),
      catchError(error => {
        console.error('Photo details error:', error);
        return of([]);
      })
    );
  }

  /**
   * Gets photo details for a single chunk of results
   */
  private getPhotoDetailsChunk(searchResults: any[]): Observable<Photo[]> {
    const titles = searchResults.map(result => result.title).join('|');
    const params = new HttpParams()
      .set('action', 'query')
      .set('titles', titles)
      .set('prop', 'imageinfo')
      .set('iiprop', 'url|metadata|extmetadata')
      .set('format', 'json')
      .set('origin', '*');

    return this.http.get<WikimediaImageInfoResponse>(this.API_BASE_URL, { params })
      .pipe(
        map(response => {
          const pages = response.query?.pages || {};
          const photos: Photo[] = [];

          Object.values(pages).forEach(page => {
            const photo = this.processPhotoData(page);
            if (photo) {
              photos.push(photo);
            }
          });

          return photos;
        }),
        catchError(error => {
          console.error('Photo details chunk error:', error);
          return of([]);
        })
      );
  }

  /**
   * Utility function to chunk an array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Filters photos to ensure they meet game requirements
   */
  private filterValidPhotos(photos: Photo[]): Photo[] {
    return photos.filter(photo => {
      // Ensure diverse geographical distribution by checking if coordinates are not too clustered
      return this.validatePhotoMetadata(photo) &&
        photo.year >= this.MIN_YEAR &&
        photo.year <= this.MAX_YEAR &&
        photo.coordinates.latitude !== 0 &&
        photo.coordinates.longitude !== 0;
    });
  }

  /**
   * Selects diverse photos from the filtered results
   */
  private selectDiversePhotos(photos: Photo[], count: number): Photo[] {
    if (photos.length <= count) return photos;

    // Sort by year to get temporal diversity
    const sortedPhotos = [...photos].sort((a, b) => a.year - b.year);

    // Select photos with good temporal and spatial distribution
    const selected: Photo[] = [];
    const step = Math.floor(sortedPhotos.length / count);

    for (let i = 0; i < count && i * step < sortedPhotos.length; i++) {
      const index = i * step;
      selected.push(sortedPhotos[index]);
    }

    // If we don't have enough, fill with remaining photos
    while (selected.length < count && selected.length < photos.length) {
      const remaining = photos.filter(p => !selected.includes(p));
      if (remaining.length > 0) {
        selected.push(remaining[0]);
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Extracts year from various metadata fields
   */
  private extractYear(extmetadata: any): number | null {
    const dateFields = ['DateTimeOriginal', 'DateTime', 'DateTimeDigitized'];

    for (const field of dateFields) {
      if (extmetadata[field]?.value) {
        const dateStr = extmetadata[field].value;
        const year = this.parseYearFromString(dateStr);
        if (year) return year;
      }
    }

    return null;
  }

  /**
   * Parses year from various date string formats
   */
  private parseYearFromString(dateStr: string): number | null {
    // Try various date formats
    const yearMatches = [
      /(\d{4})-\d{2}-\d{2}/, // YYYY-MM-DD
      /(\d{4}):\d{2}:\d{2}/, // YYYY:MM:DD
      /(\d{4})/, // Just year
    ];

    for (const regex of yearMatches) {
      const match = dateStr.match(regex);
      if (match) {
        const year = parseInt(match[1], 10);
        if (year >= this.MIN_YEAR && year <= this.MAX_YEAR) {
          return year;
        }
      }
    }

    return null;
  }

  /**
   * Extracts coordinates from metadata
   */
  private extractCoordinates(extmetadata: any, metadata: any[]): Coordinates | null {
    let latitude: number | null = null;
    let longitude: number | null = null;

    // Try extmetadata first
    if (extmetadata.GPSLatitude?.value && extmetadata.GPSLongitude?.value) {
      latitude = this.parseCoordinate(extmetadata.GPSLatitude.value);
      longitude = this.parseCoordinate(extmetadata.GPSLongitude.value);
    }

    // Try metadata array as fallback
    if ((latitude === null || longitude === null) && metadata) {
      const latMeta = metadata.find(m => m.name === 'GPSLatitude');
      const lonMeta = metadata.find(m => m.name === 'GPSLongitude');

      if (latMeta) latitude = this.parseCoordinate(latMeta.value);
      if (lonMeta) longitude = this.parseCoordinate(lonMeta.value);
    }

    if (latitude !== null && longitude !== null &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }

    return null;
  }

  /**
   * Parses coordinate from various formats
   */
  private parseCoordinate(value: string | number): number | null {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;

    // Handle DMS format first (before decimal parsing)
    const dmsMatch = value.match(/(\d+)°\s*(\d+)'\s*(\d+(?:\.\d+)?)"?\s*([NSEW])?/);
    if (dmsMatch) {
      const degrees = parseInt(dmsMatch[1], 10);
      const minutes = parseInt(dmsMatch[2], 10);
      const seconds = parseFloat(dmsMatch[3]);
      const direction = dmsMatch[4];

      let result = degrees + minutes / 60 + seconds / 3600;
      if (direction === 'S' || direction === 'W') {
        result = -result;
      }
      return result;
    }

    // Handle simpler DMS format without quotes
    const simpleDmsMatch = value.match(/(\d+)°(\d+)'(\d+(?:\.\d+)?)([NSEW])?/);
    if (simpleDmsMatch) {
      const degrees = parseInt(simpleDmsMatch[1], 10);
      const minutes = parseInt(simpleDmsMatch[2], 10);
      const seconds = parseFloat(simpleDmsMatch[3]);
      const direction = simpleDmsMatch[4];

      let result = degrees + minutes / 60 + seconds / 3600;
      if (direction === 'S' || direction === 'W') {
        result = -result;
      }
      return result;
    }

    // Handle decimal degrees (only if no DMS format detected)
    const decimal = parseFloat(value);
    if (!isNaN(decimal)) return decimal;

    return null;
  }

  /**
   * Extracts and cleans photo title
   */
  private cleanTitle(title: string): string {
    return title.replace(/^File:/, '').replace(/\.(jpg|jpeg|png|gif)$/i, '');
  }

  /**
   * Extracts description from metadata
   */
  private extractDescription(extmetadata: any): string | undefined {
    return extmetadata.ImageDescription?.value || undefined;
  }

  /**
   * Extracts artist/photographer information
   */
  private extractArtist(extmetadata: any): string | undefined {
    return extmetadata.Artist?.value || undefined;
  }

  /**
   * Extracts license information
   */
  private extractLicense(extmetadata: any): string {
    return extmetadata.LicenseShortName?.value ||
      extmetadata.UsageTerms?.value ||
      'Unknown License';
  }
}