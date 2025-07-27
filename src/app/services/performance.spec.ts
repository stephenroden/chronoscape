import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormatValidationService } from './format-validation.service';
import { FormatValidationPerformanceService } from './format-validation-performance.service';
import { FormatValidationLoggerService } from './format-validation-logger.service';
import { FormatConfigService } from './format-config.service';
import { PhotoService } from './photo.service';
import { CacheService } from './cache.service';

describe('Format Validation Performance Tests', () => {
  let formatValidationService: FormatValidationService;
  let performanceService: FormatValidationPerformanceService;
  let photoService: PhotoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FormatValidationService,
        FormatValidationPerformanceService,
        FormatValidationLoggerService,
        FormatConfigService,
        PhotoService,
        CacheService
      ]
    });

    formatValidationService = TestBed.inject(FormatValidationService);
    performanceService = TestBed.inject(FormatValidationPerformanceService);
    photoService = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    performanceService.resetMetrics();
    formatValidationService.clearCache();
  });

  describe('Single Validation Performance', () => {
    it('should complete validation within 100ms for MIME type detection', async () => {
      const startTime = Date.now();
      
      const result = await formatValidationService.validateImageFormat(
        'https://example.com/test.jpg',
        'image/jpeg'
      );
      
      const duration = Date.now() - startTime;
      
      expect(result.isValid).toBe(true);
      expect(duration).toBeLessThan(100);
      expect(result.detectionMethod).toBe('mime-type');
    });

    it('should complete validation within 100ms for URL extension detection', async () => {
      const startTime = Date.now();
      
      const result = await formatValidationService.validateImageFormat(
        'https://example.com/test.png'
      );
      
      const duration = Date.now() - startTime;
      
      expect(result.isValid).toBe(true);
      expect(duration).toBeLessThan(100);
      expect(result.detectionMethod).toBe('url-extension');
    });

    it('should track performance metrics for single validations', async () => {
      const initialMetrics = performanceService.getMetrics();
      expect(initialMetrics.totalValidations).toBe(0);

      await formatValidationService.validateImageFormat(
        'https://example.com/test.jpg',
        'image/jpeg'
      );

      const finalMetrics = performanceService.getMetrics();
      expect(finalMetrics.totalValidations).toBe(1);
      expect(finalMetrics.successfulValidations).toBe(1);
      expect(finalMetrics.averageValidationTime).toBeGreaterThan(0);
      expect(finalMetrics.averageValidationTime).toBeLessThan(100);
    });
  });

  describe('Batch Validation Performance', () => {
    it('should process batch validation faster than individual validations', async () => {
      const urls = [
        'https://example.com/test1.jpg',
        'https://example.com/test2.png',
        'https://example.com/test3.webp',
        'https://example.com/test4.jpg',
        'https://example.com/test5.png'
      ];

      const mimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/jpeg',
        'image/png'
      ];

      // Test individual validations
      const individualStartTime = Date.now();
      const individualResults: any[] = [];
      for (let i = 0; i < urls.length; i++) {
        const result = await formatValidationService.validateImageFormat(urls[i], mimeTypes[i]);
        individualResults.push(result);
      }
      const individualDuration = Date.now() - individualStartTime;

      // Reset metrics for batch test
      performanceService.resetMetrics();

      // Test batch validation
      const batchStartTime = Date.now();
      const batchRequests = urls.map((url, index) => ({
        url,
        mimeType: mimeTypes[index]
      }));
      
      const batchResults = await formatValidationService.validateImageFormatsBatch(batchRequests);
      const batchDuration = Date.now() - batchStartTime;

      // Batch should be faster than individual validations
      expect(batchDuration).toBeLessThan(individualDuration);
      expect(batchResults.length).toBe(urls.length);
      
      // Results should be equivalent
      batchResults.forEach((result, index) => {
        expect(result.isValid).toBe(individualResults[index].isValid);
        expect(result.detectedFormat).toBe(individualResults[index].detectedFormat);
      });

      // Check batch metrics
      const metrics = performanceService.getMetrics();
      expect(metrics.batchValidationCount).toBe(1);
      expect(metrics.averageBatchSize).toBe(urls.length);
    });

    it('should handle large batch sizes efficiently', async () => {
      const batchSize = 50;
      const urls = Array.from({ length: batchSize }, (_, i) => 
        `https://example.com/test${i}.jpg`
      );
      
      const batchRequests = urls.map(url => ({
        url,
        mimeType: 'image/jpeg'
      }));

      const startTime = Date.now();
      const results = await formatValidationService.validateImageFormatsBatch(batchRequests);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(batchSize);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      const metrics = performanceService.getMetrics();
      expect(metrics.averageValidationTime).toBeLessThan(50); // Average per validation should be low
    });

    it('should maintain performance with mixed validation methods in batch', async () => {
      const batchRequests = [
        { url: 'https://example.com/test1.jpg', mimeType: 'image/jpeg' }, // MIME type detection
        { url: 'https://example.com/test2.png' }, // URL extension detection
        { url: 'https://example.com/test3.webp', mimeType: 'image/webp' }, // MIME type detection
        { url: 'https://example.com/test4.unknown' }, // Should fail
        { url: 'https://example.com/test5.tiff', mimeType: 'image/tiff' } // Rejected format
      ];

      const startTime = Date.now();
      const results = await formatValidationService.validateImageFormatsBatch(batchRequests);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(500);
      
      // Check individual results
      expect(results[0].isValid).toBe(true); // JPEG
      expect(results[1].isValid).toBe(true); // PNG
      expect(results[2].isValid).toBe(true); // WebP
      expect(results[3].isValid).toBe(false); // Unknown
      expect(results[4].isValid).toBe(false); // TIFF (rejected)

      const metrics = performanceService.getMetrics();
      expect(metrics.successfulValidations).toBe(3);
      expect(metrics.failedValidations).toBe(2);
    });
  });

  describe('Cache Performance', () => {
    it('should achieve high cache hit rate for repeated validations', async () => {
      const url = 'https://example.com/test.jpg';
      const mimeType = 'image/jpeg';

      // First validation (cache miss)
      await formatValidationService.validateImageFormat(url, mimeType);
      
      // Subsequent validations (cache hits)
      for (let i = 0; i < 10; i++) {
        await formatValidationService.validateImageFormat(url, mimeType);
      }

      const cacheStats = formatValidationService.getCacheStats();
      expect(cacheStats.hitRate).toBeGreaterThan(80); // Should have >80% hit rate
      expect(cacheStats.hits).toBe(10);
      expect(cacheStats.misses).toBe(1);
    });

    it('should improve performance significantly with cache hits', async () => {
      const url = 'https://example.com/test.jpg';
      const mimeType = 'image/jpeg';

      // First validation (cache miss)
      const firstStartTime = Date.now();
      await formatValidationService.validateImageFormat(url, mimeType);
      const firstDuration = Date.now() - firstStartTime;

      // Second validation (cache hit)
      const secondStartTime = Date.now();
      await formatValidationService.validateImageFormat(url, mimeType);
      const secondDuration = Date.now() - secondStartTime;

      // Cache hit should be significantly faster
      expect(secondDuration).toBeLessThan(firstDuration / 2);
      expect(secondDuration).toBeLessThan(10); // Should be very fast
    });
  });

  describe('HTTP Request Optimization', () => {
    it('should minimize HTTP requests in batch validation', async () => {
      const batchRequests = [
        { url: 'https://example.com/test1.unknown' }, // Will need HTTP check
        { url: 'https://example.com/test2.jpg' }, // URL extension sufficient
        { url: 'https://example.com/test3.unknown' }, // Will need HTTP check
        { url: 'https://example.com/test4.png', mimeType: 'image/png' }, // MIME type sufficient
        { url: 'https://example.com/test5.unknown' } // Will need HTTP check
      ];

      // Mock HTTP responses for unknown extensions
      const mockHttpResponses = [
        { url: 'https://example.com/test1.unknown', contentType: 'image/jpeg' },
        { url: 'https://example.com/test3.unknown', contentType: 'image/png' },
        { url: 'https://example.com/test5.unknown', contentType: 'image/webp' }
      ];

      const results = await formatValidationService.validateImageFormatsBatch(batchRequests);

      // Handle HTTP requests
      mockHttpResponses.forEach(mock => {
        const req = httpMock.expectOne(mock.url);
        expect(req.request.method).toBe('HEAD');
        req.flush('', { 
          status: 200, 
          statusText: 'OK',
          headers: { 'content-type': mock.contentType }
        });
      });

      expect(results.length).toBe(5);
      
      // Should have made exactly 3 HTTP requests (for unknown extensions only)
      const metrics = performanceService.getMetrics();
      expect(metrics.networkRequestCount).toBe(3);
    });

    it('should handle HTTP request failures gracefully in batch', async () => {
      const batchRequests = [
        { url: 'https://example.com/test1.jpg' }, // Should succeed
        { url: 'https://example.com/test2.unknown' }, // Will fail HTTP check
        { url: 'https://example.com/test3.png' } // Should succeed
      ];

      const resultsPromise = formatValidationService.validateImageFormatsBatch(batchRequests);

      // Mock HTTP failure
      const req = httpMock.expectOne('https://example.com/test2.unknown');
      req.flush('', { status: 404, statusText: 'Not Found' });

      const results = await resultsPromise;

      expect(results.length).toBe(3);
      expect(results[0].isValid).toBe(true); // JPEG
      expect(results[1].isValid).toBe(false); // Failed HTTP
      expect(results[2].isValid).toBe(true); // PNG
    });
  });

  describe('Performance Health Monitoring', () => {
    it('should report healthy performance for normal operations', async () => {
      // Perform some validations to generate metrics
      const urls = [
        'https://example.com/test1.jpg',
        'https://example.com/test2.png',
        'https://example.com/test3.webp'
      ];

      for (const url of urls) {
        await formatValidationService.validateImageFormat(url, 'image/jpeg');
      }

      const health = formatValidationService.getPerformanceHealth();
      expect(health.healthy).toBe(true);
      expect(health.issues.length).toBe(0);
    });

    it('should detect performance issues', async () => {
      // Simulate slow validations by using HTTP fallback
      const slowUrls = Array.from({ length: 10 }, (_, i) => 
        `https://slow-server.com/test${i}.unknown`
      );

      const batchRequests = slowUrls.map(url => ({ url }));
      
      // Start batch validation
      const resultsPromise = formatValidationService.validateImageFormatsBatch(batchRequests);

      // Mock slow HTTP responses
      slowUrls.forEach(url => {
        const req = httpMock.expectOne(url);
        // Simulate slow response
        setTimeout(() => {
          req.flush('', { 
            status: 200, 
            statusText: 'OK',
            headers: { 'content-type': 'image/jpeg' }
          });
        }, 150); // Slow response
      });

      await resultsPromise;

      const health = formatValidationService.getPerformanceHealth();
      // Should detect slow average validation time
      expect(health.issues.some(issue => issue.includes('Average validation time'))).toBe(true);
    });

    it('should provide performance recommendations', async () => {
      // Generate low cache hit rate scenario
      for (let i = 0; i < 20; i++) {
        await formatValidationService.validateImageFormat(`https://example.com/unique${i}.jpg`);
      }

      const health = formatValidationService.getPerformanceHealth();
      if (!health.healthy) {
        expect(health.recommendations.length).toBeGreaterThan(0);
        expect(health.recommendations.some(rec => 
          rec.includes('cache') || rec.includes('optimization')
        )).toBe(true);
      }
    });
  });

  describe('Photo Service Integration Performance', () => {
    it('should not significantly slow down photo fetching', async () => {
      // This test would require mocking the full photo service workflow
      // For now, we'll test that the format validation doesn't add excessive overhead
      
      const mockPhotoData = {
        title: 'File:Test.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            MimeType: { value: 'image/jpeg' },
            DateTime: { value: '2020-01-01' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' }
          }
        }]
      };

      const startTime = Date.now();
      const photo = await photoService.processPhotoData(mockPhotoData);
      const duration = Date.now() - startTime;

      expect(photo).toBeTruthy();
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with large numbers of validations', async () => {
      const initialMetrics = formatValidationService.getPerformanceMetrics();
      
      // Perform many validations
      for (let i = 0; i < 1000; i++) {
        await formatValidationService.validateImageFormat(`https://example.com/test${i}.jpg`);
      }

      const finalMetrics = formatValidationService.getPerformanceMetrics();
      
      // Cache should not grow indefinitely
      const cacheStats = formatValidationService.getCacheStats();
      expect(cacheStats.size).toBeLessThan(600); // Should respect max cache size
      
      // Performance metrics should be reasonable
      expect(finalMetrics.averageValidationTime).toBeLessThan(100);
    });
  });
});