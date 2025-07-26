import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, filter } from 'rxjs/operators';
import { Photo, validatePhotoMetadata } from '../models/photo.model';
import { Coordinates } from '../models/coordinates.model';
import { CacheService } from './cache.service';

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

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) { }

  /**
   * Fetches random historical photos from Wikimedia Commons using geosearch
   * @param count - Number of photos to fetch
   * @returns Observable of Photo array
   */
  fetchRandomPhotos(count: number): Observable<Photo[]> {
    const cacheKey = `random-photos-${count}-${Date.now() - (Date.now() % (5 * 60 * 1000))}`; // 5-minute cache buckets
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => {
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
      },
      { ttl: this.PHOTO_CACHE_TTL }
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

    // Shuffle and take the requested count
    const shuffled = [...allLocations].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Searches for photos near a specific location using geosearch
   */
  private searchPhotosByLocation(location: Coordinates): Observable<any[]> {
    const cacheKey = `geosearch-${location.latitude}-${location.longitude}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => {
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
      },
      { ttl: this.CACHE_TTL }
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
}