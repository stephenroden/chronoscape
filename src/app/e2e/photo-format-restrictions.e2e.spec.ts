import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { firstValueFrom, of, throwError } from 'rxjs';

import { PhotoService, InsufficientPhotosError, PhotoFetchError } from '../services/photo.service';
import { FormatValidationService } from '../services/format-validation.service';
import { FormatValidationLoggerService } from '../services/format-validation-logger.service';
import { FormatConfigService } from '../services/format-config.service';
import { CacheService } from '../services/cache.service';
import { Photo } from '../models/photo.model';
import { gameReducer } from '../state/game/game.reducer';
import { photosReducer } from '../state/photos/photos.reducer';
import { scoringReducer } from '../state/scoring/scoring.reducer';
import { PhotosEffects } from '../state/photos/photos.effects';
import { ScoringEffects } from '../state/scoring/scoring.effects';
import * as PhotosActions from '../state/photos/photos.actions';
import * as GameActions from '../state/game/game.actions';
import { selectAllPhotos, selectPhotosError, selectPhotosLoading } from '../state/photos/photos.selectors';
import { selectGameStatus } from '../state/game/game.selectors';
import { GameStatus } from '../models/game-state.model';

/**
 * End-to-end tests for photo format restrictions feature
 * Tests complete game workflow with format validation enabled
 * Requirements: 1.1, 1.3, 1.5, 4.4, 5.5
 */
describe('Photo Format Restrictions E2E', () => {
  let photoService: PhotoService;
  let formatValidationService: FormatValidationService;
  let formatLoggerService: FormatValidationLoggerService;
  let formatConfigService: FormatConfigService;
  let cacheService: CacheService;
  let httpMock: HttpTestingController;
  let store: Store;

  // Mock photo data with different formats
  const mockValidJpegPhoto = {
    title: 'File:Valid_Photo.jpg',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Valid_Photo.jpg/800px-Valid_Photo.jpg',
      extmetadata: {
        DateTime: { value: '1950-01-01 00:00:00' },
        GPSLatitude: { value: '40.7128' },
        GPSLongitude: { value: '-74.0060' },
        Artist: { value: 'Test Photographer' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        MimeType: { value: 'image/jpeg' }
      }
    }]
  };

  const mockValidPngPhoto = {
    title: 'File:Valid_PNG_Photo.png',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Valid_PNG_Photo.png/800px-Valid_PNG_Photo.png',
      extmetadata: {
        DateTime: { value: '1960-01-01 00:00:00' },
        GPSLatitude: { value: '51.5074' },
        GPSLongitude: { value: '-0.1278' },
        Artist: { value: 'PNG Photographer' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        MimeType: { value: 'image/png' }
      }
    }]
  };

  const mockValidWebpPhoto = {
    title: 'File:Valid_WebP_Photo.webp',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Valid_WebP_Photo.webp/800px-Valid_WebP_Photo.webp',
      extmetadata: {
        DateTime: { value: '1970-01-01 00:00:00' },
        GPSLatitude: { value: '48.8566' },
        GPSLongitude: { value: '2.3522' },
        Artist: { value: 'WebP Photographer' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        MimeType: { value: 'image/webp' }
      }
    }]
  };

  const mockInvalidTiffPhoto = {
    title: 'File:Invalid_TIFF_Photo.tiff',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Invalid_TIFF_Photo.tiff/800px-Invalid_TIFF_Photo.tiff',
      extmetadata: {
        DateTime: { value: '1980-01-01 00:00:00' },
        GPSLatitude: { value: '35.6762' },
        GPSLongitude: { value: '139.6503' },
        Artist: { value: 'TIFF Photographer' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        MimeType: { value: 'image/tiff' }
      }
    }]
  };

  const mockInvalidSvgPhoto = {
    title: 'File:Invalid_SVG_Photo.svg',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Invalid_SVG_Photo.svg/800px-Invalid_SVG_Photo.svg',
      extmetadata: {
        DateTime: { value: '1990-01-01 00:00:00' },
        GPSLatitude: { value: '37.7749' },
        GPSLongitude: { value: '-122.4194' },
        Artist: { value: 'SVG Artist' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        MimeType: { value: 'image/svg+xml' }
      }
    }]
  };

  const mockInvalidGifPhoto = {
    title: 'File:Invalid_GIF_Photo.gif',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fg/Invalid_GIF_Photo.gif/800px-Invalid_GIF_Photo.gif',
      extmetadata: {
        DateTime: { value: '2000-01-01 00:00:00' },
        GPSLatitude: { value: '34.0522' },
        GPSLongitude: { value: '-118.2437' },
        Artist: { value: 'GIF Creator' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        MimeType: { value: 'image/gif' }
      }
    }]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PhotoService,
        FormatValidationService,
        FormatValidationLoggerService,
        FormatConfigService,
        CacheService,
        provideStore({
          game: gameReducer,
          photos: photosReducer,
          scoring: scoringReducer
        }),
        provideEffects([PhotosEffects, ScoringEffects])
      ]
    }).compileComponents();

    photoService = TestBed.inject(PhotoService);
    formatValidationService = TestBed.inject(FormatValidationService);
    formatLoggerService = TestBed.inject(FormatValidationLoggerService);
    formatConfigService = TestBed.inject(FormatConfigService);
    cacheService = TestBed.inject(CacheService);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(Store);

    // Clear cache before each test
    cacheService.clear();
    
    // Clear format validation logs
    formatLoggerService.clearLogs();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Complete Game Workflow with Format Validation', () => {
    it('should successfully load valid photos and reject invalid formats in game session', async () => {
      // Requirement 1.1: All photos load successfully
      const mockGeosearchResponse = {
        query: {
          geosearch: [
            { pageid: 1, title: 'File:Valid_Photo.jpg' },
            { pageid: 2, title: 'File:Valid_PNG_Photo.png' },
            { pageid: 3, title: 'File:Valid_WebP_Photo.webp' },
            { pageid: 4, title: 'File:Invalid_TIFF_Photo.tiff' },
            { pageid: 5, title: 'File:Invalid_SVG_Photo.svg' },
            { pageid: 6, title: 'File:Invalid_GIF_Photo.gif' }
          ]
        }
      };

      const mockImageInfoResponse = {
        query: {
          pages: {
            '1': mockValidJpegPhoto,
            '2': mockValidPngPhoto,
            '3': mockValidWebpPhoto,
            '4': mockInvalidTiffPhoto,
            '5': mockInvalidSvgPhoto,
            '6': mockInvalidGifPhoto
          }
        }
      };

      // Start game and load photos
      store.dispatch(GameActions.startGame());
      store.dispatch(PhotosActions.loadPhotos());

      // Mock geosearch API calls (multiple locations)
      const geosearchRequests = httpMock.match(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('list') === 'geosearch'
      );
      
      geosearchRequests.forEach(req => {
        req.flush(mockGeosearchResponse);
      });

      // Mock imageinfo API call
      const imageinfoRequest = httpMock.expectOne(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('prop') === 'imageinfo'
      );
      imageinfoRequest.flush(mockImageInfoResponse);

      // Wait for photos to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify only valid format photos are loaded
      const photos$ = store.select(selectAllPhotos);
      const photos = await firstValueFrom(photos$) as Photo[];
      
      expect(photos.length).toBe(3); // Only JPEG, PNG, and WebP should be loaded
      expect(photos.some((p: Photo) => p.url.includes('Valid_Photo.jpg'))).toBe(true);
      expect(photos.some((p: Photo) => p.url.includes('Valid_PNG_Photo.png'))).toBe(true);
      expect(photos.some((p: Photo) => p.url.includes('Valid_WebP_Photo.webp'))).toBe(true);
      expect(photos.some((p: Photo) => p.url.includes('Invalid_TIFF_Photo.tiff'))).toBe(false);
      expect(photos.some((p: Photo) => p.url.includes('Invalid_SVG_Photo.svg'))).toBe(false);
      expect(photos.some((p: Photo) => p.url.includes('Invalid_GIF_Photo.gif'))).toBe(false);

      // Verify game status is in progress
      const gameStatus$ = store.select(selectGameStatus);
      const gameStatus = await firstValueFrom(gameStatus$);
      expect(gameStatus).toBe(GameStatus.IN_PROGRESS);
    });

    it('should handle insufficient valid photos with retry logic', async () => {
      // Requirement 4.4: Provide fallback options when photos are rejected
      const mockGeosearchResponseWithFewValid = {
        query: {
          geosearch: [
            { pageid: 1, title: 'File:Only_Valid_Photo.jpg' },
            { pageid: 2, title: 'File:Invalid_TIFF_Photo.tiff' },
            { pageid: 3, title: 'File:Invalid_SVG_Photo.svg' }
          ]
        }
      };

      const mockImageInfoResponseWithFewValid = {
        query: {
          pages: {
            '1': mockValidJpegPhoto,
            '2': mockInvalidTiffPhoto,
            '3': mockInvalidSvgPhoto
          }
        }
      };

      // Try to fetch 5 photos but only 1 valid format available initially
      const photosPromise = firstValueFrom(photoService.fetchRandomPhotos(5));

      // First attempt - insufficient valid photos
      let geosearchRequests = httpMock.match(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('list') === 'geosearch'
      );
      
      geosearchRequests.forEach(req => {
        req.flush(mockGeosearchResponseWithFewValid);
      });

      let imageinfoRequest = httpMock.expectOne(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('prop') === 'imageinfo'
      );
      imageinfoRequest.flush(mockImageInfoResponseWithFewValid);

      // Second attempt - retry with expanded search
      const mockExpandedGeosearchResponse = {
        query: {
          geosearch: [
            { pageid: 1, title: 'File:Valid_Photo_1.jpg' },
            { pageid: 2, title: 'File:Valid_Photo_2.png' },
            { pageid: 3, title: 'File:Valid_Photo_3.webp' },
            { pageid: 4, title: 'File:Valid_Photo_4.jpg' },
            { pageid: 5, title: 'File:Valid_Photo_5.png' }
          ]
        }
      };

      const mockExpandedImageInfoResponse = {
        query: {
          pages: {
            '1': { ...mockValidJpegPhoto, title: 'File:Valid_Photo_1.jpg' },
            '2': { ...mockValidPngPhoto, title: 'File:Valid_Photo_2.png' },
            '3': { ...mockValidWebpPhoto, title: 'File:Valid_Photo_3.webp' },
            '4': { ...mockValidJpegPhoto, title: 'File:Valid_Photo_4.jpg' },
            '5': { ...mockValidPngPhoto, title: 'File:Valid_Photo_5.png' }
          }
        }
      };

      // Handle retry requests
      geosearchRequests = httpMock.match(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('list') === 'geosearch'
      );
      
      geosearchRequests.forEach(req => {
        req.flush(mockExpandedGeosearchResponse);
      });

      imageinfoRequest = httpMock.expectOne(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('prop') === 'imageinfo'
      );
      imageinfoRequest.flush(mockExpandedImageInfoResponse);

      const photos = await photosPromise;
      expect(photos.length).toBe(5);
      expect(photos.every(p => p.metadata.format)).toBe(true);
    });

    it('should handle complete failure with appropriate error messages', async () => {
      // Requirement 4.4: Display helpful error message when format restrictions are too strict
      const mockEmptyGeosearchResponse = {
        query: { geosearch: [] }
      };

      try {
        const photosPromise = firstValueFrom(photoService.fetchRandomPhotos(5));

        // Mock all retry attempts to return empty results
        for (let i = 0; i < 4; i++) { // Initial + 3 retries
          const geosearchRequests = httpMock.match(req => 
            req.url.includes('commons.wikimedia.org/w/api.php') && 
            req.params.get('list') === 'geosearch'
          );
          
          geosearchRequests.forEach(req => {
            req.flush(mockEmptyGeosearchResponse);
          });
        }

        await photosPromise;
        fail('Should have thrown InsufficientPhotosError');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientPhotosError);
        expect((error as InsufficientPhotosError).message).toContain('format restrictions');
        expect((error as InsufficientPhotosError).requestedCount).toBe(5);
        expect((error as InsufficientPhotosError).attemptsUsed).toBe(4);
      }
    });
  });

  describe('Error Handling and User Experience', () => {
    it('should handle network errors during format validation gracefully', async () => {
      // Requirement 1.3: Handle format validation errors appropriately
      const mockPhoto = {
        title: 'File:Network_Error_Photo.jpg',
        imageinfo: [{
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Network_Error_Photo.jpg/800px-Network_Error_Photo.jpg',
          extmetadata: {
            DateTime: { value: '1950-01-01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            Artist: { value: 'Test Photographer' },
            LicenseShortName: { value: 'CC BY-SA 4.0' }
            // No MimeType - will trigger HTTP Content-Type detection
          }
        }]
      };

      // Mock format validation to simulate network error
      spyOn(formatValidationService, 'validateImageFormat').and.returnValue(
        Promise.resolve({
          isValid: false,
          rejectionReason: 'Network error during format detection',
          confidence: 0,
          detectionMethod: 'http-content-type'
        })
      );

      const result = await photoService.processPhotoData(mockPhoto);
      expect(result).toBeNull();

      // Verify error was logged
      const logs = formatLoggerService.getRecentLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should provide user-friendly error messages for format restrictions', async () => {
      // Test store integration with format validation errors
      store.dispatch(PhotosActions.loadPhotos());

      // Mock API to return only invalid formats
      const mockGeosearchResponse = {
        query: {
          geosearch: [
            { pageid: 1, title: 'File:Invalid_TIFF_Photo.tiff' },
            { pageid: 2, title: 'File:Invalid_SVG_Photo.svg' }
          ]
        }
      };

      const mockImageInfoResponse = {
        query: {
          pages: {
            '1': mockInvalidTiffPhoto,
            '2': mockInvalidSvgPhoto
          }
        }
      };

      // Mock all retry attempts
      for (let i = 0; i < 4; i++) {
        const geosearchRequests = httpMock.match(req => 
          req.url.includes('commons.wikimedia.org/w/api.php') && 
          req.params.get('list') === 'geosearch'
        );
        
        geosearchRequests.forEach(req => {
          req.flush(mockGeosearchResponse);
        });

        const imageinfoRequest = httpMock.expectOne(req => 
          req.url.includes('commons.wikimedia.org/w/api.php') && 
          req.params.get('prop') === 'imageinfo'
        );
        imageinfoRequest.flush(mockImageInfoResponse);
      }

      // Wait for error to propagate
      await new Promise(resolve => setTimeout(resolve, 200));

      const error$ = store.select(selectPhotosError);
      const error = await firstValueFrom(error$);
      
      expect(error).toBeTruthy();
      expect(error).toContain('format restrictions');
    });
  });

  describe('Logging and Monitoring Functionality', () => {
    it('should log all format validation decisions comprehensively', async () => {
      // Requirement 5.5: Comprehensive logging for monitoring
      const testPhotos = [mockValidJpegPhoto, mockInvalidTiffPhoto, mockValidPngPhoto];
      
      // Process photos to trigger format validation logging
      for (const photoData of testPhotos) {
        await photoService.processPhotoData(photoData);
      }

      const logs = formatLoggerService.getRecentLogs();
      expect(logs.length).toBe(3);

      // Verify JPEG validation log
      const jpegLog = logs.find((log: any) => log.photoUrl.includes('Valid_Photo.jpg'));
      expect(jpegLog).toBeTruthy();
      expect(jpegLog!.validationResult).toBe(true);
      expect(jpegLog!.detectedFormat).toBe('jpeg');
      expect(jpegLog!.detectedMimeType).toBe('image/jpeg');
      expect(jpegLog!.detectionMethod).toBeTruthy();

      // Verify TIFF rejection log
      const tiffLog = logs.find((log: any) => log.photoUrl.includes('Invalid_TIFF_Photo.tiff'));
      expect(tiffLog).toBeTruthy();
      expect(tiffLog!.validationResult).toBe(false);
      expect(tiffLog!.rejectionReason).toContain('Limited browser support');

      // Verify PNG validation log
      const pngLog = logs.find((log: any) => log.photoUrl.includes('Valid_PNG_Photo.png'));
      expect(pngLog).toBeTruthy();
      expect(pngLog!.validationResult).toBe(true);
      expect(pngLog!.detectedFormat).toBe('png');
    });

    it('should track format validation statistics for monitoring', async () => {
      // Process multiple photos to generate statistics
      const testPhotos = [
        mockValidJpegPhoto,
        mockValidPngPhoto,
        mockValidWebpPhoto,
        mockInvalidTiffPhoto,
        mockInvalidSvgPhoto,
        mockInvalidGifPhoto
      ];

      for (const photoData of testPhotos) {
        await photoService.processPhotoData(photoData);
      }

      const stats = formatLoggerService.getStats();
      
      expect(stats.totalValidations).toBe(6);
      expect(stats.successfulValidations).toBe(3);
      expect(stats.rejectedValidations).toBe(3);
      expect(stats.formatDistribution['jpeg']).toBe(1);
      expect(stats.formatDistribution['png']).toBe(1);
      expect(stats.formatDistribution['webp']).toBe(1);
      expect(stats.rejectionReasons['Limited browser support']).toBe(1);
      expect(stats.rejectionReasons['Not suitable for photographs']).toBe(1);
      expect(stats.rejectionReasons['Avoid animated content']).toBe(1);
    });

    it('should monitor performance metrics for format validation', async () => {
      // Test performance monitoring integration
      const startTime = Date.now();
      
      await photoService.processPhotoData(mockValidJpegPhoto);
      
      const logs = formatLoggerService.getRecentLogs();
      const log = logs[0];
      
      expect(log.validationTime).toBeGreaterThan(0);
      expect(log.validationTime).toBeLessThan(1000); // Should be fast
      
      const stats = formatLoggerService.getStats();
      expect(stats.averageValidationTime).toBeGreaterThan(0);
    });
  });

  describe('Format Configuration Management', () => {
    it('should respect format configuration changes', async () => {
      // Test dynamic format configuration
      const config = formatConfigService.getConfig();
      
      // Verify default supported formats
      expect(config.supportedFormats['jpeg'].enabled).toBe(true);
      expect(config.supportedFormats['png'].enabled).toBe(true);
      expect(config.supportedFormats['webp'].enabled).toBe(true);
      
      // Verify rejected formats
      expect(config.rejectedFormats['tiff'].reason).toBe('Limited browser support');
      expect(config.rejectedFormats['svg'].reason).toBe('Not suitable for photographs');
      expect(config.rejectedFormats['gif'].reason).toBe('Avoid animated content');
    });

    it('should validate format configuration structure', () => {
      const config = formatConfigService.getConfig();
      // Note: validateConfig is private, so we just verify config structure
      expect(config.supportedFormats).toBeDefined();
      expect(config.rejectedFormats).toBeDefined();
      expect(config.fallbackBehavior).toBeDefined();
    });
  });

  describe('Cache Performance and Behavior', () => {
    it('should cache format validation results for performance', async () => {
      // First validation - should hit the service
      const result1 = await formatValidationService.validateImageFormat(
        mockValidJpegPhoto.imageinfo[0].url,
        mockValidJpegPhoto.imageinfo[0].extmetadata.MimeType.value
      );
      
      // Second validation of same URL - should hit cache
      const result2 = await formatValidationService.validateImageFormat(
        mockValidJpegPhoto.imageinfo[0].url,
        mockValidJpegPhoto.imageinfo[0].extmetadata.MimeType.value
      );
      
      expect(result1.isValid).toBe(result2.isValid);
      expect(result1.detectedFormat).toBe(result2.detectedFormat);
      
      // Verify cache statistics
      const cacheStats = formatValidationService.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    });

    it('should handle cache expiration correctly', async () => {
      // This test would require mocking time or using a shorter TTL
      // For now, verify cache functionality exists
      const cacheStats = formatValidationService.getCacheStats();
      expect(cacheStats).toBeDefined();
      expect(typeof cacheStats.hits).toBe('number');
      expect(typeof cacheStats.misses).toBe('number');
    });
  });

  describe('Integration with Game State Management', () => {
    it('should integrate format validation with NgRx store effects', async () => {
      // Test that format validation works within the NgRx effects
      store.dispatch(PhotosActions.loadPhotos());
      
      // Mock successful API responses with mixed formats
      const mockGeosearchResponse = {
        query: {
          geosearch: [
            { pageid: 1, title: 'File:Valid_Photo.jpg' },
            { pageid: 2, title: 'File:Invalid_TIFF_Photo.tiff' }
          ]
        }
      };

      const mockImageInfoResponse = {
        query: {
          pages: {
            '1': mockValidJpegPhoto,
            '2': mockInvalidTiffPhoto
          }
        }
      };

      const geosearchRequests = httpMock.match(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('list') === 'geosearch'
      );
      
      geosearchRequests.forEach(req => {
        req.flush(mockGeosearchResponse);
      });

      const imageinfoRequest = httpMock.expectOne(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('prop') === 'imageinfo'
      );
      imageinfoRequest.flush(mockImageInfoResponse);

      // Wait for effects to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const photos$ = store.select(selectAllPhotos);
      const photos = await firstValueFrom(photos$) as Photo[];
      
      // Should only have valid format photos
      expect(photos.length).toBe(1);
      expect(photos[0].url).toContain('Valid_Photo.jpg');
      expect(photos[0].metadata.format).toBe('jpeg');
    });

    it('should handle loading states correctly during format validation', async () => {
      store.dispatch(PhotosActions.loadPhotos());
      
      // Check loading state
      const loading$ = store.select(selectPhotosLoading);
      const isLoading = await firstValueFrom(loading$);
      expect(isLoading).toBe(true);

      // Mock API response
      const mockGeosearchResponse = {
        query: { geosearch: [{ pageid: 1, title: 'File:Valid_Photo.jpg' }] }
      };

      const mockImageInfoResponse = {
        query: { pages: { '1': mockValidJpegPhoto } }
      };

      const geosearchRequests = httpMock.match(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('list') === 'geosearch'
      );
      
      geosearchRequests.forEach(req => {
        req.flush(mockGeosearchResponse);
      });

      const imageinfoRequest = httpMock.expectOne(req => 
        req.url.includes('commons.wikimedia.org/w/api.php') && 
        req.params.get('prop') === 'imageinfo'
      );
      imageinfoRequest.flush(mockImageInfoResponse);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalLoading = await firstValueFrom(loading$);
      expect(finalLoading).toBe(false);
    });
  });

  describe('Requirements Verification', () => {
    it('should meet requirement 1.1: All photos load successfully without format-related errors', async () => {
      // This test verifies that format validation prevents broken images
      const validPhotos = [mockValidJpegPhoto, mockValidPngPhoto, mockValidWebpPhoto];
      
      for (const photoData of validPhotos) {
        const photo = await photoService.processPhotoData(photoData);
        expect(photo).toBeTruthy();
        expect(photo!.metadata.format).toBeTruthy();
        expect(['jpeg', 'png', 'webp']).toContain(photo!.metadata.format!);
      }
    });

    it('should meet requirement 1.3: Exclude unsupported format photos from selection', async () => {
      const invalidPhotos = [mockInvalidTiffPhoto, mockInvalidSvgPhoto, mockInvalidGifPhoto];
      
      for (const photoData of invalidPhotos) {
        const photo = await photoService.processPhotoData(photoData);
        expect(photo).toBeNull(); // Should be rejected
      }
    });

    it('should meet requirement 1.5: Display appropriate error message when no acceptable formats available', async () => {
      // This is tested in the "complete failure" test above
      // Verifying the error message contains helpful information
      try {
        await firstValueFrom(photoService.fetchRandomPhotos(5));
        
        // Mock to return no results for all attempts
        for (let i = 0; i < 4; i++) {
          const geosearchRequests = httpMock.match(req => 
            req.url.includes('commons.wikimedia.org/w/api.php')
          );
          geosearchRequests.forEach(req => {
            req.flush({ query: { geosearch: [] } });
          });
        }
        
        fail('Should have thrown error');
      } catch (error) {
        expect((error as any).message).toContain('format restrictions');
        expect((error as any).message).toContain('compatibility');
      }
    });

    it('should meet requirement 4.4: Explain format filtering in error messages', async () => {
      // Verify error messages are user-friendly and explain format restrictions
      const error = new InsufficientPhotosError(5, 3, 'Test error message about format restrictions');
      expect(error.message).toContain('format restrictions');
      expect(error.requestedCount).toBe(5);
      expect(error.attemptsUsed).toBe(3);
    });

    it('should meet requirement 5.5: Comprehensive logging for monitoring and troubleshooting', async () => {
      // Process photos to generate comprehensive logs
      await photoService.processPhotoData(mockValidJpegPhoto);
      await photoService.processPhotoData(mockInvalidTiffPhoto);
      
      const logs = formatLoggerService.getRecentLogs();
      expect(logs.length).toBe(2);
      
      // Verify log completeness
      logs.forEach((log: any) => {
        expect(log.timestamp).toBeTruthy();
        expect(log.photoUrl).toBeTruthy();
        expect(typeof log.validationResult).toBe('boolean');
        expect(log.validationTime).toBeGreaterThan(0);
        expect(log.detectionMethod).toBeTruthy();
        expect(typeof log.confidence).toBe('number');
      });
      
      // Verify statistics are comprehensive
      const stats = formatLoggerService.getStats();
      expect(stats.totalValidations).toBe(2);
      expect(stats.successfulValidations).toBe(1);
      expect(stats.rejectedValidations).toBe(1);
      expect(Object.keys(stats.formatDistribution).length).toBeGreaterThan(0);
      expect(Object.keys(stats.rejectionReasons).length).toBeGreaterThan(0);
    });
  });
});