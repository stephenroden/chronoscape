import { TestBed } from '@angular/core/testing';
import { FormatValidationLoggerService, FormatValidationLog, FormatValidationStats } from './format-validation-logger.service';
import { FormatValidationResult } from './format-validation.service';

describe('FormatValidationLoggerService - Comprehensive Tests', () => {
  let service: FormatValidationLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormatValidationLoggerService]
    });
    service = TestBed.inject(FormatValidationLoggerService);
    service.clearLogs();
  });

  describe('Basic Logging Functionality', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should log successful validation', () => {
      const url = 'https://example.com/photo.jpg';
      const result: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        detectedMimeType: 'image/jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };
      const validationTime = 50;

      service.logSuccess(url, result, validationTime);

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe(url);
      expect(logs[0].validationResult).toBe(true);
      expect(logs[0].detectedFormat).toBe('jpeg');
      expect(logs[0].detectedMimeType).toBe('image/jpeg');
      expect(logs[0].validationTime).toBe(validationTime);
      expect(logs[0].detectionMethod).toBe('mime-type');
      expect(logs[0].confidence).toBe(0.9);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should log validation rejection', () => {
      const url = 'https://example.com/photo.tiff';
      const result: FormatValidationResult = {
        isValid: false,
        detectedFormat: 'tiff',
        detectedMimeType: 'image/tiff',
        confidence: 0.8,
        detectionMethod: 'mime-type',
        rejectionReason: 'Limited browser support'
      };
      const validationTime = 30;

      service.logRejection(url, result, validationTime);

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe(url);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].detectedFormat).toBe('tiff');
      expect(logs[0].rejectionReason).toBe('Limited browser support');
      expect(logs[0].validationTime).toBe(validationTime);
    });

    it('should log validation errors', () => {
      const url = 'https://example.com/photo';
      const error = new Error('Network connection failed');
      const validationTime = 100;
      const detectionMethod = 'http-content-type';

      service.logError(url, error, validationTime, detectionMethod);

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe(url);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].detectionMethod).toBe(detectionMethod);
      expect(logs[0].errorDetails).toBeDefined();
      expect(logs[0].errorDetails!.errorType).toBe('Error');
      expect(logs[0].errorDetails!.errorMessage).toBe('Network connection failed');
      expect(logs[0].rejectionReason).toContain('Error during validation');
    });

    it('should log network errors with metadata', () => {
      const url = 'https://example.com/photo';
      const error = new Error('Request timeout');
      const validationTime = 5000;
      const isTimeout = true;
      const httpStatusCode = 0;

      service.logNetworkError(url, error, validationTime, isTimeout, httpStatusCode);

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe(url);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].detectionMethod).toBe('http-content-type');
      expect(logs[0].metadata?.networkTimeout).toBe(true);
      expect(logs[0].metadata?.httpStatusCode).toBe(0);
      expect(logs[0].errorDetails).toBeDefined();
    });
  });

  describe('Log Management', () => {
    it('should maintain log size limit', () => {
      // Add more logs than the maximum
      const maxLogs = 1000;
      const extraLogs = 50;
      
      for (let i = 0; i < maxLogs + extraLogs; i++) {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: 'url-extension'
        };
        service.logSuccess(`https://example.com/photo${i}.jpg`, result, 10);
      }

      const logs = service.getRecentLogs();
      expect(logs.length).toBeLessThanOrEqual(maxLogs);
    });

    it('should return recent logs in correct order', () => {
      const urls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg'
      ];

      urls.forEach((url, index) => {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: 'url-extension'
        };
        service.logSuccess(url, result, 10);
      });

      const logs = service.getRecentLogs(3);
      expect(logs.length).toBe(3);
      
      // Should be in chronological order (oldest first)
      expect(logs[0].photoUrl).toBe(urls[0]);
      expect(logs[1].photoUrl).toBe(urls[1]);
      expect(logs[2].photoUrl).toBe(urls[2]);
    });

    it('should limit returned logs when requested', () => {
      for (let i = 0; i < 10; i++) {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: 'url-extension'
        };
        service.logSuccess(`https://example.com/photo${i}.jpg`, result, 10);
      }

      const logs = service.getRecentLogs(5);
      expect(logs.length).toBe(5);
    });

    it('should clear all logs and reset statistics', () => {
      // Add some logs
      for (let i = 0; i < 5; i++) {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: 'url-extension'
        };
        service.logSuccess(`https://example.com/photo${i}.jpg`, result, 10);
      }

      expect(service.getRecentLogs().length).toBe(5);
      expect(service.getStats().totalValidations).toBe(5);

      service.clearLogs();

      expect(service.getRecentLogs().length).toBe(0);
      expect(service.getStats().totalValidations).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track total validations correctly', () => {
      const numValidations = 10;
      
      for (let i = 0; i < numValidations; i++) {
        const result: FormatValidationResult = {
          isValid: i % 2 === 0, // Alternate between success and failure
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: 'url-extension',
          rejectionReason: i % 2 === 0 ? undefined : 'Test rejection'
        };
        service.logValidation(`https://example.com/photo${i}.jpg`, result, 10);
      }

      const stats = service.getStats();
      expect(stats.totalValidations).toBe(numValidations);
      expect(stats.successfulValidations).toBe(5);
      expect(stats.rejectedValidations).toBe(5);
      expect(stats.errorValidations).toBe(0);
    });

    it('should track error validations correctly', () => {
      // Add successful validation
      const successResult: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };
      service.logSuccess('https://example.com/photo1.jpg', successResult, 10);

      // Add error validation
      const error = new Error('Network error');
      service.logError('https://example.com/photo2.jpg', error, 100, 'http-content-type');

      const stats = service.getStats();
      expect(stats.totalValidations).toBe(2);
      expect(stats.successfulValidations).toBe(1);
      expect(stats.rejectedValidations).toBe(0);
      expect(stats.errorValidations).toBe(1);
      expect(stats.networkErrors).toBe(1);
    });

    it('should track timeout errors correctly', () => {
      const error = new Error('Timeout');
      service.logNetworkError('https://example.com/photo.jpg', error, 5000, true, 0);

      const stats = service.getStats();
      expect(stats.timeoutErrors).toBe(1);
      expect(stats.networkErrors).toBe(1);
    });

    it('should calculate average validation time correctly', () => {
      const validationTimes = [10, 20, 30, 40, 50];
      const expectedAverage = validationTimes.reduce((a, b) => a + b) / validationTimes.length;

      validationTimes.forEach((time, index) => {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: 'url-extension'
        };
        service.logSuccess(`https://example.com/photo${index}.jpg`, result, time);
      });

      const stats = service.getStats();
      expect(stats.averageValidationTime).toBe(expectedAverage);
    });

    it('should track format distribution correctly', () => {
      const formats = ['jpeg', 'png', 'jpeg', 'webp', 'jpeg'];
      
      formats.forEach((format, index) => {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: format,
          confidence: 0.7,
          detectionMethod: 'url-extension'
        };
        service.logSuccess(`https://example.com/photo${index}.jpg`, result, 10);
      });

      const stats = service.getStats();
      expect(stats.formatDistribution['jpeg']).toBe(3);
      expect(stats.formatDistribution['png']).toBe(1);
      expect(stats.formatDistribution['webp']).toBe(1);
    });

    it('should track rejection reasons correctly', () => {
      const rejectionReasons = [
        'Limited browser support',
        'Avoid animated content',
        'Limited browser support',
        'Not suitable for photographs'
      ];

      rejectionReasons.forEach((reason, index) => {
        const result: FormatValidationResult = {
          isValid: false,
          detectedFormat: 'tiff',
          confidence: 0.8,
          detectionMethod: 'mime-type',
          rejectionReason: reason
        };
        service.logRejection(`https://example.com/photo${index}.tiff`, result, 10);
      });

      const stats = service.getStats();
      expect(stats.rejectionReasons['Limited browser support']).toBe(2);
      expect(stats.rejectionReasons['Avoid animated content']).toBe(1);
      expect(stats.rejectionReasons['Not suitable for photographs']).toBe(1);
    });

    it('should track detection methods correctly', () => {
      const methods = ['mime-type', 'url-extension', 'mime-type', 'http-content-type'];

      methods.forEach((method, index) => {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: method
        };
        service.logSuccess(`https://example.com/photo${index}.jpg`, result, 10);
      });

      const stats = service.getStats();
      expect(stats.detectionMethods['mime-type']).toBe(2);
      expect(stats.detectionMethods['url-extension']).toBe(1);
      expect(stats.detectionMethods['http-content-type']).toBe(1);
    });
  });

  describe('Log Filtering', () => {
    beforeEach(() => {
      // Set up test data
      const testData = [
        {
          url: 'https://example.com/photo1.jpg',
          result: { isValid: true, detectedFormat: 'jpeg', confidence: 0.9, detectionMethod: 'mime-type' },
          time: 10
        },
        {
          url: 'https://example.com/photo2.tiff',
          result: { isValid: false, detectedFormat: 'tiff', confidence: 0.8, detectionMethod: 'mime-type', rejectionReason: 'Limited browser support' },
          time: 20
        },
        {
          url: 'https://example.com/photo3.png',
          result: { isValid: true, detectedFormat: 'png', confidence: 0.7, detectionMethod: 'url-extension' },
          time: 15
        }
      ];

      testData.forEach(data => {
        service.logValidation(data.url, data.result as FormatValidationResult, data.time);
      });

      // Add an error log
      const error = new Error('Network error');
      service.logError('https://example.com/photo4.jpg', error, 100, 'http-content-type');
    });

    it('should filter by validation result', () => {
      const successLogs = service.getFilteredLogs({ validationResult: true });
      const failureLogs = service.getFilteredLogs({ validationResult: false });

      expect(successLogs.length).toBe(2);
      expect(failureLogs.length).toBe(2); // 1 rejection + 1 error

      successLogs.forEach(log => {
        expect(log.validationResult).toBe(true);
      });

      failureLogs.forEach(log => {
        expect(log.validationResult).toBe(false);
      });
    });

    it('should filter by detection method', () => {
      const mimeTypeLogs = service.getFilteredLogs({ detectionMethod: 'mime-type' });
      const urlExtensionLogs = service.getFilteredLogs({ detectionMethod: 'url-extension' });

      expect(mimeTypeLogs.length).toBe(2);
      expect(urlExtensionLogs.length).toBe(1);

      mimeTypeLogs.forEach(log => {
        expect(log.detectionMethod).toBe('mime-type');
      });

      urlExtensionLogs.forEach(log => {
        expect(log.detectionMethod).toBe('url-extension');
      });
    });

    it('should filter by error presence', () => {
      const errorLogs = service.getFilteredLogs({ hasError: true });
      const nonErrorLogs = service.getFilteredLogs({ hasError: false });

      expect(errorLogs.length).toBe(1);
      expect(nonErrorLogs.length).toBe(3);

      errorLogs.forEach(log => {
        expect(log.errorDetails).toBeDefined();
      });

      nonErrorLogs.forEach(log => {
        expect(log.errorDetails).toBeUndefined();
      });
    });

    it('should filter by confidence range', () => {
      const highConfidenceLogs = service.getFilteredLogs({ minConfidence: 0.8 });
      const lowConfidenceLogs = service.getFilteredLogs({ maxConfidence: 0.7 });

      expect(highConfidenceLogs.length).toBe(2); // 0.9 and 0.8
      expect(lowConfidenceLogs.length).toBe(2); // 0.7 and 0.0 (error)

      highConfidenceLogs.forEach(log => {
        expect(log.confidence).toBeGreaterThanOrEqual(0.8);
      });

      lowConfidenceLogs.forEach(log => {
        expect(log.confidence).toBeLessThanOrEqual(0.7);
      });
    });

    it('should filter by timestamp', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      const recentLogs = service.getFilteredLogs({ since: oneMinuteAgo });
      expect(recentLogs.length).toBe(4); // All logs should be recent

      const futureLogs = service.getFilteredLogs({ since: new Date(now.getTime() + 60000) });
      expect(futureLogs.length).toBe(0); // No logs from the future
    });

    it('should combine multiple filter criteria', () => {
      const filteredLogs = service.getFilteredLogs({
        validationResult: true,
        detectionMethod: 'mime-type',
        minConfidence: 0.8
      });

      expect(filteredLogs.length).toBe(1);
      expect(filteredLogs[0].validationResult).toBe(true);
      expect(filteredLogs[0].detectionMethod).toBe('mime-type');
      expect(filteredLogs[0].confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Rejection Pattern Analysis', () => {
    beforeEach(() => {
      // Set up diverse test data
      const testData = [
        { format: 'jpeg', valid: true, reason: undefined, method: 'mime-type', confidence: 0.9 },
        { format: 'tiff', valid: false, reason: 'Limited browser support', method: 'mime-type', confidence: 0.8 },
        { format: 'gif', valid: false, reason: 'Avoid animated content', method: 'url-extension', confidence: 0.7 },
        { format: 'png', valid: true, reason: undefined, method: 'url-extension', confidence: 0.7 },
        { format: 'tiff', valid: false, reason: 'Limited browser support', method: 'mime-type', confidence: 0.8 },
        { format: 'webp', valid: true, reason: undefined, method: 'http-content-type', confidence: 0.8 },
        { format: 'svg', valid: false, reason: 'Not suitable for photographs', method: 'mime-type', confidence: 0.9 }
      ];

      testData.forEach((data, index) => {
        const result: FormatValidationResult = {
          isValid: data.valid,
          detectedFormat: data.format,
          confidence: data.confidence,
          detectionMethod: data.method,
          rejectionReason: data.reason
        };
        service.logValidation(`https://example.com/photo${index}.jpg`, result, 10);
      });
    });

    it('should analyze common rejection reasons', () => {
      const patterns = service.getRejectionPatterns();
      
      expect(patterns.commonReasons.length).toBeGreaterThan(0);
      
      const limitedBrowserSupport = patterns.commonReasons.find(r => r.reason === 'Limited browser support');
      expect(limitedBrowserSupport).toBeDefined();
      expect(limitedBrowserSupport!.count).toBe(2);
      expect(limitedBrowserSupport!.percentage).toBeCloseTo(28.57, 1); // 2/7 * 100
    });

    it('should analyze format distribution', () => {
      const patterns = service.getRejectionPatterns();
      
      expect(patterns.formatDistribution.length).toBeGreaterThan(0);
      
      const jpegDistribution = patterns.formatDistribution.find(f => f.format === 'jpeg');
      const tiffDistribution = patterns.formatDistribution.find(f => f.format === 'tiff');
      
      expect(jpegDistribution).toBeDefined();
      expect(jpegDistribution!.count).toBe(1);
      
      expect(tiffDistribution).toBeDefined();
      expect(tiffDistribution!.count).toBe(2);
    });

    it('should analyze method effectiveness', () => {
      const patterns = service.getRejectionPatterns();
      
      expect(patterns.methodEffectiveness.length).toBeGreaterThan(0);
      
      const mimeTypeMethod = patterns.methodEffectiveness.find(m => m.method === 'mime-type');
      const urlExtensionMethod = patterns.methodEffectiveness.find(m => m.method === 'url-extension');
      
      expect(mimeTypeMethod).toBeDefined();
      expect(urlExtensionMethod).toBeDefined();
      
      // MIME type method: 1 success out of 4 total = 25% success rate
      expect(mimeTypeMethod!.successRate).toBeCloseTo(25, 1);
      
      // URL extension method: 1 success out of 2 total = 50% success rate
      expect(urlExtensionMethod!.successRate).toBeCloseTo(50, 1);
    });

    it('should calculate average confidence correctly', () => {
      const patterns = service.getRejectionPatterns();
      
      const mimeTypeMethod = patterns.methodEffectiveness.find(m => m.method === 'mime-type');
      expect(mimeTypeMethod).toBeDefined();
      
      // MIME type method: (0.9 + 0.8 + 0.8 + 0.9) / 4 = 0.85
      expect(mimeTypeMethod!.avgConfidence).toBeCloseTo(0.85, 2);
    });

    it('should sort results by relevance', () => {
      const patterns = service.getRejectionPatterns();
      
      // Common reasons should be sorted by count (descending)
      for (let i = 0; i < patterns.commonReasons.length - 1; i++) {
        expect(patterns.commonReasons[i].count).toBeGreaterThanOrEqual(patterns.commonReasons[i + 1].count);
      }
      
      // Format distribution should be sorted by count (descending)
      for (let i = 0; i < patterns.formatDistribution.length - 1; i++) {
        expect(patterns.formatDistribution[i].count).toBeGreaterThanOrEqual(patterns.formatDistribution[i + 1].count);
      }
      
      // Method effectiveness should be sorted by success rate (descending)
      for (let i = 0; i < patterns.methodEffectiveness.length - 1; i++) {
        expect(patterns.methodEffectiveness[i].successRate).toBeGreaterThanOrEqual(patterns.methodEffectiveness[i + 1].successRate);
      }
    });
  });

  describe('Console Logging Integration', () => {
    let consoleSpy: jasmine.Spy;
    let consoleWarnSpy: jasmine.Spy;
    let consoleErrorSpy: jasmine.Spy;

    beforeEach(() => {
      consoleSpy = spyOn(console, 'log');
      consoleWarnSpy = spyOn(console, 'warn');
      consoleErrorSpy = spyOn(console, 'error');
    });

    it('should log successful validations to console', () => {
      const result: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        detectedMimeType: 'image/jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      service.logSuccess('https://example.com/photo.jpg', result, 50);

      expect(consoleSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*ACCEPTED/),
        jasmine.objectContaining({
          result: 'ACCEPTED',
          format: 'jpeg',
          method: 'mime-type',
          confidence: 0.9,
          time: '50ms'
        })
      );
    });

    it('should log rejections to console as warnings', () => {
      const result: FormatValidationResult = {
        isValid: false,
        detectedFormat: 'tiff',
        detectedMimeType: 'image/tiff',
        confidence: 0.8,
        detectionMethod: 'mime-type',
        rejectionReason: 'Limited browser support'
      };

      service.logRejection('https://example.com/photo.tiff', result, 30);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*REJECTED/),
        jasmine.objectContaining({
          result: 'REJECTED',
          format: 'tiff',
          method: 'mime-type',
          confidence: 0.8,
          time: '30ms',
          reason: 'Limited browser support'
        })
      );
    });

    it('should log errors to console as errors', () => {
      const error = new Error('Network connection failed');
      service.logError('https://example.com/photo.jpg', error, 100, 'http-content-type');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*ERROR/),
        jasmine.objectContaining({
          result: 'REJECTED',
          error: 'Network connection failed',
          errorType: 'Error'
        })
      );
    });

    it('should handle unknown formats in console logging', () => {
      const result: FormatValidationResult = {
        isValid: false,
        confidence: 0.0,
        detectionMethod: 'unknown',
        rejectionReason: 'Unable to determine format'
      };

      service.logRejection('https://example.com/photo.unknown', result, 25);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*REJECTED/),
        jasmine.objectContaining({
          result: 'REJECTED',
          format: 'unknown',
          reason: 'Unable to determine format'
        })
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle logging with minimal data', () => {
      const result: FormatValidationResult = {
        isValid: false,
        confidence: 0.0,
        detectionMethod: 'unknown'
      };

      expect(() => {
        service.logValidation('https://example.com/photo.jpg', result, 10);
      }).not.toThrow();

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].detectedFormat).toBeUndefined();
      expect(logs[0].rejectionReason).toBeUndefined();
    });

    it('should handle logging with null/undefined values', () => {
      const result: FormatValidationResult = {
        isValid: true,
        detectedFormat: undefined,
        detectedMimeType: undefined,
        confidence: 0.5,
        detectionMethod: 'test',
        rejectionReason: undefined
      };

      expect(() => {
        service.logValidation('https://example.com/photo.jpg', result, 10);
      }).not.toThrow();

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].detectedFormat).toBeUndefined();
      expect(logs[0].detectedMimeType).toBeUndefined();
      expect(logs[0].rejectionReason).toBeUndefined();
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Simple error');
      error.stack = undefined;

      expect(() => {
        service.logError('https://example.com/photo.jpg', error, 50, 'test-method');
      }).not.toThrow();

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].errorDetails).toBeDefined();
      expect(logs[0].errorDetails!.stackTrace).toBeUndefined();
    });

    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000) + '.jpg';
      const result: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      expect(() => {
        service.logSuccess(longUrl, result, 10);
      }).not.toThrow();

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe(longUrl);
    });

    it('should handle extreme validation times', () => {
      const result: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      // Very fast validation
      service.logSuccess('https://example.com/photo1.jpg', result, 0);
      
      // Very slow validation
      service.logSuccess('https://example.com/photo2.jpg', result, 30000);

      const logs = service.getRecentLogs(2);
      expect(logs[0].validationTime).toBe(0);
      expect(logs[1].validationTime).toBe(30000);

      const stats = service.getStats();
      expect(stats.averageValidationTime).toBe(15000);
    });

    it('should maintain statistics consistency after clearing logs', () => {
      // Add some logs
      for (let i = 0; i < 5; i++) {
        const result: FormatValidationResult = {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.7,
          detectionMethod: 'url-extension'
        };
        service.logSuccess(`https://example.com/photo${i}.jpg`, result, 10);
      }

      // Verify stats are populated
      let stats = service.getStats();
      expect(stats.totalValidations).toBe(5);

      // Clear logs
      service.clearLogs();

      // Verify stats are reset
      stats = service.getStats();
      expect(stats.totalValidations).toBe(0);
      expect(stats.successfulValidations).toBe(0);
      expect(stats.rejectedValidations).toBe(0);
      expect(stats.errorValidations).toBe(0);
      expect(stats.averageValidationTime).toBe(0);
      expect(Object.keys(stats.formatDistribution).length).toBe(0);
      expect(Object.keys(stats.rejectionReasons).length).toBe(0);
      expect(Object.keys(stats.detectionMethods).length).toBe(0);
    });
  });
});