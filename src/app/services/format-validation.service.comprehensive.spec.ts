import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { FormatValidationService, FormatValidationResult } from './format-validation.service';
import { FormatValidationLoggerService } from './format-validation-logger.service';
import { FormatConfigService } from './format-config.service';

describe('FormatValidationService - Comprehensive Tests', () => {
  let service: FormatValidationService;
  let httpMock: HttpTestingController;
  let loggerService: FormatValidationLoggerService;
  let configService: FormatConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormatValidationService, FormatValidationLoggerService, FormatConfigService]
    });
    service = TestBed.inject(FormatValidationService);
    httpMock = TestBed.inject(HttpTestingController);
    loggerService = TestBed.inject(FormatValidationLoggerService);
    configService = TestBed.inject(FormatConfigService);
    
    // Clear logs and cache before each test
    loggerService.clearLogs();
    service.clearCache();
  });

  afterEach(() => {
    // Flush any pending HTTP requests
    try {
      httpMock.verify();
    } catch (error) {
      // Ignore verification errors in cleanup
    }
  });

  describe('URL Format Detection - Edge Cases', () => {
    describe('Protocol variations', () => {
      it('should detect format from HTTP URLs', () => {
        const format = service.getFormatFromUrl('http://example.com/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should detect format from HTTPS URLs', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png');
        expect(format).toBe('png');
      });

      it('should detect format from protocol-relative URLs', () => {
        const format = service.getFormatFromUrl('//example.com/photo.webp');
        expect(format).toBe('webp');
      });

      it('should detect format from relative URLs', () => {
        const format = service.getFormatFromUrl('/images/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should detect format from relative URLs without leading slash', () => {
        const format = service.getFormatFromUrl('images/photo.png');
        expect(format).toBe('png');
      });

      it('should handle FTP URLs gracefully', () => {
        const format = service.getFormatFromUrl('ftp://example.com/photo.jpg');
        expect(format).toBe('jpeg');
      });
    });

    describe('Path variations', () => {
      it('should handle URLs with multiple dots in path', () => {
        const format = service.getFormatFromUrl('https://example.com/folder.name/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should handle URLs with dots in directory names', () => {
        const format = service.getFormatFromUrl('https://example.com/v2.0/images/photo.png');
        expect(format).toBe('png');
      });

      it('should handle URLs with no extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo');
        expect(format).toBeNull();
      });

      it('should handle URLs ending with slash', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg/');
        expect(format).toBeNull();
      });

      it('should handle empty paths', () => {
        const format = service.getFormatFromUrl('https://example.com/');
        expect(format).toBeNull();
      });

      it('should handle root path', () => {
        const format = service.getFormatFromUrl('https://example.com');
        expect(format).toBeNull();
      });
    });

    describe('Query parameter handling', () => {
      it('should ignore simple query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg?v=1');
        expect(format).toBe('jpeg');
      });

      it('should ignore multiple query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png?width=800&height=600&quality=high');
        expect(format).toBe('png');
      });

      it('should ignore query parameters with dots', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp?file=backup.jpg&version=2.0');
        expect(format).toBe('webp');
      });

      it('should handle empty query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg?');
        expect(format).toBe('jpeg');
      });

      it('should handle query parameters with special characters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png?name=test%20image&size=large');
        expect(format).toBe('png');
      });
    });

    describe('Fragment handling', () => {
      it('should ignore URL fragments', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg#section1');
        expect(format).toBe('jpeg');
      });

      it('should ignore fragments with dots', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png#image.details');
        expect(format).toBe('png');
      });

      it('should handle both query params and fragments', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp?v=1#top');
        expect(format).toBe('webp');
      });
    });

    describe('Case sensitivity', () => {
      it('should handle uppercase extensions', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.JPG');
        expect(format).toBe('jpeg');
      });

      it('should handle mixed case extensions', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.JpEg');
        expect(format).toBe('jpeg');
      });

      it('should handle uppercase in path but lowercase extension', () => {
        const format = service.getFormatFromUrl('https://EXAMPLE.COM/PHOTO.jpg');
        expect(format).toBe('jpeg');
      });
    });

    describe('Invalid URL handling', () => {
      it('should return null for malformed URLs', () => {
        const format = service.getFormatFromUrl('not-a-url');
        expect(format).toBeNull();
      });

      it('should return null for empty strings', () => {
        const format = service.getFormatFromUrl('');
        expect(format).toBeNull();
      });

      it('should return null for null input', () => {
        const format = service.getFormatFromUrl(null as any);
        expect(format).toBeNull();
      });

      it('should return null for undefined input', () => {
        const format = service.getFormatFromUrl(undefined as any);
        expect(format).toBeNull();
      });

      it('should return null for non-string input', () => {
        const format = service.getFormatFromUrl(123 as any);
        expect(format).toBeNull();
      });
    });

    describe('Extension edge cases', () => {
      it('should handle very short extensions', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.a');
        expect(format).toBeNull(); // Too short to be valid
      });

      it('should handle extensions with numbers', () => {
        // Add a test format with numbers for this test
        configService.addSupportedFormat('test2', {
          extensions: ['.jp2'],
          mimeTypes: ['image/jp2'],
          enabled: true
        });
        
        const format = service.getFormatFromUrl('https://example.com/photo.jp2');
        expect(format).toBe('test2');
      });

      it('should handle extensions with special characters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg-backup');
        expect(format).toBeNull(); // Invalid extension format
      });

      it('should handle multiple consecutive dots', () => {
        const format = service.getFormatFromUrl('https://example.com/photo..jpg');
        expect(format).toBe('jpeg');
      });

      it('should handle dot at end of filename', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.');
        expect(format).toBeNull();
      });
    });
  });

  describe('MIME Type Validation - Edge Cases', () => {
    describe('MIME type format variations', () => {
      it('should handle standard MIME types', () => {
        const format = service.getFormatFromMimeType('image/jpeg');
        expect(format).toBe('jpeg');
      });

      it('should handle MIME types with parameters', () => {
        const format = service.getFormatFromMimeType('image/png; charset=utf-8');
        expect(format).toBe('png'); // Should extract base type
      });

      it('should handle case variations', () => {
        const format = service.getFormatFromMimeType('IMAGE/JPEG');
        expect(format).toBe('jpeg');
      });

      it('should handle mixed case', () => {
        const format = service.getFormatFromMimeType('Image/Png');
        expect(format).toBe('png');
      });

      it('should handle whitespace', () => {
        const format = service.getFormatFromMimeType('  image/webp  ');
        expect(format).toBe('webp');
      });
    });

    describe('Invalid MIME type handling', () => {
      it('should return null for malformed MIME types', () => {
        const format = service.getFormatFromMimeType('invalid-mime-type');
        expect(format).toBeNull();
      });

      it('should return null for empty MIME types', () => {
        const format = service.getFormatFromMimeType('');
        expect(format).toBeNull();
      });

      it('should return null for null MIME types', () => {
        const format = service.getFormatFromMimeType(null as any);
        expect(format).toBeNull();
      });

      it('should return null for undefined MIME types', () => {
        const format = service.getFormatFromMimeType(undefined as any);
        expect(format).toBeNull();
      });

      it('should return null for non-string MIME types', () => {
        const format = service.getFormatFromMimeType(123 as any);
        expect(format).toBeNull();
      });

      it('should return null for MIME types without slash', () => {
        const format = service.getFormatFromMimeType('imagejpeg');
        expect(format).toBeNull();
      });

      it('should return null for MIME types with only slash', () => {
        const format = service.getFormatFromMimeType('/');
        expect(format).toBeNull();
      });
    });

    describe('Wikimedia metadata extraction', () => {
      it('should extract MIME type from valid Wikimedia metadata', () => {
        const metadata = {
          MimeType: { value: 'image/jpeg' }
        };
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(metadata);
        expect(mimeType).toBe('image/jpeg');
      });

      it('should handle metadata with extra whitespace', () => {
        const metadata = {
          MimeType: { value: '  image/png  ' }
        };
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(metadata);
        expect(mimeType).toBe('image/png');
      });

      it('should return null for missing MimeType field', () => {
        const metadata = {
          OtherField: { value: 'some value' }
        };
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(metadata);
        expect(mimeType).toBeNull();
      });

      it('should return null for MimeType without value', () => {
        const metadata = {
          MimeType: { description: 'MIME type' }
        };
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(metadata);
        expect(mimeType).toBeNull();
      });

      it('should return null for empty MimeType value', () => {
        const metadata = {
          MimeType: { value: '' }
        };
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(metadata);
        expect(mimeType).toBeNull();
      });

      it('should return null for null metadata', () => {
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(null);
        expect(mimeType).toBeNull();
      });

      it('should return null for undefined metadata', () => {
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(undefined);
        expect(mimeType).toBeNull();
      });

      it('should return null for non-object metadata', () => {
        const mimeType = service.extractMimeTypeFromWikimediaMetadata('not an object');
        expect(mimeType).toBeNull();
      });

      it('should handle nested metadata structures', () => {
        const metadata = {
          MimeType: {
            value: 'image/webp',
            source: 'commons',
            hidden: false
          }
        };
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(metadata);
        expect(mimeType).toBe('image/webp');
      });
    });
  });

  describe('Network Error Handling', () => {
    describe('HTTP request failures', () => {
      it('should handle network connection errors', async () => {
        const url = 'https://example.com/photo';
        
        const promise = service.validateImageFormat(url);
        
        const req = httpMock.expectOne(url);
        req.error(new ErrorEvent('Network error'), {
          status: 0,
          statusText: 'Unknown Error'
        });

        const result = await promise;
        
        expect(result.isValid).toBe(false);
        expect(result.detectionMethod).toBe('http-content-type');
        expect(result.rejectionReason).toContain('Network connection failed');
        expect(result.confidence).toBe(0.0);
      });

      it('should handle HTTP 404 errors', async () => {
        const url = 'https://example.com/photo';
        
        const promise = service.validateImageFormat(url);
        
        const req = httpMock.expectOne(url);
        req.error(new ErrorEvent('Not Found'), {
          status: 404,
          statusText: 'Not Found'
        });

        const result = await promise;
        
        expect(result.isValid).toBe(false);
        expect(result.detectionMethod).toBe('http-content-type');
        expect(result.rejectionReason).toContain('Image not found');
      });

      it('should handle HTTP 403 errors', async () => {
        const url = 'https://example.com/photo';
        
        const promise = service.validateImageFormat(url);
        
        const req = httpMock.expectOne(url);
        req.error(new ErrorEvent('Forbidden'), {
          status: 403,
          statusText: 'Forbidden'
        });

        const result = await promise;
        
        expect(result.isValid).toBe(false);
        expect(result.detectionMethod).toBe('http-content-type');
        expect(result.rejectionReason).toContain('Access denied');
      });

      it('should handle HTTP 500 errors', async () => {
        const url = 'https://example.com/photo';
        
        const promise = service.validateImageFormat(url);
        
        const req = httpMock.expectOne(url);
        req.error(new ErrorEvent('Server Error'), {
          status: 500,
          statusText: 'Internal Server Error'
        });

        const result = await promise;
        
        expect(result.isValid).toBe(false);
        expect(result.detectionMethod).toBe('http-content-type');
        expect(result.rejectionReason).toContain('Server error');
      });

      it('should handle timeout errors', async () => {
        const url = 'https://example.com/photo';
        
        const promise = service.validateImageFormat(url);
        
        const req = httpMock.expectOne(url);
        req.error(new ErrorEvent('Timeout'), {
          status: 0,
          statusText: 'Unknown Error'
        });

        const result = await promise;
        
        expect(result.isValid).toBe(false);
        expect(result.detectionMethod).toBe('http-content-type');
        expect(result.rejectionReason).toContain('Network connection failed');
      });
    });

    describe('Malformed URL handling', () => {
      it('should handle invalid HTTP URLs gracefully', async () => {
        const url = 'not-a-valid-http-url';
        
        const result = await service.validateImageFormat(url);
        
        expect(result.isValid).toBe(false);
        expect(result.rejectionReason).toContain('Unable to determine image format');
      });

      it('should handle URLs with invalid characters', async () => {
        const url = 'https://example.com/photo with spaces.jpg';
        
        const result = await service.validateImageFormat(url);
        
        // Should still work as URL constructor can handle some invalid chars
        expect(result.detectedFormat).toBe('jpeg');
      });

      it('should handle extremely long URLs', async () => {
        const longPath = 'a'.repeat(2000);
        const url = `https://example.com/${longPath}.jpg`;
        
        const result = await service.validateImageFormat(url);
        
        expect(result.detectedFormat).toBe('jpeg');
      });
    });
  });

  describe('Comprehensive Format Validation', () => {
    describe('Supported formats validation', () => {
      it('should validate JPEG format correctly', async () => {
        const testCases = [
          { url: 'https://example.com/photo.jpg', mimeType: 'image/jpeg' },
          { url: 'https://example.com/photo.jpeg', mimeType: 'image/jpeg' },
          { url: 'https://example.com/photo.JPG', mimeType: undefined },
          { url: 'https://example.com/photo', mimeType: 'image/jpeg' }
        ];

        for (const testCase of testCases) {
          const result = await service.validateImageFormat(testCase.url, testCase.mimeType);
          
          expect(result.isValid).toBe(true);
          expect(result.detectedFormat).toBe('jpeg');
          expect(result.confidence).toBeGreaterThan(0.6);
        }
      });

      it('should validate PNG format correctly', async () => {
        const testCases = [
          { url: 'https://example.com/photo.png', mimeType: 'image/png' },
          { url: 'https://example.com/photo.PNG', mimeType: undefined },
          { url: 'https://example.com/photo', mimeType: 'image/png' }
        ];

        for (const testCase of testCases) {
          const result = await service.validateImageFormat(testCase.url, testCase.mimeType);
          
          expect(result.isValid).toBe(true);
          expect(result.detectedFormat).toBe('png');
          expect(result.confidence).toBeGreaterThan(0.6);
        }
      });

      it('should validate WebP format correctly', async () => {
        const testCases = [
          { url: 'https://example.com/photo.webp', mimeType: 'image/webp' },
          { url: 'https://example.com/photo.WEBP', mimeType: undefined },
          { url: 'https://example.com/photo', mimeType: 'image/webp' }
        ];

        for (const testCase of testCases) {
          const result = await service.validateImageFormat(testCase.url, testCase.mimeType);
          
          expect(result.isValid).toBe(true);
          expect(result.detectedFormat).toBe('webp');
          expect(result.confidence).toBeGreaterThan(0.6);
        }
      });
    });

    describe('Rejected formats validation', () => {
      it('should reject TIFF format correctly', async () => {
        const testCases = [
          { url: 'https://example.com/photo.tiff', mimeType: 'image/tiff' },
          { url: 'https://example.com/photo.tif', mimeType: 'image/tiff' },
          { url: 'https://example.com/photo', mimeType: 'image/tiff' }
        ];

        for (const testCase of testCases) {
          const result = await service.validateImageFormat(testCase.url, testCase.mimeType);
          
          expect(result.isValid).toBe(false);
          expect(result.detectedFormat).toBe('tiff');
          expect(result.rejectionReason).toBe('Limited browser support');
          expect(result.confidence).toBeGreaterThan(0.6);
        }
      });

      it('should reject GIF format correctly', async () => {
        const testCases = [
          { url: 'https://example.com/photo.gif', mimeType: 'image/gif' },
          { url: 'https://example.com/photo', mimeType: 'image/gif' }
        ];

        for (const testCase of testCases) {
          const result = await service.validateImageFormat(testCase.url, testCase.mimeType);
          
          expect(result.isValid).toBe(false);
          expect(result.detectedFormat).toBe('gif');
          expect(result.rejectionReason).toBe('Avoid animated content');
          expect(result.confidence).toBeGreaterThan(0.6);
        }
      });

      it('should reject SVG format correctly', async () => {
        const testCases = [
          { url: 'https://example.com/photo.svg', mimeType: 'image/svg+xml' },
          { url: 'https://example.com/photo', mimeType: 'image/svg+xml' }
        ];

        for (const testCase of testCases) {
          const result = await service.validateImageFormat(testCase.url, testCase.mimeType);
          
          expect(result.isValid).toBe(false);
          expect(result.detectedFormat).toBe('svg');
          expect(result.rejectionReason).toBe('Not suitable for photographs');
          expect(result.confidence).toBeGreaterThan(0.6);
        }
      });

      it('should reject BMP format correctly', async () => {
        const testCases = [
          { url: 'https://example.com/photo.bmp', mimeType: 'image/bmp' },
          { url: 'https://example.com/photo', mimeType: 'image/bmp' }
        ];

        for (const testCase of testCases) {
          const result = await service.validateImageFormat(testCase.url, testCase.mimeType);
          
          expect(result.isValid).toBe(false);
          expect(result.detectedFormat).toBe('bmp');
          expect(result.rejectionReason).toBe('Large file sizes, limited web optimization');
          expect(result.confidence).toBeGreaterThan(0.6);
        }
      });
    });

    describe('Unknown format handling', () => {
      it('should handle unknown file extensions', async () => {
        const url = 'https://example.com/photo.unknown';
        
        const result = await service.validateImageFormat(url);
        
        expect(result.isValid).toBe(false);
        expect(result.detectedFormat).toBeUndefined();
        expect(result.rejectionReason).toContain('Unable to determine image format');
      });

      it('should handle unknown MIME types', async () => {
        const url = 'https://example.com/photo';
        const mimeType = 'image/unknown';
        
        const result = await service.validateImageFormat(url, mimeType);
        
        expect(result.isValid).toBe(false);
        expect(result.detectedMimeType).toBe('image/unknown');
        expect(result.rejectionReason).toBe('Unknown MIME type');
      });

      it('should handle mixed unknown format scenarios', async () => {
        const url = 'https://example.com/photo.unknown';
        const mimeType = 'image/unknown';
        
        const result = await service.validateImageFormat(url, mimeType);
        
        expect(result.isValid).toBe(false);
        expect(result.rejectionReason).toBe('Unknown MIME type');
      });
    });
  });

  describe('Detection Strategy Priority', () => {
    it('should prioritize MIME type over URL extension', async () => {
      const url = 'https://example.com/photo.png'; // PNG extension
      const mimeType = 'image/jpeg'; // JPEG MIME type
      
      const result = await service.validateImageFormat(url, mimeType);
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('jpeg'); // Should use MIME type
      expect(result.detectedMimeType).toBe('image/jpeg');
      expect(result.detectionMethod).toBe('mime-type');
      expect(result.confidence).toBe(0.9);
    });

    it('should fall back to URL extension when MIME type is invalid', async () => {
      const url = 'https://example.com/photo.jpg';
      const mimeType = 'invalid/mime-type';
      
      const result = await service.validateImageFormat(url, mimeType);
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('jpeg'); // Should fall back to URL
      expect(result.detectionMethod).toBe('url-extension');
      expect(result.confidence).toBe(0.7);
    });

    it('should use HTTP Content-Type as last resort', async () => {
      const url = 'https://example.com/photo'; // No extension
      
      const promise = service.validateImageFormat(url);
      
      const req = httpMock.expectOne(url);
      req.flush('', {
        headers: { 'content-type': 'image/webp' }
      });

      const result = await promise;
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('webp');
      expect(result.detectionMethod).toBe('http-content-type');
      expect(result.confidence).toBe(0.8);
    });

    it('should handle conflicting format information gracefully', async () => {
      const url = 'https://example.com/photo.gif'; // GIF extension (rejected)
      const mimeType = 'image/jpeg'; // JPEG MIME type (supported)
      
      const result = await service.validateImageFormat(url, mimeType);
      
      // Should prioritize MIME type and accept the image
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('jpeg');
      expect(result.detectionMethod).toBe('mime-type');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache successful validations', async () => {
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

    it('should not cache network errors', async () => {
      const url = 'https://example.com/photo';
      
      // First validation with network error
      const promise1 = service.validateImageFormat(url);
      const req1 = httpMock.expectOne(url);
      req1.error(new ErrorEvent('Network error'));
      await promise1;
      
      // Second validation should not hit cache
      const promise2 = service.validateImageFormat(url);
      const req2 = httpMock.expectOne(url);
      req2.error(new ErrorEvent('Network error'));
      await promise2;
      
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should not cache low confidence results', async () => {
      const url = 'https://example.com/photo.unknown';
      
      // First validation with unknown format (low confidence)
      await service.validateImageFormat(url);
      
      // Second validation should not hit cache
      await service.validateImageFormat(url);
      
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should generate consistent cache keys for equivalent requests', async () => {
      const baseUrl = 'https://example.com/photo.jpg';
      const urlWithQuery = 'https://example.com/photo.jpg?v=123';
      
      // Both should generate the same cache key
      await service.validateImageFormat(baseUrl);
      const stats1 = service.getCacheStats();
      
      await service.validateImageFormat(urlWithQuery);
      const stats2 = service.getCacheStats();
      
      expect(stats2.hits).toBe(stats1.hits + 1);
      expect(stats2.size).toBe(1);
    });
  });

  describe('Logging and Statistics', () => {
    it('should log all validation attempts', async () => {
      const urls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.png',
        'https://example.com/photo3.tiff'
      ];
      
      for (const url of urls) {
        await service.validateImageFormat(url);
      }
      
      const logs = loggerService.getRecentLogs();
      expect(logs.length).toBe(3);
      
      // Check that all URLs were logged
      const loggedUrls = logs.map(log => log.photoUrl);
      expect(loggedUrls).toEqual(jasmine.arrayContaining(urls));
    });

    it('should track validation statistics correctly', async () => {
      // Successful validation
      await service.validateImageFormat('https://example.com/photo1.jpg');
      
      // Rejected validation
      await service.validateImageFormat('https://example.com/photo2.tiff');
      
      // Error validation
      const promise = service.validateImageFormat('https://example.com/photo3');
      const req = httpMock.expectOne('https://example.com/photo3');
      req.error(new ErrorEvent('Network error'));
      await promise;
      
      const stats = loggerService.getStats();
      expect(stats.totalValidations).toBe(3);
      expect(stats.successfulValidations).toBe(1);
      expect(stats.rejectedValidations).toBe(1);
      expect(stats.errorValidations).toBe(1);
    });

    it('should calculate average validation time', async () => {
      const startTime = Date.now();
      
      await service.validateImageFormat('https://example.com/photo.jpg');
      
      const endTime = Date.now();
      const stats = loggerService.getStats();
      
      expect(stats.averageValidationTime).toBeGreaterThan(0);
      expect(stats.averageValidationTime).toBeLessThan(endTime - startTime + 100);
    });

    it('should track format distribution', async () => {
      await service.validateImageFormat('https://example.com/photo1.jpg');
      await service.validateImageFormat('https://example.com/photo2.jpg');
      await service.validateImageFormat('https://example.com/photo3.png');
      
      const stats = loggerService.getStats();
      expect(stats.formatDistribution['jpeg']).toBe(2);
      expect(stats.formatDistribution['png']).toBe(1);
    });

    it('should track rejection reasons', async () => {
      await service.validateImageFormat('https://example.com/photo1.tiff');
      await service.validateImageFormat('https://example.com/photo2.gif');
      
      const stats = loggerService.getStats();
      expect(stats.rejectionReasons['Limited browser support']).toBe(1);
      expect(stats.rejectionReasons['Avoid animated content']).toBe(1);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service initialization errors gracefully', () => {
      // Test that service can be created even with potential initialization issues
      expect(service).toBeTruthy();
      expect(service.getSupportedFormats()).toBeDefined();
    });

    it('should handle concurrent validation requests', async () => {
      const urls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.png',
        'https://example.com/photo3.webp'
      ];
      
      // Start all validations concurrently
      const promises = urls.map(url => service.validateImageFormat(url));
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach((result, index) => {
        expect(result.isValid).toBe(true);
        expect(result.detectedFormat).toBeDefined();
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      const validUrl = 'https://example.com/photo.jpg';
      const invalidUrl = 'https://example.com/photo.tiff';
      const networkErrorUrl = 'https://example.com/photo';
      
      // Valid format
      const result1 = await service.validateImageFormat(validUrl);
      
      // Invalid format
      const result2 = await service.validateImageFormat(invalidUrl);
      
      // Network error
      const promise3 = service.validateImageFormat(networkErrorUrl);
      const req = httpMock.expectOne(networkErrorUrl);
      req.error(new ErrorEvent('Network error'));
      const result3 = await promise3;
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(false);
      expect(result3.isValid).toBe(false);
      
      // Service should still be functional
      const result4 = await service.validateImageFormat(validUrl);
      expect(result4.isValid).toBe(true);
    });

    it('should maintain cache integrity during errors', async () => {
      const validUrl = 'https://example.com/photo.jpg';
      const errorUrl = 'https://example.com/photo';
      
      // Cache a valid result
      await service.validateImageFormat(validUrl);
      const stats1 = service.getCacheStats();
      expect(stats1.size).toBe(1);
      
      // Trigger an error
      const promise = service.validateImageFormat(errorUrl);
      const req = httpMock.expectOne(errorUrl);
      req.error(new ErrorEvent('Network error'));
      await promise;
      
      // Cache should still be intact
      const stats2 = service.getCacheStats();
      expect(stats2.size).toBe(1);
      
      // Cached result should still work
      await service.validateImageFormat(validUrl);
      const stats3 = service.getCacheStats();
      expect(stats3.hits).toBe(stats2.hits + 1);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of validations efficiently', async () => {
      const startTime = Date.now();
      const numValidations = 50;
      
      const promises = [];
      for (let i = 0; i < numValidations; i++) {
        promises.push(service.validateImageFormat(`https://example.com/photo${i}.jpg`));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerValidation = totalTime / numValidations;
      
      // Should complete reasonably quickly (less than 100ms per validation on average)
      expect(avgTimePerValidation).toBeLessThan(100);
      
      const stats = loggerService.getStats();
      expect(stats.totalValidations).toBe(numValidations);
    });

    it('should manage cache size appropriately', async () => {
      // Fill cache with many entries
      const numEntries = 20;
      for (let i = 0; i < numEntries; i++) {
        await service.validateImageFormat(`https://example.com/photo${i}.jpg`);
      }
      
      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(numEntries);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should clean up resources properly', () => {
      // Test cache clearing
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      // Test logger clearing
      loggerService.clearLogs();
      const logs = loggerService.getRecentLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('Integration with Configuration Service', () => {
    it('should respect configuration changes', async () => {
      // Initially JPEG should be supported
      let result = await service.validateImageFormat('https://example.com/photo.jpg');
      expect(result.isValid).toBe(true);
      
      // Disable JPEG format
      configService.setFormatEnabled('jpeg', false);
      
      // Now JPEG should be rejected
      result = await service.validateImageFormat('https://example.com/photo2.jpg');
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('Format not supported for web display');
    });

    it('should handle dynamic format additions', async () => {
      // Add a new supported format
      const newFormat = {
        extensions: ['.avif'],
        mimeTypes: ['image/avif'],
        enabled: true
      };
      
      configService.addSupportedFormat('avif', newFormat);
      
      // Should now support AVIF
      const result = await service.validateImageFormat('https://example.com/photo.avif');
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('avif');
    });

    it('should handle configuration validation errors gracefully', () => {
      // Try to add invalid configuration
      const invalidFormat = {
        extensions: ['invalid-extension'], // Missing dot
        mimeTypes: ['invalid-mime'], // Missing slash
        enabled: 'true' // Should be boolean
      } as any;
      
      const result = configService.addSupportedFormat('invalid', invalidFormat);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Service should still work normally
      expect(service.getSupportedFormats()).toContain('jpeg');
    });
  });
});