import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError, filter, tap } from 'rxjs/operators';
import { Photo, validatePhotoMetadata } from '../models/photo.model';
import { Coordinates } from '../models/coordinates.model';
import { CacheService } from './cache.service';
import { FormatValidationService } from './format-validation.service';
import { LoadingStateService } from './loading-state.service';

/**
 * Custom error for insufficient photos after format filtering
 */
export class InsufficientPhotosError extends Error {
  constructor(
    public readonly requestedCount: number,
    public readonly attemptsUsed: number,
    message: string
  ) {
    super(message);
    this.name = 'InsufficientPhotosError';
  }
}

/**
 * Custom error for general photo fetching failures
 */
export class PhotoFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoFetchError';
  }
}

/**
 * Photo category types for filtering
 */
export type PhotoCategory = 'architecture' | 'landmarks' | 'events' | 'all';

/**
 * Category search configuration
 */
interface CategoryConfig {
  categories: string[];
  searchTerms: string[];
}

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
            MimeType?: { value: string };
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
  
  // Cache configuration
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes for API responses
  private readonly PHOTO_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for processed photos
  
  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly BASE_SEARCH_RADIUS = 10000; // 10km base radius
  private readonly SEARCH_MULTIPLIER_PER_RETRY = 1.5; // Expand search by 50% each retry
  private readonly PHOTOS_PER_LOCATION_MULTIPLIER = 2; // Double photos per location on retry

  // Enhanced category configurations with well-populated Wikipedia categories
  private readonly CATEGORY_CONFIGS: Record<PhotoCategory, CategoryConfig> = {
    architecture: {
      categories: [
        'Category:Architecture',
        'Category:Buildings',
        'Category:Churches',
        'Category:Bridges',
        'Category:Castles',
        'Category:Cathedrals',
        'Category:Historic buildings',
        'Category:Railway stations',
        'Category:Towers'
      ],
      searchTerms: ['building', 'architecture', 'church', 'cathedral', 'palace', 'castle', 'bridge', 'tower', 'station', 'historic building']
    },
    landmarks: {
      categories: [
        'Category:Monuments and memorials',
        'Category:World Heritage Sites',
        'Category:Tourist attractions',
        'Category:Historic sites',
        'Category:Archaeological sites',
        'Category:Statues',
        'Category:Fountains',
        'Category:Parks'
      ],
      searchTerms: ['monument', 'statue', 'memorial', 'landmark', 'heritage', 'historic', 'archaeological', 'fountain', 'park', 'tourist attraction']
    },
    events: {
      categories: [
        'Category:Historical photographs',
        'Category:Festivals',
        'Category:Parades',
        'Category:Ceremonies',
        'Category:Street scenes',
        'Category:Transportation',
        'Category:People'
      ],
      searchTerms: ['historical photograph', 'festival', 'ceremony', 'parade', 'celebration', 'street scene', 'transportation', 'people', 'crowd']
    },
    all: {
      categories: [],
      searchTerms: []
    }
  };

  constructor(
    private http: HttpClient,
    private cacheService: CacheService,
    private formatValidationService: FormatValidationService,
    private loadingStateService: LoadingStateService
  ) { }

  /**
   * Fetches curated historical photos from high-quality Wikipedia categories
   * @param count - Number of photos to fetch
   * @param category - Optional category filter ('architecture', 'landmarks', 'events', or 'all')
   * @param forceRefresh - Whether to bypass cache and fetch fresh photos
   * @returns Observable of Photo array
   */
  fetchCuratedPhotos(count: number, category: PhotoCategory = 'all', forceRefresh: boolean = false): Observable<Photo[]> {
    let cacheKey: string;
    if (forceRefresh) {
      // Always use unique cache key for fresh photos to ensure randomness
      cacheKey = `curated-photos-${count}-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } else {
      // Use shorter cache intervals (1 minute) to allow for more variety
      const cacheInterval = 1 * 60 * 1000; // 1 minute
      const cacheTimestamp = Date.now() - (Date.now() % cacheInterval);
      // Add random component even for cached requests to ensure variety
      const randomComponent = Math.floor(Math.random() * 10);
      cacheKey = `curated-photos-${count}-${category}-${cacheTimestamp}-${randomComponent}`;
    }
    
    this.loadingStateService.startPhotosFetch(count);
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchCuratedPhotosWithRetry(count, 0, category),
      { ttl: forceRefresh ? 0 : Math.min(this.PHOTO_CACHE_TTL, 2 * 60 * 1000) } // Shorter cache for variety
    ).pipe(
      tap({
        next: (photos) => {
          this.loadingStateService.completePhotosFetch();
          console.log(`Successfully fetched ${photos.length} curated photos`);
        },
        error: (error) => {
          this.loadingStateService.setError(
            LoadingStateService.LOADING_KEYS.PHOTOS_FETCH,
            `Failed to fetch curated photos: ${error.message}`
          );
          console.error('Curated photo fetch failed:', error);
        }
      })
    );
  }

  /**
   * Fetches random historical photos from Wikimedia Commons using geosearch with retry logic
   * Requirements: 4.4 - Implement loading states while photos are being fetched from API
   * @param count - Number of photos to fetch
   * @param category - Optional category filter ('architecture', 'landmarks', 'events', or 'all')
   * @param forceRefresh - Whether to bypass cache and fetch fresh photos
   * @returns Observable of Photo array
   */
  fetchRandomPhotos(count: number, category: PhotoCategory = 'all', forceRefresh: boolean = false): Observable<Photo[]> {
    let cacheKey: string;
    if (forceRefresh) {
      // Generate unique cache key to ensure fresh photos
      cacheKey = `random-photos-${count}-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } else {
      // Use 5-minute cache buckets for normal requests
      cacheKey = `random-photos-${count}-${category}-${Date.now() - (Date.now() % (5 * 60 * 1000))}`;
    }
    
    // Start loading state
    this.loadingStateService.startPhotosFetch(count);
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchPhotosWithRetry(count, 0, category),
      { ttl: this.PHOTO_CACHE_TTL }
    ).pipe(
      tap({
        next: (photos) => {
          // Complete loading state on success
          this.loadingStateService.completePhotosFetch();
          console.log(`Successfully fetched ${photos.length} photos`);
        },
        error: (error) => {
          // Set error state on failure
          this.loadingStateService.setError(
            LoadingStateService.LOADING_KEYS.PHOTOS_FETCH,
            `Failed to fetch photos: ${error.message}`
          );
          console.error('Photo fetch failed:', error);
        }
      })
    );
  }

  /**
   * Fetches curated photos with retry logic, focusing on high-quality categories
   * @param count - Number of photos needed
   * @param retryAttempt - Current retry attempt (0-based)
   * @param category - Photo category to filter by
   * @returns Observable of Photo array
   */
  private fetchCuratedPhotosWithRetry(count: number, retryAttempt: number, category: PhotoCategory = 'all'): Observable<Photo[]> {
    console.log(`Fetching curated photos - Attempt ${retryAttempt + 1}/${this.MAX_RETRY_ATTEMPTS + 1}`, {
      count,
      category,
      retryAttempt
    });

    // Use a hybrid approach: category-based search + selective geosearch
    return this.fetchFromCuratedCategories(count, category, retryAttempt).pipe(
      switchMap(photos => {
        console.log(`Curated photos after filtering - Attempt ${retryAttempt + 1}`, {
          requested: count,
          found: photos.length,
          retryAttempt
        });

        if (photos.length >= count) {
          return of(this.selectDiversePhotos(photos, count));
        } else if (retryAttempt < this.MAX_RETRY_ATTEMPTS) {
          console.log(`Insufficient curated photos found (${photos.length}/${count}). Retrying with expanded search...`);
          return this.fetchCuratedPhotosWithRetry(count, retryAttempt + 1, category);
        } else {
          if (photos.length > 0) {
            console.warn(`Max retries reached for curated search. Returning ${photos.length} photos instead of requested ${count}`);
            return of(this.selectDiversePhotos(photos, photos.length));
          } else {
            // Fallback to regular random photos if curated approach fails completely
            console.log('Curated approach failed, falling back to random photos');
            return this.fetchPhotosWithRetry(count, 0, category);
          }
        }
      }),
      catchError(error => {
        console.error(`Error fetching curated photos on attempt ${retryAttempt + 1}:`, error);
        
        if (retryAttempt < this.MAX_RETRY_ATTEMPTS) {
          console.log(`Retrying curated search due to error...`);
          return this.fetchCuratedPhotosWithRetry(count, retryAttempt + 1, category);
        } else {
          // Final fallback to regular random photos
          console.log('Curated search failed completely, falling back to random photos');
          return this.fetchPhotosWithRetry(count, 0, category);
        }
      })
    );
  }

  /**
   * Fetches photos from curated high-quality categories
   * @param count - Number of photos needed
   * @param category - Photo category to filter by
   * @param retryAttempt - Current retry attempt for expanding search
   * @returns Observable of Photo array
   */
  private fetchFromCuratedCategories(count: number, category: PhotoCategory, retryAttempt: number): Observable<Photo[]> {
    const categoryConfig = this.CATEGORY_CONFIGS[category];
    
    if (category === 'all') {
      // For 'all' category, use a mixed approach with broader search terms
      return this.fetchMixedCuratedPhotos(count, retryAttempt);
    }

    // Use a progressive approach: start with targeted search, expand if needed
    const searchStrategies: Observable<any[]>[] = [];
    
    // Strategy 1: Search with category-specific terms
    if (categoryConfig.searchTerms.length > 0) {
      searchStrategies.push(this.searchByTermsWithCoordinates(categoryConfig.searchTerms, count * 2));
    }
    
    // Strategy 2: Try category member search (but don't rely on it heavily)
    if (categoryConfig.categories.length > 0) {
      searchStrategies.push(this.searchCategoryMembers(categoryConfig.categories, Math.floor(count / 2)));
    }
    
    // Strategy 3: Fallback to geosearch with category filter (on retries)
    if (retryAttempt > 0) {
      const majorCities = this.getMajorCities(Math.min(5 + retryAttempt * 3, 15));
      const geoSearches = majorCities.map(city => 
        this.searchPhotosByLocation(city, this.BASE_SEARCH_RADIUS * (1 + retryAttempt * 0.5), 5, category)
      );
      searchStrategies.push(...geoSearches);
    }

    if (searchStrategies.length === 0) {
      // Ultimate fallback: use regular geosearch
      const cities = this.getMajorCities(10);
      return forkJoin(
        cities.map(city => this.searchPhotosByLocation(city, this.BASE_SEARCH_RADIUS, 10, 'all'))
      ).pipe(
        map(results => results.flat()),
        map(searchResults => this.deduplicateResults(searchResults)),
        switchMap(searchResults => this.getPhotoDetails(searchResults)),
        map(photos => this.filterValidPhotos(photos))
      );
    }

    return forkJoin(searchStrategies).pipe(
      map(results => results.flat()),
      map(searchResults => this.deduplicateResults(searchResults)),
      switchMap(searchResults => {
        if (searchResults.length === 0) {
          console.log('No search results found, falling back to geosearch');
          // Fallback to regular geosearch if no curated results
          const cities = this.getMajorCities(5);
          return forkJoin(
            cities.map(city => this.searchPhotosByLocation(city, this.BASE_SEARCH_RADIUS, 10, 'all'))
          ).pipe(
            map(geoResults => geoResults.flat()),
            switchMap(geoSearchResults => this.getPhotoDetails(geoSearchResults))
          );
        }
        return this.getPhotoDetails(searchResults);
      }),
      map(photos => this.filterValidPhotos(photos))
    );
  }

  /**
   * Fetches mixed curated photos for the 'all' category
   * @param count - Number of photos needed
   * @param retryAttempt - Current retry attempt
   * @returns Observable of Photo array
   */
  private fetchMixedCuratedPhotos(count: number, retryAttempt: number): Observable<Photo[]> {
    // Use a mix of search terms from all categories
    const allSearchTerms = [
      ...this.CATEGORY_CONFIGS.architecture.searchTerms.slice(0, 3),
      ...this.CATEGORY_CONFIGS.landmarks.searchTerms.slice(0, 3),
      ...this.CATEGORY_CONFIGS.events.searchTerms.slice(0, 2)
    ];

    const searchStrategies: Observable<any[]>[] = [];
    
    // Strategy 1: Mixed search terms
    searchStrategies.push(this.searchByTermsWithCoordinates(allSearchTerms, count));
    
    // Strategy 2: Geosearch in major cities
    const majorCities = this.getMajorCities(Math.min(8 + retryAttempt * 2, 15));
    const geoSearches = majorCities.map(city => 
      this.searchPhotosByLocation(city, this.BASE_SEARCH_RADIUS * (1 + retryAttempt * 0.3), 8, 'all')
    );
    searchStrategies.push(...geoSearches);

    return forkJoin(searchStrategies).pipe(
      map(results => results.flat()),
      map(searchResults => this.deduplicateResults(searchResults)),
      switchMap(searchResults => this.getPhotoDetails(searchResults)),
      map(photos => this.filterValidPhotos(photos))
    );
  }

  /**
   * Gets a randomized selection of major cities for geosearch fallback
   * @param count - Number of cities to return
   * @returns Array of major city coordinates
   */
  private getMajorCities(count: number): Coordinates[] {
    const majorCities: Coordinates[] = [
      { latitude: 51.5074, longitude: -0.1278 },   // London
      { latitude: 48.8566, longitude: 2.3522 },    // Paris
      { latitude: 52.5200, longitude: 13.4050 },   // Berlin
      { latitude: 41.9028, longitude: 12.4964 },   // Rome
      { latitude: 40.4168, longitude: -3.7038 },   // Madrid
      { latitude: 55.7558, longitude: 37.6176 },   // Moscow
      { latitude: 39.9042, longitude: 116.4074 },  // Beijing
      { latitude: 35.6762, longitude: 139.6503 },  // Tokyo
      { latitude: 40.7128, longitude: -74.0060 },  // New York
      { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
      { latitude: -33.8688, longitude: 151.2093 }, // Sydney
      { latitude: -22.9068, longitude: -43.1729 }, // Rio de Janeiro
      { latitude: 19.4326, longitude: -99.1332 },  // Mexico City
      { latitude: 30.0444, longitude: 31.2357 },   // Cairo
      { latitude: -26.2041, longitude: 28.0473 },  // Johannesburg
      { latitude: 28.6139, longitude: 77.2090 },   // New Delhi
      { latitude: 1.3521, longitude: 103.8198 },   // Singapore
      { latitude: -34.6037, longitude: -58.3816 }, // Buenos Aires
      { latitude: 55.6761, longitude: 12.5683 },   // Copenhagen
      { latitude: 59.3293, longitude: 18.0686 },   // Stockholm
      { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
      { latitude: 43.6532, longitude: -79.3832 },  // Toronto
      { latitude: -37.8136, longitude: 144.9631 }, // Melbourne
      { latitude: 25.2048, longitude: 55.2708 },   // Dubai
      { latitude: 22.3193, longitude: 114.1694 },  // Hong Kong
      { latitude: 31.2304, longitude: 121.4737 },  // Shanghai
      { latitude: 19.0760, longitude: 72.8777 },   // Mumbai
      { latitude: -1.2921, longitude: 36.8219 },   // Nairobi
      { latitude: 4.7110, longitude: -74.0721 },   // Bogotá
      { latitude: -33.4489, longitude: -70.6693 }  // Santiago
    ];

    // Randomize the selection
    return this.shuffleArray(majorCities).slice(0, count);
  }

  /**
   * Fetches photos with retry logic for insufficient valid photos
   * @param count - Number of photos needed
   * @param retryAttempt - Current retry attempt (0-based)
   * @returns Observable of Photo array
   */
  private fetchPhotosWithRetry(count: number, retryAttempt: number, category: PhotoCategory = 'all'): Observable<Photo[]> {
    // Calculate search parameters based on retry attempt
    const searchRadius = this.BASE_SEARCH_RADIUS * Math.pow(this.SEARCH_MULTIPLIER_PER_RETRY, retryAttempt);
    const photosPerLocation = 20 * Math.pow(this.PHOTOS_PER_LOCATION_MULTIPLIER, retryAttempt);
    const locationCount = Math.min(count * (1 + retryAttempt), 50); // Increase locations but cap at 50

    console.log(`Fetching photos - Attempt ${retryAttempt + 1}/${this.MAX_RETRY_ATTEMPTS + 1}`, {
      count,
      searchRadius,
      photosPerLocation,
      locationCount,
      retryAttempt
    });

    const locations = this.getRandomLocations(locationCount);

    return forkJoin(
      locations.map(location => this.searchPhotosByLocation(location, searchRadius, photosPerLocation, category))
    ).pipe(
      map(locationResults => locationResults.flat()),
      switchMap(searchResults => this.getPhotoDetails(searchResults)),
      map(photos => this.filterValidPhotos(photos)),
      switchMap(validPhotos => {
        console.log(`Photos after filtering - Attempt ${retryAttempt + 1}`, {
          requested: count,
          found: validPhotos.length,
          retryAttempt
        });

        if (validPhotos.length >= count) {
          // Success - we have enough photos
          return of(this.selectDiversePhotos(validPhotos, count));
        } else if (retryAttempt < this.MAX_RETRY_ATTEMPTS) {
          // Retry with expanded search parameters
          console.log(`Insufficient photos found (${validPhotos.length}/${count}). Retrying with expanded search...`);
          return this.fetchPhotosWithRetry(count, retryAttempt + 1, category);
        } else {
          // Max retries reached - return what we have or throw error
          if (validPhotos.length > 0) {
            console.warn(`Max retries reached. Returning ${validPhotos.length} photos instead of requested ${count}`);
            return of(this.selectDiversePhotos(validPhotos, validPhotos.length));
          } else {
            return throwError(() => new InsufficientPhotosError(
              count,
              retryAttempt + 1,
              'Unable to find photos in supported formats after multiple retry attempts. This may be due to strict format restrictions or limited photo availability in the searched areas.'
            ));
          }
        }
      }),
      catchError(error => {
        if (error instanceof InsufficientPhotosError) {
          // Re-throw our custom error
          return throwError(() => error);
        }
        
        console.error(`Error fetching photos on attempt ${retryAttempt + 1}:`, error);
        
        if (retryAttempt < this.MAX_RETRY_ATTEMPTS) {
          console.log(`Retrying due to error...`);
          return this.fetchPhotosWithRetry(count, retryAttempt + 1, category);
        } else {
          return throwError(() => new PhotoFetchError(
            `Failed to fetch photos after ${retryAttempt + 1} attempts: ${error.message}`
          ));
        }
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
   * Processes raw Wikimedia data into Photo objects using pre-computed validation results
   * @param rawData - Raw API response data
   * @param validationMap - Map of URL to validation results
   * @returns Promise resolving to processed Photo object or null if invalid
   */
  async processPhotoDataWithValidation(rawData: any, validationMap: Map<string, any>): Promise<Photo | null> {
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

      // Get pre-computed format validation result
      const formatValidation = validationMap.get(imageInfo.url);
      
      if (!formatValidation || !formatValidation.isValid) {
        // Detailed logging is now handled by FormatValidationLoggerService
        // Just log a summary for PhotoService context
        console.log(`Photo rejected due to format validation`, {
          url: imageInfo.url,
          reason: formatValidation?.rejectionReason || 'No validation result',
          method: formatValidation?.detectionMethod || 'unknown'
        });
        return null;
      }

      // Create photo object with format metadata
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
          dateCreated: new Date(year, 0, 1), // Use January 1st of the year
          format: formatValidation.detectedFormat,
          mimeType: formatValidation.detectedMimeType
        }
      };

      return this.validatePhotoMetadata(photo) ? photo : null;
    } catch (error) {
      console.error('Error processing photo data with validation:', error);
      return null;
    }
  }

  /**
   * Processes raw Wikimedia data into Photo objects
   * @param rawData - Raw API response data
   * @returns Promise resolving to processed Photo object or null if invalid
   */
  async processPhotoData(rawData: any): Promise<Photo | null> {
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

      // Perform format validation before creating Photo object
      const formatValidation = await this.formatValidationService.validateImageFormat(
        imageInfo.url,
        extmetadata.MimeType?.value,
        { extmetadata }
      );

      if (!formatValidation.isValid) {
        // Detailed logging is now handled by FormatValidationLoggerService
        // Just log a summary for PhotoService context
        console.log(`Photo rejected due to format validation`, {
          url: imageInfo.url,
          reason: formatValidation.rejectionReason,
          method: formatValidation.detectionMethod
        });
        return null;
      }

      // Create photo object with format metadata
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
          dateCreated: new Date(year, 0, 1), // Use January 1st of the year
          format: formatValidation.detectedFormat,
          mimeType: formatValidation.detectedMimeType
        }
      };

      return this.validatePhotoMetadata(photo) ? photo : null;
    } catch (error) {
      console.error('Error processing photo data:', error);
      return null;
    }
  }

  /**
   * Gets diverse geographic locations for photo searching with randomization
   */
  private getRandomLocations(count: number): Coordinates[] {
    const allLocations: Coordinates[] = [
      // Africa
      { latitude: 9.0579, longitude: 7.4951 },    // Abuja, Nigeria
      { latitude: 6.5244, longitude: 3.3792 },    // Lagos, Nigeria (15M+)
      { latitude: 11.0167, longitude: 7.9000 },   // Kano, Nigeria (4M+)
      { latitude: 5.5560, longitude: -0.1969 },   // Accra, Ghana
      { latitude: 9.0300, longitude: 38.7400 },   // Addis Ababa, Ethiopia
      { latitude: 36.7538, longitude: 3.0588 },   // Algiers, Algeria
      { latitude: -8.8390, longitude: 13.2894 },  // Luanda, Angola
      { latitude: -26.2041, longitude: 28.0473 }, // Johannesburg, South Africa (5M+)
      { latitude: -33.9249, longitude: 18.4241 }, // Cape Town, South Africa (4M+)
      { latitude: -29.8587, longitude: 31.0218 }, // Durban, South Africa (3.5M+)
      { latitude: -25.7479, longitude: 28.2293 }, // Pretoria, South Africa
      { latitude: 30.0444, longitude: 31.2357 },  // Cairo, Egypt
      { latitude: 31.2001, longitude: 29.9187 },  // Alexandria, Egypt (5M+)
      { latitude: 33.8869, longitude: 9.5375 },   // Tunis, Tunisia
      { latitude: 33.5731, longitude: -7.5898 },  // Casablanca, Morocco (3.7M+)
      { latitude: -17.8252, longitude: 31.0335 }, // Harare, Zimbabwe
      { latitude: -1.9441, longitude: 30.0619 },  // Kigali, Rwanda
      { latitude: 6.1319, longitude: 1.2228 },    // Lomé, Togo
      { latitude: 32.8872, longitude: 13.1913 },  // Tripoli, Libya
      { latitude: -22.5597, longitude: 17.0832 }, // Windhoek, Namibia
      { latitude: 15.5007, longitude: 32.5599 },  // Khartoum, Sudan
      { latitude: -26.3054, longitude: 31.1367 }, // Mbabane, Eswatini
      { latitude: 12.3714, longitude: -1.5197 },  // Ouagadougou, Burkina Faso
      { latitude: 5.3600, longitude: -4.0083 },   // Abidjan, Côte d'Ivoire (5M+)
      { latitude: 12.6392, longitude: -8.0029 },  // Bamako, Mali (2.5M+)
      { latitude: 18.0735, longitude: -15.9582 }, // Nouakchott, Mauritania (1.3M+)
      { latitude: 14.6928, longitude: -17.4467 }, // Dakar, Senegal (3.7M+)
      { latitude: -4.4419, longitude: 15.2663 },  // Kinshasa, DRC (15M+)
      { latitude: -11.2027, longitude: 27.4740 }, // Lubumbashi, DRC (2.5M+)
      { latitude: 1.3733, longitude: 32.2903 },   // Kampala, Uganda (3.5M+)
      { latitude: -6.7924, longitude: 39.2083 },  // Dar es Salaam, Tanzania (6.7M+)

      // Asia
      { latitude: 39.9042, longitude: 116.4074 }, // Beijing, China
      { latitude: 31.2304, longitude: 121.4737 }, // Shanghai, China (28M+)
      { latitude: 23.1291, longitude: 113.2644 }, // Guangzhou, China (15M+)
      { latitude: 39.0851, longitude: 117.1995 }, // Tianjin, China (15M+)
      { latitude: 22.3193, longitude: 114.1694 }, // Hong Kong (7.5M+)
      { latitude: 28.6139, longitude: 77.2090 },  // New Delhi, India
      { latitude: 19.0760, longitude: 72.8777 },  // Mumbai, India (21M+)
      { latitude: 13.0827, longitude: 80.2707 },  // Chennai, India (11M+)
      { latitude: 22.5726, longitude: 88.3639 },  // Kolkata, India (15M+)
      { latitude: 12.9716, longitude: 77.5946 },  // Bangalore, India (13M+)
      { latitude: 17.3850, longitude: 78.4867 },  // Hyderabad, India (10M+)
      { latitude: 18.5204, longitude: 73.8567 },  // Pune, India (6.6M+)
      { latitude: 23.0225, longitude: 72.5714 },  // Ahmedabad, India (8.4M+)
      { latitude: 26.9124, longitude: 75.7873 },  // Jaipur, India (3.9M+)
      { latitude: 28.7041, longitude: 77.1025 },  // Delhi, India (32M+)
      { latitude: 35.6762, longitude: 139.6503 }, // Tokyo, Japan
      { latitude: 34.6937, longitude: 135.5023 }, // Osaka, Japan (19M+)
      { latitude: 35.4437, longitude: 139.6380 }, // Yokohama, Japan (3.7M+)
      { latitude: 37.5665, longitude: 126.9780 }, // Seoul, South Korea
      { latitude: 35.1796, longitude: 129.0756 }, // Busan, South Korea (3.4M+)
      { latitude: 21.0285, longitude: 105.8542 }, // Hanoi, Vietnam
      { latitude: 10.8231, longitude: 106.6297 }, // Ho Chi Minh City, Vietnam (9M+)
      { latitude: 13.7563, longitude: 100.5018 }, // Bangkok, Thailand
      { latitude: 3.1390, longitude: 101.6869 },  // Kuala Lumpur, Malaysia
      { latitude: 1.3521, longitude: 103.8198 },  // Singapore
      { latitude: -6.2088, longitude: 106.8456 }, // Jakarta, Indonesia
      { latitude: -7.2575, longitude: 112.7521 }, // Surabaya, Indonesia (3M+)
      { latitude: -6.9175, longitude: 107.6191 }, // Bandung, Indonesia (2.7M+)
      { latitude: 3.5952, longitude: 98.6722 },   // Medan, Indonesia (2.4M+)
      { latitude: 14.5995, longitude: 120.9842 }, // Manila, Philippines
      { latitude: 10.3157, longitude: 123.8854 }, // Cebu City, Philippines (2.9M+)
      { latitude: 7.0731, longitude: 125.6128 },  // Davao, Philippines (1.8M+)
      { latitude: 23.8103, longitude: 90.4125 },  // Dhaka, Bangladesh
      { latitude: 22.3569, longitude: 91.7832 },  // Chittagong, Bangladesh (5.2M+)
      { latitude: 27.7172, longitude: 85.3240 },  // Kathmandu, Nepal
      { latitude: 6.9271, longitude: 79.8612 },   // Colombo, Sri Lanka
      { latitude: 24.8607, longitude: 67.0011 },  // Karachi, Pakistan (16M+)
      { latitude: 31.5804, longitude: 74.3587 },  // Lahore, Pakistan (13M+)
      { latitude: 33.6844, longitude: 73.0479 },  // Islamabad, Pakistan
      { latitude: 34.5553, longitude: 69.2075 },  // Kabul, Afghanistan
      { latitude: 38.8951, longitude: 71.4677 },  // Dushanbe, Tajikistan
      { latitude: 41.2995, longitude: 69.2401 },  // Tashkent, Uzbekistan
      { latitude: 42.8746, longitude: 74.5698 },  // Bishkek, Kyrgyzstan
      { latitude: 37.9601, longitude: 58.3261 },  // Ashgabat, Turkmenistan
      { latitude: 25.2048, longitude: 121.5654 }, // Taipei, Taiwan (7M+)
      { latitude: 22.2787, longitude: 114.1746 }, // Hong Kong (already added above)
      { latitude: 35.9078, longitude: 127.7669 }, // Pyongyang, North Korea (3.2M+)

      // Europe
      { latitude: 51.5074, longitude: -0.1278 },  // London, United Kingdom
      { latitude: 53.4808, longitude: -2.2426 },  // Manchester, United Kingdom (2.7M+)
      { latitude: 55.8642, longitude: -4.2518 },  // Glasgow, United Kingdom (1.8M+)
      { latitude: 52.4862, longitude: -1.8904 },  // Birmingham, United Kingdom (2.9M+)
      { latitude: 48.8566, longitude: 2.3522 },   // Paris, France
      { latitude: 45.7640, longitude: 4.8357 },   // Lyon, France (2.3M+)
      { latitude: 43.2965, longitude: 5.3698 },   // Marseille, France (1.8M+)
      { latitude: 52.5200, longitude: 13.4050 },  // Berlin, Germany
      { latitude: 48.1351, longitude: 11.5820 },  // Munich, Germany (1.5M+)
      { latitude: 50.1109, longitude: 8.6821 },   // Frankfurt, Germany (2.3M+)
      { latitude: 51.2277, longitude: 6.7735 },   // Düsseldorf, Germany (1.2M+)
      { latitude: 53.5511, longitude: 9.9937 },   // Hamburg, Germany (1.9M+)
      { latitude: 50.9375, longitude: 6.9603 },   // Cologne, Germany (1.1M+)
      { latitude: 41.9028, longitude: 12.4964 },  // Rome, Italy
      { latitude: 45.4642, longitude: 9.1900 },   // Milan, Italy (3.2M+)
      { latitude: 40.8518, longitude: 14.2681 },  // Naples, Italy (3.1M+)
      { latitude: 45.0703, longitude: 7.6869 },   // Turin, Italy (1.7M+)
      { latitude: 40.4168, longitude: -3.7038 },  // Madrid, Spain
      { latitude: 41.3851, longitude: 2.1734 },   // Barcelona, Spain (5.6M+)
      { latitude: 37.3891, longitude: -5.9845 },  // Seville, Spain (1.5M+)
      { latitude: 39.4699, longitude: -0.3763 },  // Valencia, Spain (1.8M+)
      { latitude: 38.7223, longitude: -9.1393 },  // Lisbon, Portugal
      { latitude: 41.1579, longitude: -8.6291 },  // Porto, Portugal (1.7M+)
      { latitude: 52.3676, longitude: 4.9041 },   // Amsterdam, Netherlands
      { latitude: 51.9244, longitude: 4.4777 },   // Rotterdam, Netherlands (1.2M+)
      { latitude: 50.8503, longitude: 4.3517 },   // Brussels, Belgium
      { latitude: 46.9481, longitude: 7.4474 },   // Bern, Switzerland
      { latitude: 47.3769, longitude: 8.5417 },   // Zurich, Switzerland (1.4M+)
      { latitude: 48.2082, longitude: 16.3738 },  // Vienna, Austria
      { latitude: 59.9139, longitude: 10.7522 },  // Oslo, Norway
      { latitude: 59.3293, longitude: 18.0686 },  // Stockholm, Sweden
      { latitude: 57.7089, longitude: 11.9746 },  // Gothenburg, Sweden (1M+)
      { latitude: 60.1699, longitude: 24.9384 },  // Helsinki, Finland
      { latitude: 55.6761, longitude: 12.5683 },  // Copenhagen, Denmark
      { latitude: 64.1466, longitude: -21.9426 }, // Reykjavik, Iceland
      { latitude: 53.3498, longitude: -6.2603 },  // Dublin, Ireland
      { latitude: 55.7558, longitude: 37.6176 },  // Moscow, Russia
      { latitude: 59.9311, longitude: 30.3609 },  // Saint Petersburg, Russia (5.4M+)
      { latitude: 55.7887, longitude: 49.1221 },  // Kazan, Russia (1.3M+)
      { latitude: 56.8431, longitude: 60.6454 },  // Yekaterinburg, Russia (1.5M+)
      { latitude: 55.0084, longitude: 82.9357 },  // Novosibirsk, Russia (1.6M+)
      { latitude: 50.4501, longitude: 30.5234 },  // Kyiv, Ukraine
      { latitude: 49.9935, longitude: 36.2304 },  // Kharkiv, Ukraine (1.4M+)
      { latitude: 46.4825, longitude: 30.7233 },  // Odesa, Ukraine (1M+)
      { latitude: 52.2297, longitude: 21.0122 },  // Warsaw, Poland
      { latitude: 50.2649, longitude: 19.0238 },  // Krakow, Poland (1.8M+)
      { latitude: 51.7592, longitude: 19.4560 },  // Łódź, Poland (1.1M+)
      { latitude: 50.0755, longitude: 14.4378 },  // Prague, Czech Republic
      { latitude: 49.1951, longitude: 16.6068 },  // Brno, Czech Republic (1.1M+)
      { latitude: 47.4979, longitude: 19.0402 },  // Budapest, Hungary
      { latitude: 44.4268, longitude: 26.1025 },  // Bucharest, Romania
      { latitude: 45.7489, longitude: 21.2087 },  // Timișoara, Romania (1M+)
      { latitude: 42.6977, longitude: 23.3219 },  // Sofia, Bulgaria
      { latitude: 37.9838, longitude: 23.7275 },  // Athens, Greece
      { latitude: 40.6401, longitude: 22.9444 },  // Thessaloniki, Greece (1.1M+)
      { latitude: 35.1676, longitude: 33.3736 },  // Nicosia, Cyprus
      { latitude: 45.8150, longitude: 15.9819 },  // Zagreb, Croatia
      { latitude: 46.0569, longitude: 14.5058 },  // Ljubljana, Slovenia
      { latitude: 43.8563, longitude: 18.4131 },  // Sarajevo, Bosnia and Herzegovina
      { latitude: 42.4304, longitude: 19.2594 },  // Podgorica, Montenegro
      { latitude: 42.0000, longitude: 21.4333 },  // Skopje, North Macedonia
      { latitude: 41.3275, longitude: 19.8187 },  // Tirana, Albania
      { latitude: 44.8176, longitude: 20.4633 },  // Belgrade, Serbia
      { latitude: 41.0082, longitude: 28.9784 },  // Istanbul, Turkey (15M+)

      // North America
      { latitude: 38.9072, longitude: -77.0369 }, // Washington D.C., USA
      { latitude: 40.7128, longitude: -74.0060 }, // New York City, USA (20M+)
      { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles, USA (13M+)
      { latitude: 41.8781, longitude: -87.6298 }, // Chicago, USA (9.5M+)
      { latitude: 29.7604, longitude: -95.3698 }, // Houston, USA (7M+)
      { latitude: 33.4484, longitude: -112.0740 }, // Phoenix, USA (5M+)
      { latitude: 39.7392, longitude: -104.9903 }, // Denver, USA (2.9M+)
      { latitude: 32.7767, longitude: -96.7970 }, // Dallas, USA (7.6M+)
      { latitude: 37.7749, longitude: -122.4194 }, // San Francisco, USA (4.7M+)
      { latitude: 47.6062, longitude: -122.3321 }, // Seattle, USA (4M+)
      { latitude: 25.7617, longitude: -80.1918 }, // Miami, USA (6.2M+)
      { latitude: 42.3601, longitude: -71.0589 }, // Boston, USA (4.9M+)
      { latitude: 39.2904, longitude: -76.6122 }, // Baltimore, USA (2.8M+)
      { latitude: 45.4215, longitude: -75.6972 }, // Ottawa, Canada
      { latitude: 43.6532, longitude: -79.3832 }, // Toronto, Canada (6.4M+)
      { latitude: 45.5017, longitude: -73.5673 }, // Montreal, Canada (4.3M+)
      { latitude: 49.2827, longitude: -123.1207 }, // Vancouver, Canada (2.6M+)
      { latitude: 51.0447, longitude: -114.0719 }, // Calgary, Canada (1.4M+)
      { latitude: 53.5461, longitude: -113.4938 }, // Edmonton, Canada (1.4M+)
      { latitude: 19.4326, longitude: -99.1332 }, // Mexico City, Mexico
      { latitude: 25.6866, longitude: -100.3161 }, // Monterrey, Mexico (5.3M+)
      { latitude: 20.6597, longitude: -103.3496 }, // Guadalajara, Mexico (5.3M+)
      { latitude: 21.1619, longitude: -86.8515 }, // Cancún, Mexico (1M+)
      { latitude: 32.5149, longitude: -117.0382 }, // Tijuana, Mexico (2M+)
      { latitude: 17.2510, longitude: -88.7590 }, // Belize City, Belize
      { latitude: 14.0723, longitude: -87.1921 }, // Tegucigalpa, Honduras
      { latitude: 12.1364, longitude: -86.2514 }, // Managua, Nicaragua
      { latitude: 9.9281, longitude: -84.0907 },  // San José, Costa Rica
      { latitude: 8.9824, longitude: -79.5199 },  // Panama City, Panama

      // South America
      { latitude: -22.9068, longitude: -43.1729 }, // Rio de Janeiro, Brazil (Former capital)
      { latitude: -23.5558, longitude: -46.6396 }, // São Paulo, Brazil (22M+)
      { latitude: -15.8267, longitude: -47.9218 }, // Brasília, Brazil
      { latitude: -30.0346, longitude: -51.2177 }, // Porto Alegre, Brazil (4.3M+)
      { latitude: -19.9167, longitude: -43.9345 }, // Belo Horizonte, Brazil (6M+)
      { latitude: -25.4284, longitude: -49.2733 }, // Curitiba, Brazil (3.7M+)
      { latitude: -8.0476, longitude: -34.8770 }, // Recife, Brazil (4M+)
      { latitude: -12.9714, longitude: -38.5014 }, // Salvador, Brazil (4M+)
      { latitude: -3.7172, longitude: -38.5433 }, // Fortaleza, Brazil (4.1M+)
      { latitude: -34.6037, longitude: -58.3816 }, // Buenos Aires, Argentina
      { latitude: -31.4201, longitude: -64.1888 }, // Córdoba, Argentina (1.8M+)
      { latitude: -24.7821, longitude: -65.4232 }, // Salta, Argentina (1.4M+)
      { latitude: -33.4489, longitude: -70.6693 }, // Santiago, Chile
      { latitude: -33.0472, longitude: -71.6127 }, // Valparaíso, Chile (1M+)
      { latitude: 4.7110, longitude: -74.0721 },  // Bogotá, Colombia
      { latitude: 6.2442, longitude: -75.5812 },  // Medellín, Colombia (4M+)
      { latitude: 3.4516, longitude: -76.5320 },  // Cali, Colombia (2.8M+)
      { latitude: 11.0041, longitude: -74.8070 }, // Barranquilla, Colombia (2.4M+)
      { latitude: -12.0464, longitude: -77.0428 }, // Lima, Peru
      { latitude: -16.4090, longitude: -71.5375 }, // Arequipa, Peru (1.4M+)
      { latitude: 10.4806, longitude: -66.9036 }, // Caracas, Venezuela
      { latitude: 10.1597, longitude: -67.9111 }, // Valencia, Venezuela (2M+)
      { latitude: 8.5937, longitude: -71.1561 }, // Maracaibo, Venezuela (2.5M+)
      { latitude: -17.7834, longitude: -63.1821 }, // Santa Cruz, Bolivia (2.1M+)
      { latitude: -16.2902, longitude: -63.5887 }, // La Paz, Bolivia (2.3M+)
      { latitude: -0.1807, longitude: -78.4678 }, // Quito, Ecuador (2.8M+)
      { latitude: -2.1894, longitude: -79.8890 }, // Guayaquil, Ecuador (3.1M+)
      { latitude: -3.1190, longitude: -60.0217 },  // Manaus, Brazil (Regional)
      { latitude: -25.2637, longitude: -57.5759 }, // Asunción, Paraguay
      { latitude: -34.9011, longitude: -56.1645 }, // Montevideo, Uruguay
      { latitude: 5.8520, longitude: -55.2038 },   // Paramaribo, Suriname
      { latitude: 6.8013, longitude: -58.1551 },   // Georgetown, Guyana

      // Oceania
      { latitude: -35.2809, longitude: 149.1300 }, // Canberra, Australia
      { latitude: -33.8688, longitude: 151.2093 }, // Sydney, Australia (5.4M+)
      { latitude: -37.8136, longitude: 144.9631 }, // Melbourne, Australia (5.2M+)
      { latitude: -27.4698, longitude: 153.0251 }, // Brisbane, Australia (2.6M+)
      { latitude: -31.9505, longitude: 115.8605 }, // Perth, Australia (2.1M+)
      { latitude: -34.9285, longitude: 138.6007 }, // Adelaide, Australia (1.4M+)
      { latitude: -41.2865, longitude: 174.7762 }, // Wellington, New Zealand
      { latitude: -36.8485, longitude: 174.7633 }, // Auckland, New Zealand (1.7M+)
      { latitude: -43.5321, longitude: 172.6362 }, // Christchurch, New Zealand (1M+)
      { latitude: -17.7134, longitude: 168.3273 }, // Port Vila, Vanuatu
      { latitude: -9.4438, longitude: 159.9729 },  // Honiara, Solomon Islands
      { latitude: -8.5243, longitude: 179.1942 },  // Suva, Fiji
      { latitude: -21.1789, longitude: -175.1982 }, // Nuku'alofa, Tonga
      { latitude: -13.8506, longitude: -171.7513 }, // Apia, Samoa
      { latitude: 7.5000, longitude: 134.6242 },   // Koror, Palau

      // Middle East
      { latitude: 39.9334, longitude: 32.8597 },  // Ankara, Turkey
      { latitude: 33.3152, longitude: 44.3661 },  // Baghdad, Iraq
      { latitude: 35.6892, longitude: 51.3890 },  // Tehran, Iran (15M+ metro area)
      { latitude: 29.5918, longitude: 52.5836 },  // Shiraz, Iran (1.9M+)
      { latitude: 36.2605, longitude: 59.6168 },  // Mashhad, Iran (3.3M+)
      { latitude: 38.0962, longitude: 46.2738 },  // Tabriz, Iran (1.7M+)
      { latitude: 31.9539, longitude: 35.9106 },  // Jerusalem, Israel/Palestine
      { latitude: 32.0853, longitude: 34.7818 },  // Tel Aviv, Israel (4.2M+)
      { latitude: 31.7767, longitude: 35.2345 },  // Amman, Jordan
      { latitude: 33.8938, longitude: 35.5018 },  // Beirut, Lebanon
      { latitude: 33.5138, longitude: 36.2765 },  // Damascus, Syria
      { latitude: 36.2021, longitude: 37.1343 },  // Aleppo, Syria (2.1M+)
      { latitude: 29.3117, longitude: 47.4818 },  // Kuwait City, Kuwait
      { latitude: 26.0667, longitude: 50.5577 },  // Manama, Bahrain
      { latitude: 25.2048, longitude: 55.2708 },  // Dubai, UAE (Major city)
      { latitude: 24.4539, longitude: 54.3773 },  // Abu Dhabi, UAE
      { latitude: 23.5859, longitude: 58.4059 },  // Muscat, Oman
      { latitude: 25.3548, longitude: 51.1839 },  // Doha, Qatar
      { latitude: 24.7136, longitude: 46.6753 },  // Riyadh, Saudi Arabia
      { latitude: 21.4858, longitude: 39.1925 },  // Mecca, Saudi Arabia (2.4M+)
      { latitude: 26.3351, longitude: 43.9686 },  // Jeddah, Saudi Arabia (4.7M+)
      { latitude: 15.3694, longitude: 44.1910 },  // Sana'a, Yemen
    ];

    // Use proper Fisher-Yates shuffle and take the requested count
    const shuffled = this.shuffleArray([...allLocations]);
    return shuffled.slice(0, count);
  }

  /**
   * Searches for photos near a specific location using geosearch
   * @param location - Geographic coordinates to search around
   * @param radius - Search radius in meters (default: 10000)
   * @param limit - Maximum number of results per location (default: 20)
   */
  private searchPhotosByLocation(
    location: Coordinates, 
    radius: number = this.BASE_SEARCH_RADIUS, 
    limit: number = 20,
    category: PhotoCategory = 'all'
  ): Observable<any[]> {
    const cacheKey = `geosearch-${location.latitude}-${location.longitude}-${radius}-${limit}-${category}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => {
        if (category === 'all') {
          // Standard geosearch for all categories
          const params = new HttpParams()
            .set('action', 'query')
            .set('list', 'geosearch')
            .set('gscoord', `${location.latitude}|${location.longitude}`)
            .set('gsradius', radius.toString())
            .set('gslimit', Math.min(limit, 500).toString()) // API limit is 500
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
        } else {
          // Category-specific search using search API with category filters
          return this.searchPhotosByCategory(location, radius, limit, category);
        }
      },
      { ttl: this.CACHE_TTL }
    );
  }

  /**
   * Searches for photos by category near a specific location using enhanced category-based approach
   * @param location - Geographic coordinates to search around
   * @param radius - Search radius in meters
   * @param limit - Maximum number of results
   * @param category - Photo category to filter by
   */
  private searchPhotosByCategory(
    location: Coordinates,
    radius: number,
    limit: number,
    category: PhotoCategory
  ): Observable<any[]> {
    const categoryConfig = this.CATEGORY_CONFIGS[category];
    
    // Try multiple approaches: category members + geosearch combination
    return forkJoin([
      this.searchCategoryMembers(categoryConfig.categories, limit),
      this.searchByTermsWithCoordinates(categoryConfig.searchTerms, limit),
      this.performStandardGeosearch(location, radius, Math.floor(limit / 2))
    ]).pipe(
      map(([categoryResults, termResults, geoResults]) => {
        // Combine and deduplicate results
        const allResults = [...categoryResults, ...termResults, ...geoResults];
        const uniqueResults = this.deduplicateResults(allResults);
        
        // Filter by proximity to location if we have coordinates
        return this.filterByProximity(uniqueResults, location, radius * 2); // Use larger radius for category results
      }),
      catchError(error => {
        console.error('Enhanced category search error for location:', location, 'category:', category, error);
        // Fallback to standard geosearch if category search fails
        return this.performStandardGeosearch(location, radius, limit);
      })
    );
  }

  /**
   * Searches for photos that are members of specific Wikipedia categories with randomization
   * @param categories - Array of category names to search
   * @param limit - Maximum number of results per category
   */
  private searchCategoryMembers(categories: string[], limit: number): Observable<any[]> {
    if (!categories.length) return of([]);

    // Try different category search strategies with randomization
    const categorySearches: Observable<any[]>[] = [];
    
    // Strategy 1: Direct category member search with random starting points
    const selectedCategories = this.shuffleArray([...categories]).slice(0, 2);
    
    selectedCategories.forEach(category => {
      // Use random starting offset to get different results each time
      const randomOffset = Math.floor(Math.random() * 100);
      
      const params = new HttpParams()
        .set('action', 'query')
        .set('list', 'categorymembers')
        .set('cmtitle', category)
        .set('cmnamespace', '6') // File namespace
        .set('cmlimit', Math.min(Math.floor(limit / 2) + 20, 50).toString()) // Get more to allow for randomization
        .set('cmtype', 'file')
        .set('cmstartsortkeyprefix', this.getRandomSortKey()) // Random starting point
        .set('format', 'json')
        .set('origin', '*');

      categorySearches.push(
        this.http.get<any>(this.API_BASE_URL, { params }).pipe(
          map(response => response.query?.categorymembers || []),
          map(members => {
            // Shuffle the results and take a random subset
            const shuffled = this.shuffleArray(members);
            return shuffled.slice(0, Math.floor(limit / 2)).map((member: any) => ({
              pageid: member.pageid,
              title: member.title,
              lat: 0,
              lon: 0
            }));
          }),
          catchError(error => {
            console.error(`Error searching category ${category}:`, error);
            return of([]);
          })
        )
      );
    });

    // Strategy 2: Search for files in category using search API with random terms
    const categoryKeywords = this.shuffleArray(
      categories.map(cat => cat.replace('Category:', '').toLowerCase())
    ).slice(0, 2).join(' OR ');
    
    if (categoryKeywords) {
      // Add some randomization to the search query
      const randomSearchModifier = this.getRandomSearchModifier();
      
      const searchParams = new HttpParams()
        .set('action', 'query')
        .set('list', 'search')
        .set('srsearch', `${categoryKeywords} ${randomSearchModifier}`)
        .set('srnamespace', '6')
        .set('srlimit', Math.min(limit + 10, 30).toString()) // Get extra for randomization
        .set('sroffset', Math.floor(Math.random() * 50).toString()) // Random offset
        .set('format', 'json')
        .set('origin', '*');

      categorySearches.push(
        this.http.get<any>(this.API_BASE_URL, { params: searchParams }).pipe(
          map(response => response.query?.search || []),
          map(results => {
            // Shuffle and take random subset
            const shuffled = this.shuffleArray(results);
            return shuffled.slice(0, limit).map((result: any) => ({
              pageid: result.pageid,
              title: result.title,
              lat: 0,
              lon: 0
            }));
          }),
          catchError(error => {
            console.error('Error in category keyword search:', error);
            return of([]);
          })
        )
      );
    }

    if (categorySearches.length === 0) {
      return of([]);
    }

    return forkJoin(categorySearches).pipe(
      map(results => {
        const combined = results.flat();
        const deduplicated = this.deduplicateResults(combined);
        // Final shuffle to ensure randomness
        return this.shuffleArray(deduplicated);
      })
    );
  }

  /**
   * Searches for photos using search terms with randomization
   * @param searchTerms - Array of search terms
   * @param limit - Maximum number of results
   */
  private searchByTermsWithCoordinates(searchTerms: string[], limit: number): Observable<any[]> {
    if (!searchTerms.length) return of([]);

    // Randomize search approach for variety
    const searches: Observable<any[]>[] = [];
    const shuffledTerms = this.shuffleArray([...searchTerms]);
    
    // Strategy 1: Broad search with random term combinations
    const mainSearchQuery = shuffledTerms.slice(0, 2).join(' ');
    const randomModifier = this.getRandomSearchModifier();
    const mainParams = new HttpParams()
      .set('action', 'query')
      .set('list', 'search')
      .set('srsearch', `${mainSearchQuery} ${randomModifier}`)
      .set('srnamespace', '6')
      .set('srlimit', Math.min(limit + 10, 40).toString()) // Get extra for randomization
      .set('sroffset', Math.floor(Math.random() * 100).toString()) // Random starting point
      .set('format', 'json')
      .set('origin', '*');

    searches.push(
      this.http.get<any>(this.API_BASE_URL, { params: mainParams }).pipe(
        map(response => response.query?.search || []),
        map(results => this.shuffleArray(results)), // Shuffle results
        catchError(() => of([]))
      )
    );

    // Strategy 2: Try different individual terms with randomization
    if (shuffledTerms.length > 1) {
      // Pick a random term instead of always the first one
      const randomTerm = shuffledTerms[Math.floor(Math.random() * Math.min(shuffledTerms.length, 3))];
      const individualParams = new HttpParams()
        .set('action', 'query')
        .set('list', 'search')
        .set('srsearch', `${randomTerm} ${this.getRandomSearchModifier()}`)
        .set('srnamespace', '6')
        .set('srlimit', Math.min(Math.floor(limit / 2) + 5, 25).toString())
        .set('sroffset', Math.floor(Math.random() * 50).toString()) // Random offset
        .set('format', 'json')
        .set('origin', '*');

      searches.push(
        this.http.get<any>(this.API_BASE_URL, { params: individualParams }).pipe(
          map(response => response.query?.search || []),
          map(results => this.shuffleArray(results)), // Shuffle results
          catchError(() => of([]))
        )
      );
    }

    // Strategy 3: Try a completely different random term combination
    if (shuffledTerms.length > 2) {
      const altTerms = shuffledTerms.slice(1, 3).join(' OR ');
      const altParams = new HttpParams()
        .set('action', 'query')
        .set('list', 'search')
        .set('srsearch', `${altTerms}`)
        .set('srnamespace', '6')
        .set('srlimit', Math.min(Math.floor(limit / 3), 15).toString())
        .set('sroffset', Math.floor(Math.random() * 75).toString())
        .set('format', 'json')
        .set('origin', '*');

      searches.push(
        this.http.get<any>(this.API_BASE_URL, { params: altParams }).pipe(
          map(response => response.query?.search || []),
          map(results => this.shuffleArray(results)),
          catchError(() => of([]))
        )
      );
    }

    return forkJoin(searches).pipe(
      map(results => {
        const combined = results.flat();
        const unique = this.deduplicateResults(combined);
        const shuffled = this.shuffleArray(unique);
        
        return shuffled.map((result: any) => ({
          pageid: result.pageid,
          title: result.title,
          lat: 0, // Will be filled in by photo details
          lon: 0
        }));
      }),
      catchError(error => {
        console.error('Terms search error:', error);
        return of([]);
      })
    );
  }

  /**
   * Removes duplicate results based on page ID
   * @param results - Array of search results
   */
  private deduplicateResults(results: any[]): any[] {
    const seen = new Set<number>();
    return results.filter(result => {
      if (seen.has(result.pageid)) {
        return false;
      }
      seen.add(result.pageid);
      return true;
    });
  }

  /**
   * Filters results by proximity to a location (placeholder - will be refined when we get actual coordinates)
   * @param results - Search results
   * @param location - Target location
   * @param maxRadius - Maximum distance in meters
   */
  private filterByProximity(results: any[], location: Coordinates, maxRadius: number): any[] {
    // For now, return all results since we'll filter by actual coordinates later
    // This method can be enhanced once we have the actual photo coordinates
    return results;
  }

  /**
   * Fallback method for standard geosearch
   */
  private performStandardGeosearch(location: Coordinates, radius: number, limit: number): Observable<any[]> {
    const params = new HttpParams()
      .set('action', 'query')
      .set('list', 'geosearch')
      .set('gscoord', `${location.latitude}|${location.longitude}`)
      .set('gsradius', radius.toString())
      .set('gslimit', Math.min(limit, 500).toString())
      .set('gsnamespace', '6')
      .set('format', 'json')
      .set('origin', '*');

    return this.http.get<any>(this.API_BASE_URL, { params })
      .pipe(
        map(response => response.query?.geosearch || []),
        catchError(error => {
          console.error('Standard geosearch error:', error);
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
    const cacheKey = `photo-details-${this.hashString(titles)}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => {
        const params = new HttpParams()
          .set('action', 'query')
          .set('titles', titles)
          .set('prop', 'imageinfo')
          .set('iiprop', 'url|metadata|extmetadata')
          .set('format', 'json')
          .set('origin', '*');

        return this.http.get<WikimediaImageInfoResponse>(this.API_BASE_URL, { params })
          .pipe(
            switchMap(async response => {
              const pages = response.query?.pages || {};
              const pageValues = Object.values(pages);
              
              if (pageValues.length === 0) {
                return [];
              }

              // Prepare batch validation requests
              const validationRequests = pageValues
                .filter(page => page.imageinfo?.[0]?.url) // Only process pages with valid image info
                .map(page => {
                  const imageInfo = page.imageinfo[0];
                  const extmetadata = imageInfo.extmetadata || {};
                  
                  return {
                    url: imageInfo.url,
                    mimeType: extmetadata.MimeType?.value,
                    metadata: { extmetadata }
                  };
                });

              // Perform batch format validation
              const validationResults = await this.formatValidationService.validateImageFormatsBatch(validationRequests);
              
              // Create a map of URL to validation result for quick lookup
              const validationMap = new Map<string, any>();
              validationRequests.forEach((request, index) => {
                validationMap.set(request.url, validationResults[index]);
              });

              // Process photos with validation results
              const photos: Photo[] = [];
              
              for (const page of pageValues) {
                try {
                  const photo = await this.processPhotoDataWithValidation(page, validationMap);
                  if (photo) {
                    photos.push(photo);
                  }
                } catch (error) {
                  console.error('Error processing individual photo:', error);
                  // Continue processing other photos
                }
              }

              return photos;
            }),
            catchError(error => {
              console.error('Photo details chunk error:', error);
              return of([]);
            })
          );
      },
      { ttl: this.CACHE_TTL }
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
   * Filters photos to ensure they meet game requirements including format validation
   */
  private filterValidPhotos(photos: Photo[]): Photo[] {
    return photos.filter(photo => {
      // Basic metadata validation
      const hasValidMetadata = this.validatePhotoMetadata(photo) &&
        photo.year >= this.MIN_YEAR &&
        photo.year <= this.MAX_YEAR &&
        photo.coordinates.latitude !== 0 &&
        photo.coordinates.longitude !== 0;

      if (!hasValidMetadata) {
        console.log(`Photo filtered out due to invalid metadata`, {
          url: photo.url,
          year: photo.year,
          coordinates: photo.coordinates,
          hasValidMetadata: false
        });
        return false;
      }

      // Format validation - check if photo has format metadata indicating it passed validation
      const hasValidFormat = photo.metadata?.format && 
        this.formatValidationService.isFormatSupported(photo.metadata.format);

      if (!hasValidFormat) {
        console.log(`Photo filtered out due to format validation failure`, {
          url: photo.url,
          detectedFormat: photo.metadata?.format,
          supportedFormats: this.formatValidationService.getSupportedFormats(),
          rejectionReason: photo.metadata?.format ? 
            `Format '${photo.metadata.format}' is not supported` : 
            'No format detected during processing'
        });
        return false;
      }

      // Log successful filtering
      console.log(`Photo passed all filtering criteria`, {
        url: photo.url,
        year: photo.year,
        format: photo.metadata.format,
        mimeType: photo.metadata.mimeType,
        coordinates: photo.coordinates
      });

      return true;
    });
  }

  /**
   * Selects diverse photos from the filtered results with randomization
   */
  private selectDiversePhotos(photos: Photo[], count: number): Photo[] {
    if (photos.length <= count) return this.shuffleArray(photos);

    // Create multiple selection strategies and pick randomly
    const strategies = [
      () => this.selectByTemporalDiversity(photos, count),
      () => this.selectByGeographicDiversity(photos, count),
      () => this.selectRandomly(photos, count),
      () => this.selectMixed(photos, count)
    ];

    // Randomly choose a selection strategy
    const selectedStrategy = strategies[Math.floor(Math.random() * strategies.length)];
    return selectedStrategy();
  }

  /**
   * Selects photos with temporal diversity
   */
  private selectByTemporalDiversity(photos: Photo[], count: number): Photo[] {
    const sortedPhotos = this.shuffleArray([...photos]).sort((a, b) => a.year - b.year);
    const selected: Photo[] = [];
    const step = Math.floor(sortedPhotos.length / count);

    for (let i = 0; i < count && i * step < sortedPhotos.length; i++) {
      const baseIndex = i * step;
      // Add some randomness within the step range
      const randomOffset = Math.floor(Math.random() * Math.min(step, 3));
      const index = Math.min(baseIndex + randomOffset, sortedPhotos.length - 1);
      selected.push(sortedPhotos[index]);
    }

    // Fill remaining slots randomly
    while (selected.length < count && selected.length < photos.length) {
      const remaining = photos.filter(p => !selected.includes(p));
      if (remaining.length > 0) {
        const randomIndex = Math.floor(Math.random() * remaining.length);
        selected.push(remaining[randomIndex]);
      } else {
        break;
      }
    }

    return this.shuffleArray(selected);
  }

  /**
   * Selects photos with geographic diversity
   */
  private selectByGeographicDiversity(photos: Photo[], count: number): Photo[] {
    const selected: Photo[] = [];
    const remaining = [...photos];

    // First photo is random
    if (remaining.length > 0) {
      const firstIndex = Math.floor(Math.random() * remaining.length);
      selected.push(remaining.splice(firstIndex, 1)[0]);
    }

    // Select subsequent photos that are geographically diverse
    while (selected.length < count && remaining.length > 0) {
      let bestPhoto = remaining[0];
      let maxMinDistance = 0;

      // Find photo with maximum minimum distance to already selected photos
      for (const candidate of remaining) {
        let minDistance = Infinity;
        for (const selectedPhoto of selected) {
          const distance = this.calculateDistance(
            candidate.coordinates,
            selectedPhoto.coordinates
          );
          minDistance = Math.min(minDistance, distance);
        }
        
        // Add some randomness to avoid always picking the most distant
        const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        const adjustedDistance = minDistance * randomFactor;
        
        if (adjustedDistance > maxMinDistance) {
          maxMinDistance = adjustedDistance;
          bestPhoto = candidate;
        }
      }

      selected.push(bestPhoto);
      remaining.splice(remaining.indexOf(bestPhoto), 1);
    }

    return this.shuffleArray(selected);
  }

  /**
   * Selects photos completely randomly
   */
  private selectRandomly(photos: Photo[], count: number): Photo[] {
    const shuffled = this.shuffleArray([...photos]);
    return shuffled.slice(0, count);
  }

  /**
   * Selects photos using a mixed approach
   */
  private selectMixed(photos: Photo[], count: number): Photo[] {
    const selected: Photo[] = [];
    const shuffled = this.shuffleArray([...photos]);
    
    // Take some from different parts of the shuffled array
    const segments = Math.min(count, 4);
    const segmentSize = Math.floor(shuffled.length / segments);
    
    for (let i = 0; i < segments && selected.length < count; i++) {
      const segmentStart = i * segmentSize;
      const segmentEnd = Math.min(segmentStart + segmentSize, shuffled.length);
      const segmentPhotos = shuffled.slice(segmentStart, segmentEnd);
      
      if (segmentPhotos.length > 0) {
        const randomIndex = Math.floor(Math.random() * segmentPhotos.length);
        selected.push(segmentPhotos[randomIndex]);
      }
    }

    // Fill remaining slots randomly
    while (selected.length < count && selected.length < photos.length) {
      const remaining = photos.filter(p => !selected.includes(p));
      if (remaining.length > 0) {
        const randomIndex = Math.floor(Math.random() * remaining.length);
        selected.push(remaining[randomIndex]);
      } else {
        break;
      }
    }

    return this.shuffleArray(selected);
  }

  /**
   * Calculates distance between two coordinates (simple Euclidean distance)
   */
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const latDiff = coord1.latitude - coord2.latitude;
    const lonDiff = coord1.longitude - coord2.longitude;
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
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

  /**
   * Simple hash function for creating cache keys
   * @param str - String to hash
   * @returns Hash value as string
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Shuffles an array using Fisher-Yates algorithm
   * @param array - Array to shuffle
   * @returns Shuffled copy of the array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Gets a random sort key for category member searches
   * @returns Random sort key string
   */
  private getRandomSortKey(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * 3) + 1; // 1-3 characters
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Gets a random search modifier to vary search results
   * @returns Random search modifier string
   */
  private getRandomSearchModifier(): string {
    const modifiers = [
      'filetype:bitmap',
      'historic',
      'old',
      'vintage',
      'photograph',
      'image',
      ''
    ];
    return modifiers[Math.floor(Math.random() * modifiers.length)];
  }
}