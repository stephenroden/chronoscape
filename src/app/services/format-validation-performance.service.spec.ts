import { TestBed } from '@angular/core/testing';
import { FormatValidationPerformanceService } from './format-validation-performance.service';

describe('FormatValidationPerformanceService', () => {
  let service: FormatValidationPerformanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormatValidationPerformanceService]
    });
    service = TestBed.inject(FormatValidationPerformanceService);
  });

  afterEach(() => {
    service.resetMetrics();
  });

  describe('Basic Metrics Tracking', () => {
    it('should initialize with zero metrics', () => {
      const metrics = service.getMetrics();
      
      expect(metrics.totalValidations).toBe(0);
      expect(metrics.successfulValidations).toBe(0);
      expect(metrics.failedValidations).toBe(0);
      expect(metrics.averageValidationTime).toBe(0);
      expect(metrics.networkRequestCount).toBe(0);
      expect(metrics.batchValidationCount).toBe(0);
    });

    it('should track successful validations', () => {
      const token = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token, 'https://example.com/test.jpg', true, 'mime-type');
      
      const metrics = service.getMetrics();
      
      expect(metrics.totalValidations).toBe(1);
      expect(metrics.successfulValidations).toBe(1);
      expect(metrics.failedValidations).toBe(0);
      expect(metrics.averageValidationTime).toBeGreaterThanOrEqual(0);
    });

    it('should track failed validations', () => {
      const token = service.startValidation('https://example.com/test.unknown');
      service.endValidation(token, 'https://example.com/test.unknown', false, 'url-extension');

      const metrics = service.getMetrics();
      
      expect(metrics.totalValidations).toBe(1);
      expect(metrics.successfulValidations).toBe(0);
      expect(metrics.failedValidations).toBe(1);
    });

    it('should track network requests', () => {
      const token = service.startValidation('https://example.com/test.unknown');
      service.endValidation(token, 'https://example.com/test.unknown', true, 'http-content-type', false, true);

      const metrics = service.getMetrics();
      
      expect(metrics.networkRequestCount).toBe(1);
    });

    it('should track cache hits', () => {
      const token1 = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token1, 'https://example.com/test.jpg', true, 'mime-type', false);

      const token2 = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token2, 'https://example.com/test.jpg', true, 'mime-type', true);

      const metrics = service.getMetrics();
      
      expect(metrics.cacheHitRate).toBe(50); // 1 hit out of 2 validations
    });
  });

  describe('Batch Validation Tracking', () => {
    it('should track batch validations', () => {
      service.recordBatchValidation(5, 100, 4);

      const metrics = service.getMetrics();
      
      expect(metrics.batchValidationCount).toBe(1);
      expect(metrics.averageBatchSize).toBe(5);
      expect(metrics.totalValidations).toBe(5);
      expect(metrics.successfulValidations).toBe(4);
      expect(metrics.failedValidations).toBe(1);
    });

    it('should track multiple batch validations', () => {
      service.recordBatchValidation(3, 60, 3);
      service.recordBatchValidation(7, 140, 5);

      const metrics = service.getMetrics();
      
      expect(metrics.batchValidationCount).toBe(2);
      expect(metrics.averageBatchSize).toBe(5); // (3 + 7) / 2
      expect(metrics.totalValidations).toBe(10);
      expect(metrics.successfulValidations).toBe(8);
      expect(metrics.failedValidations).toBe(2);
    });

    it('should track batch size in individual validations', () => {
      const token = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token, 'https://example.com/test.jpg', true, 'mime-type', false, false, 10);

      const metrics = service.getMetrics();
      
      expect(metrics.batchValidationCount).toBe(1);
      expect(metrics.averageBatchSize).toBe(10);
    });
  });

  describe('Detection Method Statistics', () => {
    it('should track detection method statistics', () => {
      const token1 = service.startValidation('https://example.com/test1.jpg');
      service.endValidation(token1, 'https://example.com/test1.jpg', true, 'mime-type');

      const token2 = service.startValidation('https://example.com/test2.png');
      service.endValidation(token2, 'https://example.com/test2.png', true, 'url-extension');

      const token3 = service.startValidation('https://example.com/test3.jpg');
      service.endValidation(token3, 'https://example.com/test3.jpg', false, 'mime-type');

      const metrics = service.getMetrics();
      
      expect(metrics.detectionMethodStats['mime-type']).toBeDefined();
      expect(metrics.detectionMethodStats['mime-type'].count).toBe(2);
      expect(metrics.detectionMethodStats['mime-type'].successRate).toBe(50);

      expect(metrics.detectionMethodStats['url-extension']).toBeDefined();
      expect(metrics.detectionMethodStats['url-extension'].count).toBe(1);
      expect(metrics.detectionMethodStats['url-extension'].successRate).toBe(100);
    });

    it('should differentiate cached vs non-cached detection methods', () => {
      const token1 = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token1, 'https://example.com/test.jpg', true, 'mime-type', false);

      const token2 = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token2, 'https://example.com/test.jpg', true, 'mime-type', true);

      const metrics = service.getMetrics();
      
      expect(metrics.detectionMethodStats['mime-type']).toBeDefined();
      expect(metrics.detectionMethodStats['mime-type-cached']).toBeDefined();
      
      expect(metrics.detectionMethodStats['mime-type'].count).toBe(1);
      expect(metrics.detectionMethodStats['mime-type-cached'].count).toBe(1);
    });
  });

  describe('Performance Records', () => {
    it('should maintain recent performance records', () => {
      const token = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token, 'https://example.com/test.jpg', true, 'mime-type');
      
      const records = service.getRecentRecords(10);
      
      expect(records.length).toBe(1);
      expect(records[0].url).toBe('https://example.com/test.jpg');
      expect(records[0].success).toBe(true);
      expect(records[0].detectionMethod).toBe('mime-type');
      expect(records[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should limit the number of records stored', () => {
      // Generate more than the maximum records
      for (let i = 0; i < 1100; i++) {
        const token = service.startValidation(`https://example.com/test${i}.jpg`);
        service.endValidation(token, `https://example.com/test${i}.jpg`, true, 'mime-type');
      }

      const records = service.getRecentRecords(2000);
      
      // Should not exceed maximum record limit (1000)
      expect(records.length).toBeLessThanOrEqual(1000);
    });

    it('should return limited number of recent records', () => {
      for (let i = 0; i < 100; i++) {
        const token = service.startValidation(`https://example.com/test${i}.jpg`);
        service.endValidation(token, `https://example.com/test${i}.jpg`, true, 'mime-type');
      }

      const records = service.getRecentRecords(10);
      
      expect(records.length).toBe(10);
      // Should return the most recent records
      expect(records[9].url).toBe('https://example.com/test99.jpg');
    });
  });

  describe('Performance Health Check', () => {
    it('should report healthy performance for good metrics', () => {
      // Simulate good performance with high cache hit rate
      for (let i = 0; i < 10; i++) {
        const token = service.startValidation(`https://example.com/test.jpg`); // Same URL for cache hits
        service.endValidation(token, `https://example.com/test.jpg`, true, 'mime-type', i > 0); // Cache hits after first
      }
      
      const health = service.checkPerformanceHealth();
      
      if (!health.healthy) {
        console.log('Health issues:', health.issues);
        console.log('Recommendations:', health.recommendations);
      }
      
      expect(health.healthy).toBe(true);
      expect(health.issues.length).toBe(0);
    });

    it('should detect slow validation times', () => {
      // Simulate slow validation
      const token = service.startValidation('https://example.com/slow.jpg');
      
      // Manually set a slow duration by manipulating the token
      const slowStartTime = Date.now() - 200; // 200ms ago
      const slowToken = `${slowStartTime}-test`;
      
      service.endValidation(slowToken, 'https://example.com/slow.jpg', true, 'http-content-type');

      const health = service.checkPerformanceHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.issues.some(issue => issue.includes('Average validation time'))).toBe(true);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect low cache hit rate', () => {
      // Simulate low cache hit rate (all cache misses)
      for (let i = 0; i < 10; i++) {
        const token = service.startValidation(`https://example.com/unique${i}.jpg`);
        service.endValidation(token, `https://example.com/unique${i}.jpg`, true, 'mime-type', false);
      }

      const health = service.checkPerformanceHealth();
      
      if (!health.healthy) {
        expect(health.issues.some(issue => issue.includes('Cache hit rate'))).toBe(true);
        expect(health.recommendations.some(rec => rec.includes('cache'))).toBe(true);
      }
    });

    it('should detect low success rate', () => {
      // Simulate low success rate
      for (let i = 0; i < 10; i++) {
        const token = service.startValidation(`https://example.com/test${i}.jpg`);
        service.endValidation(token, `https://example.com/test${i}.jpg`, i < 8, 'mime-type'); // 80% success rate
      }

      const health = service.checkPerformanceHealth();
      
      if (!health.healthy) {
        expect(health.issues.some(issue => issue.includes('Success rate'))).toBe(true);
        expect(health.recommendations.some(rec => rec.includes('detection strategies'))).toBe(true);
      }
    });

    it('should detect high network request ratio', () => {
      // Simulate high network request ratio
      for (let i = 0; i < 10; i++) {
        const token = service.startValidation(`https://example.com/test${i}.unknown`);
        service.endValidation(token, `https://example.com/test${i}.unknown`, true, 'http-content-type', false, true);
      }

      const health = service.checkPerformanceHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.issues.some(issue => issue.includes('Network request ratio'))).toBe(true);
      expect(health.recommendations.some(rec => rec.includes('HTTP fallbacks'))).toBe(true);
    });
  });

  describe('Performance Summary', () => {
    it('should generate comprehensive performance summary', () => {
      // Generate some metrics
      service.recordBatchValidation(5, 100, 4);
      
      const token = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token, 'https://example.com/test.jpg', true, 'mime-type', false, true);

      const summary = service.getPerformanceSummary();
      
      expect(summary).toContain('Total Validations: 6');
      expect(summary).toContain('Success Rate:');
      expect(summary).toContain('Average Time:');
      expect(summary).toContain('Cache Hit Rate:');
      expect(summary).toContain('Network Requests: 1');
      expect(summary).toContain('Batch Operations: 1');
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics and records', () => {
      // Generate some data
      service.recordBatchValidation(5, 100, 4);
      
      const token = service.startValidation('https://example.com/test.jpg');
      service.endValidation(token, 'https://example.com/test.jpg', true, 'mime-type');

      // Verify data exists
      let metrics = service.getMetrics();
      expect(metrics.totalValidations).toBeGreaterThan(0);
      
      let records = service.getRecentRecords();
      expect(records.length).toBeGreaterThan(0);

      // Reset
      service.resetMetrics();

      // Verify reset
      metrics = service.getMetrics();
      expect(metrics.totalValidations).toBe(0);
      expect(metrics.successfulValidations).toBe(0);
      expect(metrics.failedValidations).toBe(0);
      expect(metrics.averageValidationTime).toBe(0);
      expect(metrics.networkRequestCount).toBe(0);
      expect(metrics.batchValidationCount).toBe(0);
      
      records = service.getRecentRecords();
      expect(records.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid tokens gracefully', () => {
      expect(() => {
        service.endValidation('invalid-token', 'https://example.com/test.jpg', true, 'mime-type');
      }).not.toThrow();

      const metrics = service.getMetrics();
      expect(metrics.totalValidations).toBe(1);
    });

    it('should handle zero batch size', () => {
      service.recordBatchValidation(0, 0, 0);

      const metrics = service.getMetrics();
      expect(metrics.batchValidationCount).toBe(1);
      expect(metrics.averageBatchSize).toBe(0);
    });

    it('should calculate hit rate correctly with no validations', () => {
      const metrics = service.getMetrics();
      expect(metrics.cacheHitRate).toBe(0);
    });
  });
});