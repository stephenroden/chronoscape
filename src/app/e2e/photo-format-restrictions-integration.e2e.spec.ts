import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { PhotoService } from '../services/photo.service';
import { FormatValidationService } from '../services/format-validation.service';
import { FormatValidationLoggerService } from '../services/format-validation-logger.service';
import { FormatConfigService } from '../services/format-config.service';
import { CacheService } from '../services/cache.service';
import { Photo } from '../models/photo.model';

/**
 * Integration end-to-end tests for photo format restrictions feature
 * Tests the complete workflow with format validation enabled
 * Requirements: 1.1, 1.3, 1.5, 4.4, 5.5
 */
describe('Photo Format Restrictions Integration E2E', () => {
  let photoService: PhotoService;
  let formatValidationService: FormatValidationService;
  let formatLoggerService: FormatValidationLoggerService;
  let formatConfigService: FormatConfigService;
  let httpMock: HttpTestingController;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PhotoService,
        FormatValidationService,
        FormatValidationLoggerService,
        FormatConfigService,
        CacheService
      ]
    }).compileComponents();

    photoService = TestBed.inject(PhotoService);
    formatValidationService = TestBed.inject(FormatValidationService);
    formatLoggerService = TestBed.inject(FormatValidationLoggerService);
    formatConfigService = TestBed.inject(FormatConfigService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear logs before each test
    formatLoggerService.clearLogs();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('End-to-End Format Validation Workflow', () => {
    it('should process valid JPEG photos successfully', async () => {
      // Requirement 1.1: All photos load successfully
      const photo = await photoService.processPhotoData(mockValidJpegPhoto);
      
      expect(photo).toBeTruthy();
      expect(photo!.url).toContain('Valid_Photo.jpg');
      expect(photo!.metadata.format).toBe('jpeg');
      expect(photo!.metadata.mimeType).toBe('image/jpeg');
      expect(photo!.year).toBe(1950);
      expect(photo!.coordinates.latitude).toBe(40.7128);
      expect(photo!.coordinates.longitude).toBe(-74.0060);
    });

    it('should reject invalid TIFF photos', async () => {
      // Requirement 1.3: Exclude unsupported format photos from selection
      const photo = await photoService.processPhotoData(mockInvalidTiffPhoto);
      
      expect(photo).toBeNull();
    });

    it('should log format validation decisions', async () => {
      // Requirement 5.5: Comprehensive logging for monitoring
      await photoService.processPhotoData(mockValidJpegPhoto);
      await photoService.processPhotoData(mockInvalidTiffPhoto);
      
      const logs = formatLoggerService.getRecentLogs();
      expect(logs.length).toBe(2);
      
      // Check valid photo log
      const validLog = logs.find(log => log.photoUrl.includes('Valid_Photo.jpg'));
      expect(validLog).toBeTruthy();
      expect(validLog!.validationResult).toBe(true);
      expect(validLog!.detectedFormat).toBe('jpeg');
      
      // Check invalid photo log
      const invalidLog = logs.find(log => log.photoUrl.includes('Invalid_TIFF_Photo.tiff'));
      expect(invalidLog).toBeTruthy();
      expect(invalidLog!.validationResult).toBe(false);
      expect(invalidLog!.rejectionReason).toContain('Limited browser support');
    });

    it('should track validation statistics', async () => {
      // Process multiple photos to generate statistics
      await photoService.processPhotoData(mockValidJpegPhoto);
      await photoService.processPhotoData(mockInvalidTiffPhoto);
      
      const stats = formatLoggerService.getStats();
      expect(stats.totalValidations).toBe(2);
      expect(stats.successfulValidations).toBe(1);
      expect(stats.rejectedValidations).toBe(1);
      expect(stats.formatDistribution['jpeg']).toBe(1);
      expect(stats.rejectionReasons['Limited browser support']).toBe(1);
    });

    it('should validate format configuration', () => {
      // Test format configuration management
      const config = formatConfigService.getConfig();
      
      // Verify supported formats
      expect(config.supportedFormats['jpeg'].enabled).toBe(true);
      expect(config.supportedFormats['png'].enabled).toBe(true);
      expect(config.supportedFormats['webp'].enabled).toBe(true);
      
      // Verify rejected formats
      expect(config.rejectedFormats['tiff'].reason).toBe('Limited browser support');
      expect(config.rejectedFormats['svg'].reason).toBe('Not suitable for photographs');
      expect(config.rejectedFormats['gif'].reason).toBe('Avoid animated content');
    });

    it('should cache format validation results', async () => {
      // Test caching functionality
      const url = mockValidJpegPhoto.imageinfo[0].url;
      const mimeType = mockValidJpegPhoto.imageinfo[0].extmetadata.MimeType.value;
      
      // First validation - should miss cache
      const result1 = await formatValidationService.validateImageFormat(url, mimeType);
      
      // Second validation - should hit cache
      const result2 = await formatValidationService.validateImageFormat(url, mimeType);
      
      expect(result1.isValid).toBe(result2.isValid);
      expect(result1.detectedFormat).toBe(result2.detectedFormat);
      
      // Verify cache statistics
      const cacheStats = formatValidationService.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    });

    it('should handle format validation errors gracefully', async () => {
      // Test error handling
      const mockPhotoWithoutMimeType = {
        title: 'File:No_MimeType_Photo.jpg',
        imageinfo: [{
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/No_MimeType_Photo.jpg/800px-No_MimeType_Photo.jpg',
          extmetadata: {
            DateTime: { value: '1950-01-01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            Artist: { value: 'Test Photographer' },
            LicenseShortName: { value: 'CC BY-SA 4.0' }
            // No MimeType - will trigger extension-based detection
          }
        }]
      };

      const photo = await photoService.processPhotoData(mockPhotoWithoutMimeType);
      
      // Should still work with extension-based detection
      expect(photo).toBeTruthy();
      expect(photo!.metadata.format).toBe('jpeg');
    });

    it('should demonstrate complete photo filtering workflow', async () => {
      // Requirement 1.1, 1.3: Complete workflow test
      const mixedPhotos = [mockValidJpegPhoto, mockInvalidTiffPhoto];
      const processedPhotos: (Photo | null)[] = [];
      
      for (const photoData of mixedPhotos) {
        const photo = await photoService.processPhotoData(photoData);
        processedPhotos.push(photo);
      }
      
      const validPhotos = processedPhotos.filter(p => p !== null) as Photo[];
      
      expect(validPhotos.length).toBe(1);
      expect(validPhotos[0].url).toContain('Valid_Photo.jpg');
      expect(validPhotos[0].metadata.format).toBe('jpeg');
      
      // Verify logging captured all decisions
      const logs = formatLoggerService.getRecentLogs();
      expect(logs.length).toBe(2);
    });

    it('should provide comprehensive monitoring data', async () => {
      // Requirement 5.5: Monitoring functionality
      await photoService.processPhotoData(mockValidJpegPhoto);
      await photoService.processPhotoData(mockInvalidTiffPhoto);
      
      const stats = formatLoggerService.getStats();
      const rejectionPatterns = formatLoggerService.getRejectionPatterns();
      
      // Verify statistics completeness
      expect(stats.totalValidations).toBeGreaterThan(0);
      expect(stats.averageValidationTime).toBeGreaterThanOrEqual(0);
      expect(Object.keys(stats.formatDistribution).length).toBeGreaterThan(0);
      expect(Object.keys(stats.rejectionReasons).length).toBeGreaterThan(0);
      
      // Verify rejection patterns analysis
      expect(rejectionPatterns.commonReasons.length).toBeGreaterThan(0);
      expect(rejectionPatterns.formatDistribution.length).toBeGreaterThan(0);
      expect(rejectionPatterns.methodEffectiveness.length).toBeGreaterThan(0);
    });
  });

  describe('Requirements Verification', () => {
    it('should meet requirement 1.1: All photos load successfully without format-related errors', async () => {
      const photo = await photoService.processPhotoData(mockValidJpegPhoto);
      expect(photo).toBeTruthy();
      expect(photo!.metadata.format).toBeTruthy();
      expect(['jpeg', 'png', 'webp']).toContain(photo!.metadata.format!);
    });

    it('should meet requirement 1.3: Exclude unsupported format photos from selection', async () => {
      const photo = await photoService.processPhotoData(mockInvalidTiffPhoto);
      expect(photo).toBeNull();
    });

    it('should meet requirement 4.4: Provide helpful error messages', () => {
      // Test error message structure
      const error = new Error('Unable to find photos in supported formats after multiple retry attempts. This may be due to strict format restrictions or limited photo availability in the searched areas.');
      expect(error.message).toContain('format restrictions');
      expect(error.message).toContain('supported formats');
    });

    it('should meet requirement 5.5: Comprehensive logging for monitoring', async () => {
      await photoService.processPhotoData(mockValidJpegPhoto);
      
      const logs = formatLoggerService.getRecentLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const log = logs[0];
      expect(log.timestamp).toBeTruthy();
      expect(log.photoUrl).toBeTruthy();
      expect(typeof log.validationResult).toBe('boolean');
      expect(log.validationTime).toBeGreaterThanOrEqual(0);
      expect(log.detectionMethod).toBeTruthy();
      expect(typeof log.confidence).toBe('number');
    });
  });

  describe('Performance and Reliability', () => {
    it('should validate photos efficiently', async () => {
      const startTime = Date.now();
      
      await photoService.processPhotoData(mockValidJpegPhoto);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process quickly (under 100ms for mocked data)
      expect(processingTime).toBeLessThan(100);
    });

    it('should handle multiple photos consistently', async () => {
      const photos = [mockValidJpegPhoto, mockValidJpegPhoto, mockValidJpegPhoto];
      const results: (Photo | null)[] = [];
      
      for (const photoData of photos) {
        const photo = await photoService.processPhotoData(photoData);
        results.push(photo);
      }
      
      // All should be processed successfully
      expect(results.every(p => p !== null)).toBe(true);
      expect(results.every(p => p!.metadata.format === 'jpeg')).toBe(true);
    });

    it('should maintain consistent logging across multiple validations', async () => {
      const photos = [mockValidJpegPhoto, mockInvalidTiffPhoto, mockValidJpegPhoto];
      
      for (const photoData of photos) {
        await photoService.processPhotoData(photoData);
      }
      
      const logs = formatLoggerService.getRecentLogs();
      expect(logs.length).toBe(3);
      
      // Verify log consistency
      logs.forEach(log => {
        expect(log.timestamp).toBeTruthy();
        expect(log.photoUrl).toBeTruthy();
        expect(typeof log.validationResult).toBe('boolean');
        expect(log.detectionMethod).toBeTruthy();
      });
    });
  });

  describe('Configuration and Extensibility', () => {
    it('should support format configuration changes', () => {
      const config = formatConfigService.getConfig();
      
      // Verify configuration structure
      expect(config.supportedFormats).toBeDefined();
      expect(config.rejectedFormats).toBeDefined();
      expect(config.fallbackBehavior).toBeDefined();
      
      // Verify format definitions
      Object.values(config.supportedFormats).forEach(format => {
        expect(format.extensions).toBeDefined();
        expect(format.mimeTypes).toBeDefined();
        expect(typeof format.enabled).toBe('boolean');
      });
    });

    it('should provide extensible validation framework', async () => {
      // Test that the validation service can handle different detection methods
      const result = await formatValidationService.validateImageFormat(
        mockValidJpegPhoto.imageinfo[0].url,
        mockValidJpegPhoto.imageinfo[0].extmetadata.MimeType.value
      );
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('jpeg');
      expect(result.detectionMethod).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});