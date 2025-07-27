import { TestBed } from '@angular/core/testing';
import { FormatValidationLoggerService, FormatValidationLog } from './format-validation-logger.service';
import { FormatValidationResult } from './format-validation.service';

describe('FormatValidationLoggerService', () => {
  let service: FormatValidationLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormatValidationLoggerService]
    });
    service = TestBed.inject(FormatValidationLoggerService);
  });

  afterEach(() => {
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
      const validationTime = 150;

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
      expect(logs[0].errorDetails).toBeUndefined();
    });

    it('should log validation rejection', () => {
      const url = 'https://example.com/photo.tiff';
      const result: FormatValidationResult = {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      };
      const validationTime = 75;

      service.logRejection(url, result, validationTime);

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe(url);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].detectedFormat).toBe('tiff');
      expect(logs[0].rejectionReason).toBe('Limited browser support');
      expect(logs[0].validationTime).toBe(validationTime);
      expect(logs[0].detectionMethod).toBe('url-extension');
      expect(logs[0].confidence).toBe(0.8);
      expect(logs[0].errorDetails).toBeUndefined();
    });

    it('should log validation error with error details', () => {
      const url = 'https://example.com/photo.jpg';
      const error = new Error('Network connection failed');
      const validationTime = 5000;
      const detectionMethod = 'http-content-type';

      service.logError(url, error, validationTime, detectionMethod);

      const logs = service.getRecentLogs(1);
      expect(logs.length).toBe(1);
      expect(logs[0].photoUrl).toBe(url);
      expect(logs[0].validationResult).toBe(false);
      expect(logs[0].validationTime).toBe(validationTime);
      expect(logs[0].detectionMethod).toBe(detectionMethod);
      expect(logs[0].confidence).toBe(0.0);
      expect(logs[0].rejectionReason).toBe('Error during validation: Network connection failed');
      expect(logs[0].errorDetails).toBeDefined();
      expect(logs[0].errorDetails!.errorType).toBe('Error');
      expect(logs[0].errorDetails!.errorMessage).toBe('Network connection failed');
      expect(logs[0].errorDetails!.stackTrace).toBeDefined();
    });

    it('should log network error with metadata', () => {
      const url = 'https://example.com/photo.jpg';
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

  describe('Statistics Tracking', () => {
    it('should track basic statistics', () => {
      // Log successful validation
      service.logSuccess('https://example.com/photo1.jpg', {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 100);

      // Log rejection
      service.logRejection('https://example.com/photo2.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      }, 50);

      // Log error
      service.logError('https://example.com/photo3.jpg', new Error('Network error'), 200, 'http-content-type');

      const stats = service.getStats();
      expect(stats.totalValidations).toBe(3);
      expect(stats.successfulValidations).toBe(1);
      expect(stats.rejectedValidations).toBe(1);
      expect(stats.errorValidations).toBe(1);
      expect(stats.averageValidationTime).toBe((100 + 50 + 200) / 3);
    });

    it('should track format distribution', () => {
      service.logSuccess('https://example.com/photo1.jpg', {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 100);

      service.logSuccess('https://example.com/photo2.png', {
        isValid: true,
        detectedFormat: 'png',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      }, 75);

      service.logRejection('https://example.com/photo3.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      }, 60);

      const stats = service.getStats();
      expect(stats.formatDistribution['jpeg']).toBe(1);
      expect(stats.formatDistribution['png']).toBe(1);
      expect(stats.formatDistribution['tiff']).toBe(1);
    });

    it('should track rejection reasons', () => {
      service.logRejection('https://example.com/photo1.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      }, 50);

      service.logRejection('https://example.com/photo2.gif', {
        isValid: false,
        detectedFormat: 'gif',
        rejectionReason: 'Avoid animated content',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 75);

      service.logRejection('https://example.com/photo3.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      }, 60);

      const stats = service.getStats();
      expect(stats.rejectionReasons['Limited browser support']).toBe(2);
      expect(stats.rejectionReasons['Avoid animated content']).toBe(1);
    });

    it('should track detection methods', () => {
      service.logSuccess('https://example.com/photo1.jpg', {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 100);

      service.logSuccess('https://example.com/photo2.png', {
        isValid: true,
        detectedFormat: 'png',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      }, 75);

      service.logError('https://example.com/photo3.jpg', new Error('Network error'), 200, 'http-content-type');

      const stats = service.getStats();
      expect(stats.detectionMethods['mime-type']).toBe(1);
      expect(stats.detectionMethods['url-extension']).toBe(1);
      expect(stats.detectionMethods['http-content-type']).toBe(1);
    });

    it('should track network and timeout errors', () => {
      // Network error
      service.logNetworkError('https://example.com/photo1.jpg', new Error('Network error'), 200, false, 500);
      
      // Timeout error
      service.logNetworkError('https://example.com/photo2.jpg', new Error('Timeout'), 5000, true, 0);

      const stats = service.getStats();
      expect(stats.networkErrors).toBe(2);
      expect(stats.timeoutErrors).toBe(1);
    });
  });

  describe('Log Filtering and Querying', () => {
    beforeEach(() => {
      // Set up test data
      service.logSuccess('https://example.com/photo1.jpg', {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 100);

      service.logRejection('https://example.com/photo2.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      }, 50);

      service.logError('https://example.com/photo3.jpg', new Error('Network error'), 200, 'http-content-type');
    });

    it('should filter logs by validation result', () => {
      const successLogs = service.getFilteredLogs({ validationResult: true });
      const failureLogs = service.getFilteredLogs({ validationResult: false });

      expect(successLogs.length).toBe(1);
      expect(successLogs[0].photoUrl).toBe('https://example.com/photo1.jpg');

      expect(failureLogs.length).toBe(2);
      expect(failureLogs.map(log => log.photoUrl)).toContain('https://example.com/photo2.tiff');
      expect(failureLogs.map(log => log.photoUrl)).toContain('https://example.com/photo3.jpg');
    });

    it('should filter logs by detection method', () => {
      const mimeTypeLogs = service.getFilteredLogs({ detectionMethod: 'mime-type' });
      const urlExtensionLogs = service.getFilteredLogs({ detectionMethod: 'url-extension' });

      expect(mimeTypeLogs.length).toBe(1);
      expect(mimeTypeLogs[0].photoUrl).toBe('https://example.com/photo1.jpg');

      expect(urlExtensionLogs.length).toBe(1);
      expect(urlExtensionLogs[0].photoUrl).toBe('https://example.com/photo2.tiff');
    });

    it('should filter logs by error presence', () => {
      const errorLogs = service.getFilteredLogs({ hasError: true });
      const nonErrorLogs = service.getFilteredLogs({ hasError: false });

      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].photoUrl).toBe('https://example.com/photo3.jpg');

      expect(nonErrorLogs.length).toBe(2);
    });

    it('should filter logs by confidence range', () => {
      const highConfidenceLogs = service.getFilteredLogs({ minConfidence: 0.85 });
      const lowConfidenceLogs = service.getFilteredLogs({ maxConfidence: 0.5 });

      expect(highConfidenceLogs.length).toBe(1);
      expect(highConfidenceLogs[0].confidence).toBe(0.9);

      expect(lowConfidenceLogs.length).toBe(1);
      expect(lowConfidenceLogs[0].confidence).toBe(0.0); // Error log
    });

    it('should filter logs by timestamp', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      const recentLogs = service.getFilteredLogs({ since: oneMinuteAgo });
      expect(recentLogs.length).toBe(3); // All logs should be recent

      const futureLogs = service.getFilteredLogs({ since: new Date(now.getTime() + 60000) });
      expect(futureLogs.length).toBe(0);
    });
  });

  describe('Rejection Pattern Analysis', () => {
    beforeEach(() => {
      // Set up diverse test data
      service.logRejection('https://example.com/photo1.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      }, 50);

      service.logRejection('https://example.com/photo2.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.7,
        detectionMethod: 'mime-type'
      }, 60);

      service.logRejection('https://example.com/photo3.gif', {
        isValid: false,
        detectedFormat: 'gif',
        rejectionReason: 'Avoid animated content',
        confidence: 0.9,
        detectionMethod: 'url-extension'
      }, 40);

      service.logSuccess('https://example.com/photo4.jpg', {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 100);

      service.logError('https://example.com/photo5.jpg', new Error('Network error'), 200, 'http-content-type');
    });

    it('should analyze common rejection reasons', () => {
      const patterns = service.getRejectionPatterns();

      expect(patterns.commonReasons.length).toBe(2);
      expect(patterns.commonReasons[0].reason).toBe('Limited browser support');
      expect(patterns.commonReasons[0].count).toBe(2);
      expect(patterns.commonReasons[0].percentage).toBe(40); // 2 out of 5 total validations

      expect(patterns.commonReasons[1].reason).toBe('Avoid animated content');
      expect(patterns.commonReasons[1].count).toBe(1);
      expect(patterns.commonReasons[1].percentage).toBe(20); // 1 out of 5 total validations
    });

    it('should analyze format distribution', () => {
      const patterns = service.getRejectionPatterns();

      expect(patterns.formatDistribution.length).toBe(3);
      
      const tiffEntry = patterns.formatDistribution.find(entry => entry.format === 'tiff');
      expect(tiffEntry?.count).toBe(2);
      expect(tiffEntry?.percentage).toBe(40);

      const gifEntry = patterns.formatDistribution.find(entry => entry.format === 'gif');
      expect(gifEntry?.count).toBe(1);
      expect(gifEntry?.percentage).toBe(20);

      const jpegEntry = patterns.formatDistribution.find(entry => entry.format === 'jpeg');
      expect(jpegEntry?.count).toBe(1);
      expect(jpegEntry?.percentage).toBe(20);
    });

    it('should analyze method effectiveness', () => {
      const patterns = service.getRejectionPatterns();

      expect(patterns.methodEffectiveness.length).toBe(3);

      const mimeTypeMethod = patterns.methodEffectiveness.find(method => method.method === 'mime-type');
      expect(mimeTypeMethod?.successRate).toBe(50); // 1 success out of 2 attempts
      expect(mimeTypeMethod?.avgConfidence).toBe(0.8); // (0.7 + 0.9) / 2

      const urlExtensionMethod = patterns.methodEffectiveness.find(method => method.method === 'url-extension');
      expect(urlExtensionMethod?.successRate).toBe(0); // 0 success out of 2 attempts
      expect(urlExtensionMethod?.avgConfidence).toBe(0.85); // (0.8 + 0.9) / 2

      const httpMethod = patterns.methodEffectiveness.find(method => method.method === 'http-content-type');
      expect(httpMethod?.successRate).toBe(0); // 0 success out of 1 attempt (error)
      expect(httpMethod?.avgConfidence).toBe(0.0); // Error has 0 confidence
    });
  });

  describe('Memory Management', () => {
    it('should limit log entries to prevent memory leaks', () => {
      // Add more than MAX_LOG_ENTRIES (1000) logs
      for (let i = 0; i < 1100; i++) {
        service.logSuccess(`https://example.com/photo${i}.jpg`, {
          isValid: true,
          detectedFormat: 'jpeg',
          confidence: 0.9,
          detectionMethod: 'mime-type'
        }, 100);
      }

      const logs = service.getRecentLogs(2000); // Request more than available
      expect(logs.length).toBeLessThanOrEqual(1000); // Should be capped at MAX_LOG_ENTRIES
    });

    it('should clear logs and reset statistics', () => {
      service.logSuccess('https://example.com/photo.jpg', {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 100);

      expect(service.getRecentLogs().length).toBe(1);
      expect(service.getStats().totalValidations).toBe(1);

      service.clearLogs();

      expect(service.getRecentLogs().length).toBe(0);
      expect(service.getStats().totalValidations).toBe(0);
    });
  });

  describe('Console Logging', () => {
    let consoleSpy: jasmine.Spy;

    beforeEach(() => {
      consoleSpy = spyOn(console, 'log');
      spyOn(console, 'warn');
      spyOn(console, 'error');
    });

    it('should log successful validation to console', () => {
      service.logSuccess('https://example.com/photo.jpg', {
        isValid: true,
        detectedFormat: 'jpeg',
        detectedMimeType: 'image/jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      }, 100);

      expect(console.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*ACCEPTED/),
        jasmine.objectContaining({
          result: 'ACCEPTED',
          format: 'jpeg',
          method: 'mime-type',
          confidence: 0.9,
          time: '100ms'
        })
      );
    });

    it('should log rejection to console as warning', () => {
      service.logRejection('https://example.com/photo.tiff', {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.8,
        detectionMethod: 'url-extension'
      }, 50);

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*REJECTED/),
        jasmine.objectContaining({
          result: 'REJECTED',
          format: 'tiff',
          method: 'url-extension',
          confidence: 0.8,
          time: '50ms',
          reason: 'Limited browser support'
        })
      );
    });

    it('should log error to console as error', () => {
      const error = new Error('Network connection failed');
      service.logError('https://example.com/photo.jpg', error, 200, 'http-content-type');

      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching(/Format validation.*ERROR/),
        jasmine.objectContaining({
          result: 'REJECTED',
          format: 'unknown',
          method: 'http-content-type',
          confidence: 0.0,
          time: '200ms',
          error: 'Network connection failed',
          errorType: 'Error'
        })
      );
    });
  });
});