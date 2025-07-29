import { TestBed } from '@angular/core/testing';
import { PerformanceMonitorService, PerformanceMetric } from './performance-monitor.service';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerformanceMonitorService);
  });

  afterEach(() => {
    service.clearMetrics();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Timing Operations', () => {
    it('should start and end timing correctly', () => {
      const operationId = 'test-operation';
      const operationName = 'Test Operation';
      
      service.startTiming(operationId, 'toggle');
      
      // Simulate some work
      const startTime = performance.now();
      while (performance.now() - startTime < 10) {
        // Wait for at least 10ms
      }
      
      service.endTiming(operationId, operationName);
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(1);
        expect(metrics[0].name).toBe(operationName);
        expect(metrics[0].category).toBe('toggle');
        expect(metrics[0].value).toBeGreaterThan(0);
      });
    });

    it('should handle missing start timer gracefully', () => {
      spyOn(console, 'warn');
      
      service.endTiming('non-existent-operation', 'Test Operation');
      
      expect(console.warn).toHaveBeenCalledWith(
        'Performance timer not found for operation: non-existent-operation'
      );
    });

    it('should record metrics directly', () => {
      const metric: PerformanceMetric = {
        name: 'Direct Metric',
        value: 100,
        timestamp: performance.now(),
        category: 'zoom'
      };
      
      service.recordMetric(metric);
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(1);
        expect(metrics[0]).toEqual(metric);
      });
    });
  });

  describe('Performance Measurement', () => {
    it('should measure synchronous functions', () => {
      const testFunction = jasmine.createSpy('testFunction').and.returnValue('result');
      
      const result = service.measureSync('Test Sync', 'interaction', testFunction);
      
      expect(result).toBe('result');
      expect(testFunction).toHaveBeenCalled();
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(1);
        expect(metrics[0].name).toBe('Test Sync');
        expect(metrics[0].category).toBe('interaction');
      });
    });

    it('should measure asynchronous functions', async () => {
      const testFunction = jasmine.createSpy('testFunction').and.returnValue(
        Promise.resolve('async result')
      );
      
      const result = await service.measureAsync('Test Async', 'image', testFunction);
      
      expect(result).toBe('async result');
      expect(testFunction).toHaveBeenCalled();
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(1);
        expect(metrics[0].name).toBe('Test Async');
        expect(metrics[0].category).toBe('image');
      });
    });

    it('should handle errors in measured functions', async () => {
      const error = new Error('Test error');
      const testFunction = jasmine.createSpy('testFunction').and.returnValue(
        Promise.reject(error)
      );
      
      try {
        await service.measureAsync('Test Error', 'render', testFunction);
        fail('Should have thrown error');
      } catch (e) {
        expect(e).toBe(error);
      }
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(1);
        expect(metrics[0].name).toBe('Test Error');
        expect(metrics[0].metadata?.['error']).toBe('Test error');
      });
    });
  });

  describe('Metrics Analysis', () => {
    beforeEach(() => {
      // Add test metrics
      service.recordTiming('Toggle Operation', 200, 'toggle');
      service.recordTiming('Toggle Operation', 300, 'toggle');
      service.recordTiming('Toggle Operation', 400, 'toggle');
      service.recordTiming('Zoom Operation', 50, 'zoom');
      service.recordTiming('Zoom Operation', 75, 'zoom');
    });

    it('should filter metrics by category', () => {
      const toggleMetrics = service.getMetricsByCategory('toggle');
      const zoomMetrics = service.getMetricsByCategory('zoom');
      
      expect(toggleMetrics.length).toBe(3);
      expect(zoomMetrics.length).toBe(2);
      expect(toggleMetrics.every(m => m.category === 'toggle')).toBe(true);
      expect(zoomMetrics.every(m => m.category === 'zoom')).toBe(true);
    });

    it('should calculate average performance', () => {
      const avgToggle = service.getAveragePerformance('Toggle Operation');
      const avgZoom = service.getAveragePerformance('Zoom Operation');
      
      expect(avgToggle).toBe(300); // (200 + 300 + 400) / 3
      expect(avgZoom).toBe(62.5); // (50 + 75) / 2
    });

    it('should calculate performance percentiles', () => {
      const p50 = service.getPerformancePercentile('Toggle Operation', 50);
      const p90 = service.getPerformancePercentile('Toggle Operation', 90);
      
      expect(p50).toBe(300); // Median
      expect(p90).toBe(400); // 90th percentile
    });

    it('should filter metrics by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      const recentMetrics = service.getMetricsByTimeRange(oneHourAgo, now);
      
      expect(recentMetrics.length).toBe(5); // All metrics should be recent
    });
  });

  describe('Performance Thresholds', () => {
    it('should use default thresholds', () => {
      const thresholds = service.getThresholds();
      
      expect(thresholds.toggleTransition).toBe(500);
      expect(thresholds.imageLoad).toBe(2000);
      expect(thresholds.zoomOperation).toBe(100);
      expect(thresholds.renderTime).toBe(16);
      expect(thresholds.interactionResponse).toBe(100);
    });

    it('should update thresholds', () => {
      service.setThresholds({
        toggleTransition: 200,
        zoomOperation: 50
      });
      
      const thresholds = service.getThresholds();
      
      expect(thresholds.toggleTransition).toBe(200);
      expect(thresholds.zoomOperation).toBe(50);
      expect(thresholds.imageLoad).toBe(2000); // Unchanged
    });

    it('should identify slow operations', () => {
      service.setThresholds({ toggleTransition: 250 });
      
      service.recordTiming('Fast Toggle', 100, 'toggle');
      service.recordTiming('Slow Toggle', 500, 'toggle');
      
      service.slowOperations$.subscribe(slowOps => {
        expect(slowOps.length).toBe(1);
        expect(slowOps[0].name).toBe('Slow Toggle');
      });
    });
  });

  describe('Performance Summary', () => {
    beforeEach(() => {
      service.recordTiming('Toggle A', 200, 'toggle');
      service.recordTiming('Toggle B', 600, 'toggle'); // Slow
      service.recordTiming('Zoom A', 50, 'zoom');
      service.recordTiming('Image Load', 1500, 'image');
    });

    it('should generate performance summary', (done) => {
      service.performanceSummary$.subscribe(summary => {
        if (summary) {
          expect(summary.totalOperations).toBe(4);
          expect(summary.averageToggleTime).toBe(400);
          expect(summary.averageZoomTime).toBe(50);
          expect(summary.averageImageLoadTime).toBe(1500);
          expect(summary.slowOperations.length).toBe(1);
          expect(summary.performanceScore).toBeGreaterThan(0);
          expect(summary.performanceScore).toBeLessThanOrEqual(100);
          done();
        }
      });
    });
  });

  describe('Cache Management', () => {
    it('should maintain metrics history limit', () => {
      const maxMetrics = 1000;
      
      // Add more than the limit
      for (let i = 0; i < maxMetrics + 100; i++) {
        service.recordTiming(`Operation ${i}`, 100, 'interaction');
      }
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(maxMetrics);
      });
    });

    it('should clear all metrics', () => {
      service.recordTiming('Test', 100, 'toggle');
      
      service.clearMetrics();
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(0);
      });
      
      service.performanceSummary$.subscribe(summary => {
        expect(summary).toBeNull();
      });
    });
  });

  describe('Enable/Disable Monitoring', () => {
    it('should disable monitoring when requested', () => {
      service.setEnabled(false);
      
      expect(service.isMonitoringEnabled()).toBe(false);
      
      service.recordTiming('Test', 100, 'toggle');
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(0);
      });
    });

    it('should re-enable monitoring', () => {
      service.setEnabled(false);
      service.setEnabled(true);
      
      expect(service.isMonitoringEnabled()).toBe(true);
      
      service.recordTiming('Test', 100, 'toggle');
      
      service.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(1);
      });
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      service.recordTiming('Export Test', 100, 'toggle');
    });

    it('should export performance data', () => {
      const exportData = service.exportData();
      
      expect(exportData.metrics.length).toBe(1);
      expect(exportData.thresholds).toBeDefined();
      expect(exportData.timestamp).toBeGreaterThan(0);
      expect(exportData.summary).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid timing operations gracefully', () => {
      spyOn(console, 'error');
      
      // Try to end a timer that was never started
      service.endTiming('invalid-timer', 'Invalid Operation');
      
      // Should not throw, but should log warning
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle disabled monitoring gracefully', () => {
      service.setEnabled(false);
      
      // These should not throw errors
      service.startTiming('test', 'toggle');
      service.endTiming('test', 'Test');
      service.recordTiming('test', 100, 'toggle');
      
      expect(service.isMonitoringEnabled()).toBe(false);
    });
  });
});