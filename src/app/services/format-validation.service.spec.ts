import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { FormatValidationService } from './format-validation.service';
import { FormatValidationLoggerService } from './format-validation-logger.service';

describe('FormatValidationService - Basic Tests', () => {
  let service: FormatValidationService;
  let httpMock: HttpTestingController;
  let loggerService: FormatValidationLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormatValidationService, FormatValidationLoggerService]
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
      providers: [FormatValidationService, FormatValidationLoggerService]
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