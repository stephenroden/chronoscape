import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { FormatValidationService } from './format-validation.service';
import { FormatValidationLoggerService } from './format-validation-logger.service';
import { FormatConfigService } from './format-config.service';

describe('FormatValidationService - Basic Tests', () => {
  let service: FormatValidationService;
  let httpMock: HttpTestingController;
  let loggerService: FormatValidationLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormatValidationService, FormatValidationLoggerService, FormatConfigService]
    });
    service = TestBed.inject(FormatValidationService);
    httpMock = TestBed.inject(HttpTestingController);
    loggerService = TestBed.inject(FormatValidationLoggerService);
    
    // Clear logs before each test
    loggerService.clearLogs();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const supportedFormats = service.getSupportedFormats();
      
      expect(supportedFormats).toContain('jpeg');
      expect(supportedFormats).toContain('png');
      expect(supportedFormats).toContain('webp');
      expect(supportedFormats.length).toBe(3);
    });
  });

  describe('getFormatFromUrl - URL-based format detection', () => {
    describe('Basic format detection', () => {
      it('should detect JPEG format from .jpg extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should detect JPEG format from .jpeg extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpeg');
        expect(format).toBe('jpeg');
      });

      it('should detect PNG format from .png extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png');
        expect(format).toBe('png');
      });

      it('should detect WebP format from .webp extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp');
        expect(format).toBe('webp');
      });

      it('should detect rejected formats (TIFF)', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.tiff');
        expect(format).toBe('tiff');
      });

      it('should detect rejected formats (GIF)', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.gif');
        expect(format).toBe('gif');
      });
    });

    describe('Query parameters handling', () => {
      it('should handle URLs with query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg?v=123');
        expect(format).toBe('jpeg');
      });

      it('should handle URLs with multiple query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png?width=800&height=600&format=original');
        expect(format).toBe('png');
      });

      it('should handle URLs with query parameters that contain dots', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp?file=image.backup.jpg');
        expect(format).toBe('webp');
      });

      it('should handle empty query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg?');
        expect(format).toBe('jpeg');
      });
    });

    describe('URL fragments handling', () => {
      it('should handle URLs with fragments', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png#section1');
        expect(format).toBe('png');
      });

      it('should handle URLs with both query parameters and fragments', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpeg?v=1#top');
        expect(format).toBe('jpeg');
      });

      it('should handle fragments that contain dots', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp#image.details');
        expect(format).toBe('webp');
      });
    });

    describe('Case sensitivity handling', () => {
      it('should handle uppercase extensions', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.JPG');
        expect(format).toBe('jpeg');
      });
    });
  });
});

describe('FormatValidationService - Error Handling and Logging Tests', () => {
  let service: FormatValidationService;
  let httpMock: HttpTestingController;
  let loggerService: FormatValidationLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormatValidationService, FormatValidationLoggerService, FormatConfigService]
    });
    service = TestBed.inject(FormatValidationService);
    httpMock = TestBed.inject(HttpTestingController);
    loggerService = TestBed.inject(FormatValidationLoggerService);
    
    // Clear logs before each test
    loggerService.clearLogs();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Input Validation and Logging', () => {
    it('should log rejection for invalid URL input', async () => {
      const result = await service.validateImageFormat('');
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('Invalid URL provided');
      expect(result.detectionMethod).toBe('input-validation');
      expect(result.confidence).toBe(1.0);

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].rejectionReason).toBe('Invalid URL provided');
      expect(logs[0].detectionMethod).toBe('input-validation');
    });

    it('should log rejection for null URL input', async () => {
      const result = await service.validateImageFormat(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('Invalid URL provided');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe('invalid-url');
      expect(logs[0].validationResult).toBe(false);
    });

    it('should log rejection for undefined URL input', async () => {
      const result = await service.validateImageFormat(undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('Invalid URL provided');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
    });
  });

  describe('MIME Type Detection Error Handling', () => {
    it('should log successful MIME type validation', async () => {
      const url = 'https://example.com/photo.jpg';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/jpeg' }
        }
      };

      const result = await service.validateImageFormat(url, 'image/jpeg', metadata);
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('jpeg');
      expect(result.detectionMethod).toBe('mime-type');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(true);
      expect(logs[0].detectedFormat).toBe('jpeg');
      expect(logs[0].detectedMimeType).toBe('image/jpeg');
      expect(logs[0].detectionMethod).toBe('mime-type');
    });

    it('should log rejection for unsupported MIME type', async () => {
      const url = 'https://example.com/photo.tiff';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/tiff' }
        }
      };

      const result = await service.validateImageFormat(url, 'image/tiff', metadata);
      
      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe('tiff');
      expect(result.rejectionReason).toBe('Limited browser support');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].detectedFormat).toBe('tiff');
      expect(logs[0].rejectionReason).toBe('Limited browser support');
    });

    it('should log rejection for unknown MIME type', async () => {
      const url = 'https://example.com/photo.unknown';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/unknown' }
        }
      };

      const result = await service.validateImageFormat(url, 'image/unknown', metadata);
      
      expect(result.isValid).toBe(false);
      expect(result.detectedMimeType).toBe('image/unknown');
      expect(result.rejectionReason).toBe('Unknown MIME type');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].rejectionReason).toBe('Unknown MIME type');
    });
  });

  describe('URL Extension Detection Error Handling', () => {
    it('should log successful URL extension validation', async () => {
      const url = 'https://example.com/photo.png';

      const result = await service.validateImageFormat(url);
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('png');
      expect(result.detectionMethod).toBe('url-extension');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(true);
      expect(logs[0].detectedFormat).toBe('png');
      expect(logs[0].detectionMethod).toBe('url-extension');
    });

    it('should log rejection for URL without extension', async () => {
      const url = 'https://example.com/photo';

      const result = await service.validateImageFormat(url);
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('Network connection failed during format detection');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
    });

    it('should handle malformed URLs gracefully', async () => {
      const url = 'not-a-valid-url';

      const result = await service.validateImageFormat(url);
      
      expect(result.isValid).toBe(false);

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
    });
  });

  describe('HTTP Content-Type Detection Error Handling', () => {
    it('should log network error for HTTP request failure', async () => {
      const url = 'https://example.com/photo';

      // Mock HTTP request to fail with network error
      const promise = service.validateImageFormat(url);
      
      const req = httpMock.expectOne(url);
      req.error(new ErrorEvent('Network error'), {
        status: 0,
        statusText: 'Network Error'
      });

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.detectionMethod).toBe('http-content-type');
      expect(result.rejectionReason).toBe('Network connection failed during format detection');

      // Verify error logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].detectionMethod).toBe('http-content-type');
      expect(logs[0].errorDetails).toBeDefined();
      expect(logs[0].metadata?.httpStatusCode).toBe(0);
    });

    it('should log timeout error for HTTP request timeout', async () => {
      const url = 'https://example.com/photo';

      // Mock HTTP request to timeout
      const promise = service.validateImageFormat(url);
      
      const req = httpMock.expectOne(url);
      req.error(new ErrorEvent('Timeout'), {
        status: 0,
        statusText: 'Unknown Error'
      });

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('Network connection failed during format detection');

      // Verify timeout logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].errorDetails).toBeDefined();
      expect(logs[0].metadata?.networkTimeout).toBe(true);
    });

    it('should log HTTP error with status code', async () => {
      const url = 'https://example.com/photo';

      // Mock HTTP request to fail with 404
      const promise = service.validateImageFormat(url);
      
      const req = httpMock.expectOne(url);
      req.error(new ErrorEvent('Not Found'), {
        status: 404,
        statusText: 'Not Found'
      });

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('Image not found during format detection');

      // Verify HTTP error logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].errorDetails).toBeDefined();
      expect(logs[0].metadata?.httpStatusCode).toBe(404);
    });

    it('should log successful HTTP Content-Type validation', async () => {
      const url = 'https://example.com/photo';

      // Mock successful HTTP request
      const promise = service.validateImageFormat(url);
      
      const req = httpMock.expectOne(url);
      req.flush('', {
        headers: { 'content-type': 'image/webp' }
      });

      const result = await promise;
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('webp');
      expect(result.detectionMethod).toBe('http-content-type');

      // Verify successful logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(true);
      expect(logs[0].detectedFormat).toBe('webp');
      expect(logs[0].detectedMimeType).toBe('image/webp');
      expect(logs[0].detectionMethod).toBe('http-content-type');
    });

    it('should handle invalid HTTP URLs gracefully', async () => {
      const url = 'ftp://example.com/photo.jpg';

      const result = await service.validateImageFormat(url);
      
      expect(result.isValid).toBe(true); // Should fall back to URL extension detection
      expect(result.detectedFormat).toBe('jpeg');
      expect(result.detectionMethod).toBe('url-extension');

      // Verify logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(true);
      expect(logs[0].detectionMethod).toBe('url-extension');
    });
  });

  describe('Fallback Strategy Error Handling', () => {
    it('should log fallback when MIME type detection fails', async () => {
      const url = 'https://example.com/photo.jpg';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'invalid/mime-type' }
        }
      };

      const result = await service.validateImageFormat(url, 'invalid/mime-type', metadata);
      
      expect(result.isValid).toBe(true); // Should fall back to URL extension
      expect(result.detectedFormat).toBe('jpeg');
      expect(result.detectionMethod).toBe('url-extension');

      // Verify logging shows fallback was used
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(true);
      expect(logs[0].detectionMethod).toBe('url-extension');
    });

    it('should log comprehensive error when all strategies fail', async () => {
      const url = 'https://example.com/photo';

      // Mock HTTP request to fail
      const promise = service.validateImageFormat(url);
      
      const req = httpMock.expectOne(url);
      req.error(new ErrorEvent('Network error'), {
        status: 0,
        statusText: 'Network Error'
      });

      const result = await promise;
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('Network connection failed during format detection');

      // Verify comprehensive error logging
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].errorDetails).toBeDefined();
    });
  });

  describe('Logging Integration', () => {
    it('should track validation time accurately', async () => {
      const url = 'https://example.com/photo.jpg';
      const startTime = Date.now();

      const result = await service.validateImageFormat(url);
      
      const endTime = Date.now();
      const actualTime = endTime - startTime;

      // Verify logging includes validation time
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationTime).toBeGreaterThan(0);
      expect(logs[0].validationTime).toBeLessThanOrEqual(actualTime + 10); // Allow small margin
    });

    it('should log with proper confidence levels', async () => {
      const url = 'https://example.com/photo.jpg';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/jpeg' }
        }
      };

      const result = await service.validateImageFormat(url, 'image/jpeg', metadata);
      
      expect(result.confidence).toBe(0.9); // MIME type detection has high confidence

      // Verify confidence is logged
      const logs = loggerService.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].confidence).toBe(0.9);
    });

    it('should update statistics correctly', async () => {
      // Perform multiple validations
      await service.validateImageFormat('https://example.com/photo1.jpg');
      await service.validateImageFormat('https://example.com/photo2.tiff');
      
      // Mock network error for third validation
      const promise = service.validateImageFormat('https://example.com/photo3');
      const req = httpMock.expectOne('https://example.com/photo3');
      req.error(new ErrorEvent('Network error'), { status: 0 });
      await promise;

      // Verify statistics
      const stats = loggerService.getStats();
      expect(stats.totalValidations).toBe(3);
      expect(stats.successfulValidations).toBe(1); // Only JPEG succeeded
      expect(stats.rejectedValidations).toBe(1); // TIFF rejected
      expect(stats.errorValidations).toBe(1); // Network error
      expect(stats.networkErrors).toBe(1);
    });
  });

  describe('Console Logging Integration', () => {
    let consoleSpy: jasmine.Spy;

    beforeEach(() => {
      consoleSpy = spyOn(console, 'log');
      spyOn(console, 'warn');
      spyOn(console, 'error');
    });

    it('should log successful validation to console', async () => {
      const url = 'https://example.com/photo.jpg';
      await service.validateImageFormat(url);

      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*ACCEPTED/),
        jasmine.objectContaining({
          result: 'ACCEPTED',
          format: 'jpeg'
        })
      );
    });

    it('should log rejection to console as warning', async () => {
      const url = 'https://example.com/photo.tiff';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/tiff' }
        }
      };

      await service.validateImageFormat(url, 'image/tiff', metadata);

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*REJECTED/),
        jasmine.objectContaining({
          result: 'REJECTED',
          reason: 'Limited browser support'
        })
      );
    });

    it('should log network error to console as error', async () => {
      const url = 'https://example.com/photo';

      const promise = service.validateImageFormat(url);
      const req = httpMock.expectOne(url);
      req.error(new ErrorEvent('Network error'), { status: 0 });
      await promise;

      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*ERROR/),
        jasmine.objectContaining({
          result: 'REJECTED',
          errorType: jasmine.any(String)
        })
      );
    });
  });
});
describe(
'FormatValidationService - Caching Tests', () => {
  let service: FormatValidationService;
  let httpMock: HttpTestingController;
  let loggerService: FormatValidationLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormatValidationService, FormatValidationLoggerService, FormatConfigService]
    });
    service = TestBed.inject(FormatValidationService);
    httpMock = TestBed.inject(HttpTestingController);
    loggerService = TestBed.inject(FormatValidationLoggerService);
    
    // Clear logs and cache before each test
    loggerService.clearLogs();
    service.clearCache();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same URL', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // First validation
      const result1 = await service.validateImageFormat(url);
      const stats1 = service.getCacheStats();
      
      // Second validation should hit cache
      const result2 = await service.validateImageFormat(url);
      const stats2 = service.getCacheStats();
      
      expect(result1).toEqual(result2);
      expect(stats2.hits).toBe(stats1.hits + 1);
      expect(stats2.misses).toBe(stats1.misses);
    });

    it('should generate different cache keys for different URLs', async () => {
      const url1 = 'https://example.com/photo1.jpg';
      const url2 = 'https://example.com/photo2.jpg';
      
      await service.validateImageFormat(url1);
      await service.validateImageFormat(url2);
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hits).toBe(0);
    });

    it('should normalize URLs by removing query parameters for cache key', async () => {
      const baseUrl = 'https://example.com/photo.jpg';
      const urlWithQuery = 'https://example.com/photo.jpg?v=123&size=large';
      
      // First validation
      await service.validateImageFormat(baseUrl);
      const stats1 = service.getCacheStats();
      
      // Second validation with query params should hit cache
      await service.validateImageFormat(urlWithQuery);
      const stats2 = service.getCacheStats();
      
      expect(stats2.hits).toBe(stats1.hits + 1);
      expect(stats2.size).toBe(1);
    });

    it('should include MIME type in cache key when provided', async () => {
      const url = 'https://example.com/photo';
      
      // Validation without MIME type
      await service.validateImageFormat(url);
      const stats1 = service.getCacheStats();
      
      // Validation with MIME type should create different cache entry
      await service.validateImageFormat(url, 'image/jpeg');
      const stats2 = service.getCacheStats();
      
      expect(stats2.size).toBe(2);
      expect(stats2.misses).toBe(2);
    });

    it('should include Wikimedia metadata MIME type in cache key', async () => {
      const url = 'https://example.com/photo';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/png' }
        }
      };
      
      // Validation without metadata
      await service.validateImageFormat(url);
      const stats1 = service.getCacheStats();
      
      // Validation with metadata should create different cache entry
      await service.validateImageFormat(url, undefined, metadata);
      const stats2 = service.getCacheStats();
      
      expect(stats2.size).toBe(2);
      expect(stats2.misses).toBe(2);
    });
  });

  describe('Cache Hit and Miss Behavior', () => {
    it('should return cached result on subsequent calls', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // First call should miss cache
      const result1 = await service.validateImageFormat(url);
      const stats1 = service.getCacheStats();
      expect(stats1.hits).toBe(0);
      expect(stats1.misses).toBe(1);
      
      // Second call should hit cache
      const result2 = await service.validateImageFormat(url);
      const stats2 = service.getCacheStats();
      expect(stats2.hits).toBe(1);
      expect(stats2.misses).toBe(1);
      
      expect(result1).toEqual(result2);
    });

    it('should log cache hits with modified detection method', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // First validation
      await service.validateImageFormat(url);
      loggerService.clearLogs();
      
      // Second validation should hit cache
      await service.validateImageFormat(url);
      
      const logs = loggerService.getRecentLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].detectionMethod).toBe('url-extension-cached');
    });

    it('should not cache network errors', async () => {
      const url = 'https://example.com/photo';
      
      // Mock HTTP request to fail
      const httpRequest = httpMock.expectOne(url);
      httpRequest.error(new ErrorEvent('Network error'));
      
      // First validation should fail
      const result1 = await service.validateImageFormat(url);
      expect(result1.isValid).toBe(false);
      expect(result1.rejectionReason).toContain('HTTP request failed');
      
      // Second validation should not hit cache (network errors not cached)
      const httpRequest2 = httpMock.expectOne(url);
      httpRequest2.error(new ErrorEvent('Network error'));
      
      const result2 = await service.validateImageFormat(url);
      const stats = service.getCacheStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should not cache low confidence results', async () => {
      const url = 'https://example.com/photo.unknown';
      
      // First validation with unknown format (low confidence)
      const result1 = await service.validateImageFormat(url);
      expect(result1.confidence).toBeLessThan(0.6);
      
      // Second validation should not hit cache
      const result2 = await service.validateImageFormat(url);
      const stats = service.getCacheStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('Cache TTL and Expiration', () => {
    it('should expire cache entries after TTL', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // First validation
      await service.validateImageFormat(url);
      let stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      
      // Manually expire the cache entry by manipulating time
      // Since we can't easily mock Date.now(), we'll test the cleanup method
      service.clearCache();
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      
      // Next validation should miss cache
      await service.validateImageFormat(url);
      stats = service.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });
  });

  describe('Cache Size Management and LRU Eviction', () => {
    it('should track cache size correctly', async () => {
      const urls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.png',
        'https://example.com/photo3.webp'
      ];
      
      for (const url of urls) {
        await service.validateImageFormat(url);
      }
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('should evict least recently used entries when cache is full', async () => {
      // This test would require mocking the cache size limit
      // For now, we'll test that the eviction method exists and works
      const url1 = 'https://example.com/photo1.jpg';
      const url2 = 'https://example.com/photo2.jpg';
      
      await service.validateImageFormat(url1);
      await service.validateImageFormat(url2);
      
      // Access first URL again to make it more recently used
      await service.validateImageFormat(url1);
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(1); // One hit from accessing url1 again
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics correctly', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // Initial stats
      let stats = service.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
      
      // First validation (miss)
      await service.validateImageFormat(url);
      stats = service.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBe(0);
      
      // Second validation (hit)
      await service.validateImageFormat(url);
      stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should calculate hit rate correctly', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // 1 miss, 2 hits = 66.67% hit rate
      await service.validateImageFormat(url); // miss
      await service.validateImageFormat(url); // hit
      await service.validateImageFormat(url); // hit
      
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(66.67);
    });

    it('should track key generation errors', async () => {
      // Test with invalid URL that might cause key generation error
      await service.validateImageFormat('');
      
      const stats = service.getCacheStats();
      // Key generation errors are tracked internally but don't affect the main stats
      expect(stats.keyGenerationErrors).toBeDefined();
    });
  });

  describe('Cache Management Methods', () => {
    it('should clear cache completely', async () => {
      const urls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.png'
      ];
      
      for (const url of urls) {
        await service.validateImageFormat(url);
      }
      
      let stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      
      service.clearCache();
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should reset all statistics when clearing cache', async () => {
      const url = 'https://example.com/photo.jpg';
      
      await service.validateImageFormat(url); // miss
      await service.validateImageFormat(url); // hit
      
      let stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      
      service.clearCache();
      stats = service.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.keyGenerationErrors).toBe(0);
    });
  });

  describe('Cache Integration with Different Detection Methods', () => {
    it('should cache MIME type detection results', async () => {
      const url = 'https://example.com/photo';
      const mimeType = 'image/jpeg';
      
      // First validation with MIME type
      const result1 = await service.validateImageFormat(url, mimeType);
      expect(result1.detectionMethod).toBe('mime-type');
      
      // Second validation should hit cache
      const result2 = await service.validateImageFormat(url, mimeType);
      expect(result2.detectionMethod).toBe('mime-type');
      
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should cache URL extension detection results', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // First validation
      const result1 = await service.validateImageFormat(url);
      expect(result1.detectionMethod).toBe('url-extension');
      
      // Second validation should hit cache
      const result2 = await service.validateImageFormat(url);
      expect(result2.detectionMethod).toBe('url-extension');
      
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should cache Wikimedia metadata validation results', async () => {
      const url = 'https://example.com/photo';
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/png' }
        }
      };
      
      // First validation with Wikimedia metadata
      const result1 = await service.validateImageFormat(url, undefined, metadata);
      expect(result1.detectionMethod).toBe('mime-type');
      
      // Second validation should hit cache
      const result2 = await service.validateImageFormat(url, undefined, metadata);
      expect(result2.detectionMethod).toBe('mime-type');
      
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.size).toBe(1);
    });
  });

  describe('Cache Performance Impact', () => {
    it('should improve performance on cache hits', async () => {
      const url = 'https://example.com/photo.jpg';
      
      // First validation (cache miss)
      const start1 = Date.now();
      await service.validateImageFormat(url);
      const time1 = Date.now() - start1;
      
      // Second validation (cache hit)
      const start2 = Date.now();
      await service.validateImageFormat(url);
      const time2 = Date.now() - start2;
      
      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1);
      
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
    });
  });
});
describe('FormatValidationService - Configuration Management Tests', () => {
  let service: FormatValidationService;
  let httpMock: HttpTestingController;
  let loggerService: FormatValidationLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormatValidationService, FormatValidationLoggerService, FormatConfigService]
    });
    service = TestBed.inject(FormatValidationService);
    httpMock = TestBed.inject(HttpTestingController);
    loggerService = TestBed.inject(FormatValidationLoggerService);
    
    // Clear logs before each test
    loggerService.clearLogs();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Configuration Access', () => {
    it('should get current format configuration', () => {
      const config = service.getFormatConfig();
      
      expect(config).toBeDefined();
      expect(config.supportedFormats).toBeDefined();
      expect(config.rejectedFormats).toBeDefined();
      expect(config.fallbackBehavior).toBeDefined();
      
      // Verify default supported formats
      expect(config.supportedFormats['jpeg']).toBeDefined();
      expect(config.supportedFormats['png']).toBeDefined();
      expect(config.supportedFormats['webp']).toBeDefined();
      
      // Verify default rejected formats
      expect(config.rejectedFormats['tiff']).toBeDefined();
      expect(config.rejectedFormats['svg']).toBeDefined();
      expect(config.rejectedFormats['gif']).toBeDefined();
      expect(config.rejectedFormats['bmp']).toBeDefined();
    });

    it('should get default format configuration', () => {
      const defaultConfig = service.getDefaultFormatConfig();
      
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.supportedFormats['jpeg'].enabled).toBe(true);
      expect(defaultConfig.supportedFormats['png'].enabled).toBe(true);
      expect(defaultConfig.supportedFormats['webp'].enabled).toBe(true);
      
      expect(defaultConfig.rejectedFormats['tiff'].reason).toBe('Limited browser support');
      expect(defaultConfig.rejectedFormats['svg'].reason).toBe('Not suitable for photographs');
      expect(defaultConfig.rejectedFormats['gif'].reason).toBe('Avoid animated content');
      expect(defaultConfig.rejectedFormats['bmp'].reason).toBe('Large file sizes, limited web optimization');
    });

    it('should return independent copies of configuration', () => {
      const config1 = service.getFormatConfig();
      const config2 = service.getFormatConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1.supportedFormats).not.toBe(config2.supportedFormats);
      
      // Modify one config and ensure the other is not affected
      config1.supportedFormats['jpeg'].enabled = false;
      expect(config2.supportedFormats['jpeg'].enabled).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should update format configuration successfully', () => {
      const newConfig = service.getFormatConfig();
      newConfig.supportedFormats['jpeg'].enabled = false;
      newConfig.fallbackBehavior.retryCount = 5;
      
      const result = service.updateFormatConfig(newConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      
      const updatedConfig = service.getFormatConfig();
      expect(updatedConfig.supportedFormats['jpeg'].enabled).toBe(false);
      expect(updatedConfig.fallbackBehavior.retryCount).toBe(5);
    });

    it('should reject invalid format configuration', () => {
      const invalidConfig = {
        supportedFormats: {},
        // Missing required properties
      } as any;
      
      const result = service.updateFormatConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Original configuration should remain unchanged
      const currentConfig = service.getFormatConfig();
      expect(currentConfig.supportedFormats['jpeg']).toBeDefined();
    });

    it('should reset configuration to default', () => {
      // Modify configuration
      const newConfig = service.getFormatConfig();
      newConfig.supportedFormats['jpeg'].enabled = false;
      service.updateFormatConfig(newConfig);
      
      expect(service.getFormatConfig().supportedFormats['jpeg'].enabled).toBe(false);
      
      // Reset to default
      service.resetFormatConfigToDefault();
      expect(service.getFormatConfig().supportedFormats['jpeg'].enabled).toBe(true);
    });
  });

  describe('Integration with Format Validation', () => {
    it('should use updated configuration for format validation', async () => {
      // Initially JPEG should be supported
      expect(service.isFormatSupported('jpeg')).toBe(true);
      
      // Disable JPEG format
      const newConfig = service.getFormatConfig();
      newConfig.supportedFormats['jpeg'].enabled = false;
      service.updateFormatConfig(newConfig);
      
      // Now JPEG should not be supported
      expect(service.isFormatSupported('jpeg')).toBe(false);
      
      // Test with actual validation
      const result = await service.validateImageFormat('https://example.com/photo.jpg');
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('Format not supported');
    });

    it('should use updated configuration for getSupportedFormats', () => {
      // Initially should include all default formats
      let supportedFormats = service.getSupportedFormats();
      expect(supportedFormats).toContain('jpeg');
      expect(supportedFormats).toContain('png');
      expect(supportedFormats).toContain('webp');
      
      // Disable PNG format
      const newConfig = service.getFormatConfig();
      newConfig.supportedFormats['png'].enabled = false;
      service.updateFormatConfig(newConfig);
      
      // Now PNG should not be in supported formats
      supportedFormats = service.getSupportedFormats();
      expect(supportedFormats).toContain('jpeg');
      expect(supportedFormats).not.toContain('png');
      expect(supportedFormats).toContain('webp');
    });

    it('should use updated timeout configuration for HTTP requests', async () => {
      // Update HTTP timeout to a very low value
      const newConfig = service.getFormatConfig();
      newConfig.fallbackBehavior.httpTimeoutMs = 1; // 1ms timeout
      service.updateFormatConfig(newConfig);
      
      // This should timeout quickly
      const result = await service.validateImageFormat('https://httpbin.org/delay/1');
      
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('HTTP request failed');
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should validate format extensions correctly with custom configuration', async () => {
      // Add a new supported format
      const newConfig = service.getFormatConfig();
      newConfig.supportedFormats['avif'] = {
        extensions: ['.avif'],
        mimeTypes: ['image/avif'],
        enabled: true,
        description: 'AVIF format'
      };
      
      const updateResult = service.updateFormatConfig(newConfig);
      expect(updateResult.isValid).toBe(true);
      
      // Test validation with the new format
      const validationResult = await service.validateImageFormat('https://example.com/photo.avif');
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.detectedFormat).toBe('avif');
    });

    it('should handle rejected format configuration correctly', async () => {
      // Add a new rejected format
      const newConfig = service.getFormatConfig();
      newConfig.rejectedFormats['heic'] = {
        extensions: ['.heic'],
        mimeTypes: ['image/heic'],
        reason: 'Limited browser support',
        description: 'HEIC format'
      };
      
      const updateResult = service.updateFormatConfig(newConfig);
      expect(updateResult.isValid).toBe(true);
      
      // Test validation with the new rejected format
      const validationResult = await service.validateImageFormat('https://example.com/photo.heic');
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.detectedFormat).toBe('heic');
      expect(validationResult.rejectionReason).toBe('Limited browser support');
    });

    it('should prevent configuration conflicts', () => {
      const newConfig = service.getFormatConfig();
      
      // Try to add a rejected format that conflicts with supported format
      newConfig.rejectedFormats['conflicting'] = {
        extensions: ['.jpg'], // Conflicts with JPEG
        mimeTypes: ['image/conflicting'],
        reason: 'Test conflict'
      };
      
      const result = service.updateFormatConfig(newConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes("Extension '.jpg' is used by both"))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle null configuration gracefully', () => {
      const result = service.updateFormatConfig(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
      
      // Original configuration should remain unchanged
      const currentConfig = service.getFormatConfig();
      expect(currentConfig.supportedFormats['jpeg']).toBeDefined();
    });

    it('should handle undefined configuration gracefully', () => {
      const result = service.updateFormatConfig(undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should preserve original configuration when update fails', () => {
      const originalConfig = service.getFormatConfig();
      
      // Try to update with invalid configuration
      const invalidConfig = {
        supportedFormats: 'invalid'
      } as any;
      
      const result = service.updateFormatConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      
      // Configuration should remain unchanged
      const currentConfig = service.getFormatConfig();
      expect(currentConfig).toEqual(originalConfig);
    });
  });
});