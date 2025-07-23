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
      // Africa
      { latitude: 9.0579, longitude: 7.4951 },    // Abuja, Nigeria
      { latitude: 5.5560, longitude: -0.1969 },   // Accra, Ghana
      { latitude: 9.0300, longitude: 38.7400 },   // Addis Ababa, Ethiopia
      { latitude: 36.7538, longitude: 3.0588 },   // Algiers, Algeria
      { latitude: -8.8390, longitude: 13.2894 },  // Luanda, Angola
      { latitude: -25.7479, longitude: 28.2293 }, // Pretoria, South Africa
      { latitude: 30.0444, longitude: 31.2357 },  // Cairo, Egypt
      { latitude: 33.8869, longitude: 9.5375 },   // Tunis, Tunisia
      { latitude: -17.8252, longitude: 31.0335 }, // Harare, Zimbabwe
      { latitude: -1.9441, longitude: 30.0619 },  // Kigali, Rwanda
      { latitude: 6.1319, longitude: 1.2228 },    // Lomé, Togo
      { latitude: 32.8872, longitude: 13.1913 },  // Tripoli, Libya
      { latitude: -22.5597, longitude: 17.0832 }, // Windhoek, Namibia
      { latitude: 15.5007, longitude: 32.5599 },  // Khartoum, Sudan
      { latitude: -26.3054, longitude: 31.1367 }, // Mbabane, Eswatini
      { latitude: 12.3714, longitude: -1.5197 },  // Ouagadougou, Burkina Faso

      // Asia
      { latitude: 39.9042, longitude: 116.4074 }, // Beijing, China
      { latitude: 28.6139, longitude: 77.2090 },  // New Delhi, India
      { latitude: 35.6762, longitude: 139.6503 }, // Tokyo, Japan
      { latitude: 37.5665, longitude: 126.9780 }, // Seoul, South Korea
      { latitude: 21.0285, longitude: 105.8542 }, // Hanoi, Vietnam
      { latitude: 13.7563, longitude: 100.5018 }, // Bangkok, Thailand
      { latitude: 3.1390, longitude: 101.6869 },  // Kuala Lumpur, Malaysia
      { latitude: 1.3521, longitude: 103.8198 },  // Singapore
      { latitude: -6.2088, longitude: 106.8456 }, // Jakarta, Indonesia
      { latitude: 14.5995, longitude: 120.9842 }, // Manila, Philippines
      { latitude: 23.8103, longitude: 90.4125 },  // Dhaka, Bangladesh
      { latitude: 27.7172, longitude: 85.3240 },  // Kathmandu, Nepal
      { latitude: 6.9271, longitude: 79.8612 },   // Colombo, Sri Lanka
      { latitude: 33.6844, longitude: 73.0479 },  // Islamabad, Pakistan
      { latitude: 34.5553, longitude: 69.2075 },  // Kabul, Afghanistan
      { latitude: 38.8951, longitude: 71.4677 },  // Dushanbe, Tajikistan
      { latitude: 41.2995, longitude: 69.2401 },  // Tashkent, Uzbekistan
      { latitude: 42.8746, longitude: 74.5698 },  // Bishkek, Kyrgyzstan
      { latitude: 37.9601, longitude: 58.3261 },  // Ashgabat, Turkmenistan

      // Europe
      { latitude: 51.5074, longitude: -0.1278 },  // London, United Kingdom
      { latitude: 48.8566, longitude: 2.3522 },   // Paris, France
      { latitude: 52.5200, longitude: 13.4050 },  // Berlin, Germany
      { latitude: 41.9028, longitude: 12.4964 },  // Rome, Italy
      { latitude: 40.4168, longitude: -3.7038 },  // Madrid, Spain
      { latitude: 38.7223, longitude: -9.1393 },  // Lisbon, Portugal
      { latitude: 52.3676, longitude: 4.9041 },   // Amsterdam, Netherlands
      { latitude: 50.8503, longitude: 4.3517 },   // Brussels, Belgium
      { latitude: 46.9481, longitude: 7.4474 },   // Bern, Switzerland
      { latitude: 48.2082, longitude: 16.3738 },  // Vienna, Austria
      { latitude: 59.9139, longitude: 10.7522 },  // Oslo, Norway
      { latitude: 59.3293, longitude: 18.0686 },  // Stockholm, Sweden
      { latitude: 60.1699, longitude: 24.9384 },  // Helsinki, Finland
      { latitude: 55.6761, longitude: 12.5683 },  // Copenhagen, Denmark
      { latitude: 64.1466, longitude: -21.9426 }, // Reykjavik, Iceland
      { latitude: 53.3498, longitude: -6.2603 },  // Dublin, Ireland
      { latitude: 55.7558, longitude: 37.6176 },  // Moscow, Russia
      { latitude: 50.4501, longitude: 30.5234 },  // Kyiv, Ukraine
      { latitude: 52.2297, longitude: 21.0122 },  // Warsaw, Poland
      { latitude: 50.0755, longitude: 14.4378 },  // Prague, Czech Republic
      { latitude: 47.4979, longitude: 19.0402 },  // Budapest, Hungary
      { latitude: 44.4268, longitude: 26.1025 },  // Bucharest, Romania
      { latitude: 42.6977, longitude: 23.3219 },  // Sofia, Bulgaria
      { latitude: 37.9838, longitude: 23.7275 },  // Athens, Greece
      { latitude: 35.1676, longitude: 33.3736 },  // Nicosia, Cyprus
      { latitude: 45.8150, longitude: 15.9819 },  // Zagreb, Croatia
      { latitude: 46.0569, longitude: 14.5058 },  // Ljubljana, Slovenia
      { latitude: 43.8563, longitude: 18.4131 },  // Sarajevo, Bosnia and Herzegovina
      { latitude: 42.4304, longitude: 19.2594 },  // Podgorica, Montenegro
      { latitude: 42.0000, longitude: 21.4333 },  // Skopje, North Macedonia
      { latitude: 41.3275, longitude: 19.8187 },  // Tirana, Albania
      { latitude: 44.8176, longitude: 20.4633 },  // Belgrade, Serbia

      // North America
      { latitude: 38.9072, longitude: -77.0369 }, // Washington D.C., USA
      { latitude: 45.4215, longitude: -75.6972 }, // Ottawa, Canada
      { latitude: 19.4326, longitude: -99.1332 }, // Mexico City, Mexico
      { latitude: 17.2510, longitude: -88.7590 }, // Belize City, Belize
      { latitude: 14.0723, longitude: -87.1921 }, // Tegucigalpa, Honduras
      { latitude: 12.1364, longitude: -86.2514 }, // Managua, Nicaragua
      { latitude: 9.9281, longitude: -84.0907 },  // San José, Costa Rica
      { latitude: 8.9824, longitude: -79.5199 },  // Panama City, Panama

      // South America
      { latitude: -22.9068, longitude: -43.1729 }, // Rio de Janeiro, Brazil (Former capital)
      { latitude: -15.8267, longitude: -47.9218 }, // Brasília, Brazil
      { latitude: -34.6037, longitude: -58.3816 }, // Buenos Aires, Argentina
      { latitude: -33.4489, longitude: -70.6693 }, // Santiago, Chile
      { latitude: 4.7110, longitude: -74.0721 },  // Bogotá, Colombia
      { latitude: -12.0464, longitude: -77.0428 }, // Lima, Peru
      { latitude: 10.4806, longitude: -66.9036 }, // Caracas, Venezuela
      { latitude: -3.1190, longitude: -60.0217 },  // Manaus, Brazil (Regional)
      { latitude: -25.2637, longitude: -57.5759 }, // Asunción, Paraguay
      { latitude: -34.9011, longitude: -56.1645 }, // Montevideo, Uruguay
      { latitude: 5.8520, longitude: -55.2038 },   // Paramaribo, Suriname
      { latitude: 6.8013, longitude: -58.1551 },   // Georgetown, Guyana

      // Oceania
      { latitude: -35.2809, longitude: 149.1300 }, // Canberra, Australia
      { latitude: -41.2865, longitude: 174.7762 }, // Wellington, New Zealand
      { latitude: -17.7134, longitude: 168.3273 }, // Port Vila, Vanuatu
      { latitude: -9.4438, longitude: 159.9729 },  // Honiara, Solomon Islands
      { latitude: -8.5243, longitude: 179.1942 },  // Suva, Fiji
      { latitude: -21.1789, longitude: -175.1982 }, // Nuku'alofa, Tonga
      { latitude: -13.8506, longitude: -171.7513 }, // Apia, Samoa
      { latitude: 7.5000, longitude: 134.6242 },   // Koror, Palau

      // Middle East
      { latitude: 39.9334, longitude: 32.8597 },  // Ankara, Turkey
      { latitude: 33.3152, longitude: 44.3661 },  // Baghdad, Iraq
      { latitude: 35.6892, longitude: 51.3890 },  // Tehran, Iran
      { latitude: 31.9539, longitude: 35.9106 },  // Jerusalem, Israel/Palestine
      { latitude: 31.7767, longitude: 35.2345 },  // Amman, Jordan
      { latitude: 33.8938, longitude: 35.5018 },  // Beirut, Lebanon
      { latitude: 33.5138, longitude: 36.2765 },  // Damascus, Syria
      { latitude: 29.3117, longitude: 47.4818 },  // Kuwait City, Kuwait
      { latitude: 26.0667, longitude: 50.5577 },  // Manama, Bahrain
      { latitude: 25.2048, longitude: 55.2708 },  // Dubai, UAE (Major city)
      { latitude: 24.4539, longitude: 54.3773 },  // Abu Dhabi, UAE
      { latitude: 23.5859, longitude: 58.4059 },  // Muscat, Oman
      { latitude: 25.3548, longitude: 51.1839 },  // Doha, Qatar
      { latitude: 24.7136, longitude: 46.6753 },  // Riyadh, Saudi Arabia
      { latitude: 15.3694, longitude: 44.1910 },  // Sana'a, Yemen
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