import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PhotoService, InsufficientPhotosError, PhotoFetchError } from './photo.service';
import { FormatValidationService, FormatValidationResult } from './format-validation.service';
import { CacheService } from './cache.service';
import { Photo } from '../models/photo.model';
import { firstValueFrom } from 'rxjs';

/**
 * Integration tests for PhotoService with format validation enhancement
 * Tests the complete photo fetching workflow including format validation,
 * retry logic, error handling, and fallback behavior
 */
describe('PhotoService Integration Tests', () => {
  let service: PhotoService;
  let httpMock: HttpTestingController;
  let formatValidationService: jasmine.SpyObj<FormatValidationService>;
  let cacheService: jasmine.SpyObj<CacheService>;

  const API_BASE_URL = 'https://commons.wikimedia.org/w/api.php';

  // Mock data for testing
  const mockValidFormatValidation: FormatValidationResult = {
    isValid: true,
    detectedFormat: 'jpeg',
    detectedMimeType: 'image/jpeg',
    confidence: 0.9,
    detectionMethod: 'mime-type'
  };

  const mockInvalidFormatValidation: FormatValidationResult = {
    isValid: false,
    detectedFormat: 'tiff',
    detectedMimeType: 'image/tiff',
    rejectionReason: 'Limited browser support',
    confidence: 0.9,
    detectionMethod: 'mime-type'
  };

  const mockGeosearchResponse = {
    query: {
      geosearch: [
        { title: 'File:Valid_Photo_1.jpg', pageid: 1, lat: 40.7128, lon: -74.0060, dist: 100 },
        { title: 'File:Valid_Photo_2.png', pageid: 2, lat: 51.5074, lon: -0.1278, dist: 200 },
        { title: 'File:Invalid_Photo_1.tiff', pageid: 3, lat: 48.8566, lon: 2.3522, dist: 300 }
      ]
    }
  };

  const mockImageInfoResponse = {
    query: {
      pages: {
        '1': {
          title: 'File:Valid_Photo_1.jpg',
          imageinfo: [{
            url: 'https://example.com/valid1.jpg',
            extmetadata: {
              DateTimeOriginal: { value: '1950:01:01 00:00:00' },
              GPSLatitude: { value: '40.7128' },
              GPSLongitude: { value: '-74.0060' },
              Artist: { value: 'Test Photographer 1' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              MimeType: { value: 'image/jpeg' }
            }
          }]
        },
        '2': {
          title: 'File:Valid_Photo_2.png',
          imageinfo: [{
            url: 'https://example.com/valid2.png',
            extmetadata: {
              DateTime: { value: '1960-05-15' },
              GPSLatitude: { value: '51.5074' },
              GPSLongitude: { value: '-0.1278' },
              LicenseShortName: { value: 'Public Domain' },
              MimeType: { value: 'image/png' }
            }
          }]
        },
        '3': {
          title: 'File:Invalid_Photo_1.tiff',
          imageinfo: [{
            url: 'https://example.com/invalid1.tiff',
            extmetadata: {
              DateTimeOriginal: { value: '1955:03:20 15:30:00' },
              GPSLatitude: { value: '48.8566' },
              GPSLongitude: { value: '2.3522' },
              LicenseShortName: { value: 'CC BY 4.0' },
              MimeType: { value: 'image/tiff' }
            }
          }]
        }
      }
    }
  };

  beforeEach(() => {
    const formatValidationSpy = jasmine.createSpyObj('FormatValidationService', [
      'validateImageFormat', 'isFormatSupported', 'getSupportedFormats'
    ]);
    const cacheSpy = jasmine.createSpyObj('CacheService', ['getOrSet']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PhotoService,
        { provide: FormatValidationService, useValue: formatValidationSpy },
        { provide: CacheService, useValue: cacheSpy }
      ]
    });

    service = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
    formatValidationService = TestBed.inject(FormatValidationService) as jasmine.SpyObj<FormatValidationService>;
    cacheService = TestBed.inject(CacheService) as jasmine.SpyObj<CacheService>;

    // Set up default behavior
    formatValidationService.getSupportedFormats.and.returnValue(['jpeg', 'png', 'webp']);
    
    // Mock cache service to bypass caching for tests
    cacheService.getOrSet.and.callFake((key: string, factory: () => any) => factory());
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Complete Photo Fetching Workflow with Format Validation', () => {
    it('should successfully fetch photos with format validation integrated', async () => {
      // Set up format validation responses
      formatValidationService.validateImageFormat.and.callFake((url: string) => {
        if (url.includes('valid1.jpg') || url.includes('valid2.png')) {
          return Promise.resolve(mockValidFormatValidation);
        } else {
          return Promise.resolve(mockInvalidFormatValidation);
        }
      });

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle geosearch requests (there will be 2 for 2 locations)
      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('action') === 'query' && req.params.get('list') === 'geosearch'
      );
      expect(geosearchReqs.length).toBe(2);
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      // Handle image info request
      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('action') === 'query' && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // Should return only valid format photos (2 valid out of 3 total)
      expect(photos.length).toBe(2);
      expect(photos[0].url).toBe('https://example.com/valid1.jpg');
      expect(photos[1].url).toBe('https://example.com/valid2.png');

      // Verify format validation was called for all photos
      expect(formatValidationService.validateImageFormat).toHaveBeenCalledTimes(3);

      // Verify format metadata is included in photo objects
      expect(photos[0].metadata.format).toBe('jpeg');
      expect(photos[0].metadata.mimeType).toBe('image/jpeg');
      expect(photos[1].metadata.format).toBe('jpeg'); // Mock returns same format
    });

    it('should preserve existing photo processing functionality', async () => {
      // Test that format validation doesn't break existing metadata extraction
      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockValidFormatValidation));

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle requests
      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // Verify all existing metadata is still extracted correctly
      expect(photos[0].id).toBe('Valid_Photo_1.jpg');
      expect(photos[0].title).toBe('Valid_Photo_1');
      expect(photos[0].year).toBe(1950);
      expect(photos[0].coordinates.latitude).toBe(40.7128);
      expect(photos[0].coordinates.longitude).toBe(-74.0060);
      expect(photos[0].metadata.photographer).toBe('Test Photographer 1');
      expect(photos[0].metadata.license).toBe('CC BY-SA 4.0');
      expect(photos[0].source).toBe('Wikimedia Commons');
    });
  });

  describe('Retry Logic for Insufficient Valid Photos', () => {
    it('should retry when insufficient photos pass format validation', async () => {
      let callCount = 0;
      
      // First attempt: only 1 valid photo out of 3
      // Second attempt: 2 valid photos out of 3 (sufficient)
      formatValidationService.validateImageFormat.and.callFake((url: string) => {
        callCount++;
        
        if (callCount <= 3) {
          // First attempt - only first photo is valid
          return Promise.resolve(url.includes('valid1.jpg') ? mockValidFormatValidation : mockInvalidFormatValidation);
        } else {
          // Second attempt - first 2 photos are valid
          const isValid = url.includes('valid1.jpg') || url.includes('valid2.png');
          return Promise.resolve(isValid ? mockValidFormatValidation : mockInvalidFormatValidation);
        }
      });

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle first attempt geosearch requests
      let geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      expect(geosearchReqs.length).toBe(2);
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      // Handle first attempt image info request
      let imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      // Handle second attempt geosearch requests (retry with expanded search)
      geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      expect(geosearchReqs.length).toBe(2);
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      // Handle second attempt image info request
      imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // Should successfully return 2 photos after retry
      expect(photos.length).toBe(2);
      
      // Verify format validation was called for both attempts
      expect(formatValidationService.validateImageFormat).toHaveBeenCalledTimes(6); // 3 photos × 2 attempts
    });

    it('should return partial results when max retries reached but some photos found', async () => {
      // Always return only 1 valid photo to test partial results
      formatValidationService.validateImageFormat.and.callFake((url: string) => {
        return Promise.resolve(url.includes('valid1.jpg') ? mockValidFormatValidation : mockInvalidFormatValidation);
      });

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle all retry attempts (initial + 3 retries = 4 total)
      for (let attempt = 0; attempt < 4; attempt++) {
        const geosearchReqs = httpMock.match(req => 
          req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
        );
        geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

        const imageInfoReq = httpMock.expectOne(req => 
          req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
        );
        imageInfoReq.flush(mockImageInfoResponse);
      }

      const photos = await photosPromise;

      // Should return 1 photo (partial results) instead of throwing error
      expect(photos.length).toBe(1);
      expect(photos[0].url).toBe('https://example.com/valid1.jpg');
    });
  });

  describe('Error Scenarios and Fallback Behavior', () => {
    it('should handle format validation service errors gracefully', async () => {
      // First photo throws error, second succeeds
      let callCount = 0;
      formatValidationService.validateImageFormat.and.callFake((url: string) => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Format validation service error'));
        }
        return Promise.resolve(mockValidFormatValidation);
      });

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle requests
      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // Should return photos that passed validation, skip errored ones
      expect(photos.length).toBe(2); // 2 photos passed validation (excluding the first that errored)
    });

    it('should throw InsufficientPhotosError when no valid photos found after retries', async () => {
      // All photos fail format validation
      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockInvalidFormatValidation));

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle all retry attempts
      for (let attempt = 0; attempt < 4; attempt++) {
        const geosearchReqs = httpMock.match(req => 
          req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
        );
        geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

        const imageInfoReq = httpMock.expectOne(req => 
          req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
        );
        imageInfoReq.flush(mockImageInfoResponse);
      }

      try {
        await photosPromise;
        fail('Should have thrown InsufficientPhotosError');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientPhotosError);
        expect((error as InsufficientPhotosError).requestedCount).toBe(2);
        expect((error as InsufficientPhotosError).attemptsUsed).toBe(4);
        expect((error as InsufficientPhotosError).message).toContain('Unable to find photos in supported formats');
      }
    });

    it('should handle network errors during photo fetching with retry', async () => {
      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockValidFormatValidation));

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // First attempt - network error
      const geosearchReqs1 = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs1.forEach(req => req.error(new ErrorEvent('Network error')));

      // Second attempt - success
      const geosearchReqs2 = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs2.forEach(req => req.flush(mockGeosearchResponse));

      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // Should succeed after retry
      expect(photos.length).toBe(2);
    });

    it('should throw PhotoFetchError when max retries reached due to network errors', async () => {
      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockValidFormatValidation));

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // All attempts fail with network errors
      for (let attempt = 0; attempt < 4; attempt++) {
        const geosearchReqs = httpMock.match(req => 
          req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
        );
        geosearchReqs.forEach(req => req.error(new ErrorEvent('Network error')));
      }

      try {
        await photosPromise;
        fail('Should have thrown PhotoFetchError');
      } catch (error) {
        expect(error).toBeInstanceOf(PhotoFetchError);
        expect((error as PhotoFetchError).message).toContain('Failed to fetch photos after');
      }
    });
  });

  describe('Format Validation Integration Edge Cases', () => {
    it('should handle photos with missing MIME type metadata', async () => {
      formatValidationService.validateImageFormat.and.callFake((url: string, mimeType?: string) => {
        // Verify that undefined MIME type is handled correctly
        expect(mimeType).toBeUndefined();
        return Promise.resolve(mockValidFormatValidation);
      });

      const responseWithoutMimeType = {
        query: {
          pages: {
            '1': {
              title: 'File:No_MimeType.jpg',
              imageinfo: [{
                url: 'https://example.com/no-mime.jpg',
                extmetadata: {
                  DateTimeOriginal: { value: '1950:01:01 00:00:00' },
                  GPSLatitude: { value: '40.7128' },
                  GPSLongitude: { value: '-74.0060' },
                  LicenseShortName: { value: 'Public Domain' }
                  // No MimeType field
                }
              }]
            }
          }
        }
      };

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(1));

      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush({
        query: {
          geosearch: [{ title: 'File:No_MimeType.jpg', pageid: 1, lat: 40.7128, lon: -74.0060, dist: 100 }]
        }
      }));

      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(responseWithoutMimeType);

      const photos = await photosPromise;

      expect(photos.length).toBe(1);
      expect(formatValidationService.validateImageFormat).toHaveBeenCalledWith(
        'https://example.com/no-mime.jpg',
        undefined,
        jasmine.any(Object)
      );
    });

    it('should pass correct metadata structure to format validation', async () => {
      formatValidationService.validateImageFormat.and.callFake((url: string, mimeType?: string, metadata?: any) => {
        // Verify metadata structure is passed correctly
        expect(metadata).toBeDefined();
        expect(metadata.extmetadata).toBeDefined();
        expect(metadata.extmetadata.MimeType).toBeDefined();
        expect(metadata.extmetadata.MimeType.value).toBe('image/jpeg');
        return Promise.resolve(mockValidFormatValidation);
      });

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(1));

      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush({
        query: {
          geosearch: [{ title: 'File:Test.jpg', pageid: 1, lat: 40.7128, lon: -74.0060, dist: 100 }]
        }
      }));

      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush({
        query: {
          pages: {
            '1': {
              title: 'File:Test.jpg',
              imageinfo: [{
                url: 'https://example.com/test.jpg',
                extmetadata: {
                  DateTimeOriginal: { value: '1950:01:01 00:00:00' },
                  GPSLatitude: { value: '40.7128' },
                  GPSLongitude: { value: '-74.0060' },
                  LicenseShortName: { value: 'Public Domain' },
                  MimeType: { value: 'image/jpeg' }
                }
              }]
            }
          }
        }
      });

      await photosPromise;

      expect(formatValidationService.validateImageFormat).toHaveBeenCalledWith(
        'https://example.com/test.jpg',
        'image/jpeg',
        jasmine.objectContaining({
          extmetadata: jasmine.objectContaining({
            MimeType: { value: 'image/jpeg' }
          })
        })
      );
    });
  });

  describe('Requirements Verification', () => {
    it('should meet requirement 1.1: System only selects images in supported web formats', async () => {
      // Mix of supported and unsupported formats
      formatValidationService.validateImageFormat.and.callFake((url: string) => {
        const isSupported = url.includes('jpg') || url.includes('png');
        return Promise.resolve({
          isValid: isSupported,
          detectedFormat: isSupported ? 'jpeg' : 'tiff',
          confidence: 0.9,
          detectionMethod: 'mime-type',
          rejectionReason: isSupported ? undefined : 'Limited browser support'
        });
      });

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // Should only return supported formats
      expect(photos.length).toBe(2);
      photos.forEach(photo => {
        expect(['jpeg', 'png', 'webp']).toContain(photo.metadata.format || '');
      });
    });

    it('should meet requirement 1.3: All photos load successfully without format-related errors', async () => {
      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockValidFormatValidation));

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // All returned photos should have valid URLs and metadata
      expect(photos.length).toBe(2);
      photos.forEach(photo => {
        expect(photo.url).toBeTruthy();
        expect(photo.url).toMatch(/^https?:\/\//);
        expect(photo.metadata.format).toBeTruthy();
      });
    });

    it('should meet requirement 4.1: System attempts to find alternative photos when rejected', async () => {
      let attemptCount = 0;
      
      // First attempt: insufficient valid photos, second attempt: sufficient
      formatValidationService.validateImageFormat.and.callFake(() => {
        attemptCount++;
        // First 3 calls (first attempt): only 1 valid
        // Next 3 calls (second attempt): 2 valid
        if (attemptCount <= 3) {
          return Promise.resolve(attemptCount === 1 ? mockValidFormatValidation : mockInvalidFormatValidation);
        } else {
          return Promise.resolve(attemptCount <= 5 ? mockValidFormatValidation : mockInvalidFormatValidation);
        }
      });

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle first attempt
      let geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      let imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      // Handle second attempt (retry)
      geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);

      const photos = await photosPromise;

      // Should successfully find alternative photos through retry
      expect(photos.length).toBe(2);
      expect(attemptCount).toBe(6); // 3 photos × 2 attempts
    });

    it('should meet requirement 4.3: System displays helpful error message when format restrictions reduce available photos', async () => {
      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockInvalidFormatValidation));

      const photosPromise = firstValueFrom(service.fetchRandomPhotos(2));

      // Handle all retry attempts with no valid photos
      for (let attempt = 0; attempt < 4; attempt++) {
        const geosearchReqs = httpMock.match(req => 
          req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
        );
        geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

        const imageInfoReq = httpMock.expectOne(req => 
          req.url === API_BASE_URL && req.params.get('prop') === 'imageinfo'
        );
        imageInfoReq.flush(mockImageInfoResponse);
      }

      try {
        await photosPromise;
        fail('Should have thrown InsufficientPhotosError');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientPhotosError);
        expect((error as InsufficientPhotosError).message).toContain('Unable to find photos in supported formats');
        expect((error as InsufficientPhotosError).message).toContain('format restrictions');
        expect((error as InsufficientPhotosError).message).toContain('multiple retry attempts');
      }
    });
  });
});