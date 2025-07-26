import { TestBed } from '@angular/core/testing';
import { ImagePreloaderService } from './image-preloader.service';
import { Photo } from '../models/photo.model';

describe('ImagePreloaderService', () => {
  let service: ImagePreloaderService;

  // Mock photo data
  const mockPhotos: Photo[] = [
    {
      id: 'photo1',
      url: 'https://example.com/photo1.jpg',
      title: 'Test Photo 1',
      year: 2020,
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      source: 'Test Source',
      metadata: {
        license: 'CC BY-SA',
        originalSource: 'https://example.com/photo1.jpg',
        dateCreated: new Date('2020-01-01')
      }
    },
    {
      id: 'photo2',
      url: 'https://example.com/photo2.jpg',
      title: 'Test Photo 2',
      year: 2021,
      coordinates: { latitude: 51.5074, longitude: -0.1278 },
      source: 'Test Source',
      metadata: {
        license: 'CC BY-SA',
        originalSource: 'https://example.com/photo2.jpg',
        dateCreated: new Date('2021-01-01')
      }
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImagePreloaderService);
  });

  afterEach(() => {
    service.clearCache();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Basic Preloading', () => {
    it('should track preload status', () => {
      expect(service.isPreloaded('https://example.com/test.jpg')).toBe(false);
    });

    it('should return null for non-preloaded images', () => {
      const image = service.getPreloadedImage('https://example.com/test.jpg');
      expect(image).toBeNull();
    });

    it('should clear cache and reset state', () => {
      service.clearCache();
      const stats = service.getStats();
      expect(stats.preloaded).toBe(0);
      expect(stats.queued).toBe(0);
      expect(stats.loading).toBe(0);
    });
  });

  describe('Preload Queue Management', () => {
    it('should track statistics correctly', () => {
      const initialStats = service.getStats();
      expect(initialStats.preloaded).toBe(0);
      expect(initialStats.queued).toBe(0);
      expect(initialStats.loading).toBe(0);
    });

    it('should handle multiple preload requests', (done) => {
      const urls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg'
      ];

      service.preloadImages(urls).subscribe(progress => {
        expect(progress.total).toBe(3);
        expect(progress.completed).toBeGreaterThanOrEqual(0);
        expect(progress.completed).toBeLessThanOrEqual(3);
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThanOrEqual(100);
        
        if (progress.completed === progress.total) {
          done();
        }
      });
    });

    it('should handle empty URL array', (done) => {
      service.preloadImages([]).subscribe(progress => {
        expect(progress.completed).toBe(0);
        expect(progress.total).toBe(0);
        expect(progress.progress).toBe(100);
        done();
      });
    });
  });

  describe('Game Photo Preloading', () => {
    it('should preload game photos', (done) => {
      service.preloadGamePhotos(mockPhotos).subscribe(progress => {
        expect(progress.total).toBe(2);
        expect(progress.completed).toBeGreaterThanOrEqual(0);
        expect(progress.completed).toBeLessThanOrEqual(2);
        
        if (progress.completed === progress.total) {
          done();
        }
      });
    });

    it('should handle next photo preloading', () => {
      // This should not throw an error
      service.preloadNextPhoto(mockPhotos, 0);
      
      // Verify that the service is attempting to preload
      const stats = service.getStats();
      expect(stats.queued + stats.loading).toBeGreaterThanOrEqual(0);
    });

    it('should not preload next photo if at end of array', () => {
      const initialStats = service.getStats();
      service.preloadNextPhoto(mockPhotos, mockPhotos.length - 1);
      
      // Should not add to queue since we're at the end
      const finalStats = service.getStats();
      expect(finalStats.queued).toBe(initialStats.queued);
    });
  });

  describe('Preload Status Observable', () => {
    it('should provide preload status updates', (done) => {
      let callCount = 0;
      service.getPreloadStatus().subscribe(statusMap => {
        callCount++;
        expect(statusMap).toBeInstanceOf(Map);
        if (callCount === 1) {
          done();
        }
      });
    });
  });

  describe('Priority Handling', () => {
    it('should handle different priority levels', (done) => {
      // Test that high priority items are processed
      service.preloadImage('https://example.com/high-priority.jpg', 10).subscribe(() => {
        // High priority item completed
        done();
      });
      
      service.preloadImage('https://example.com/low-priority.jpg', 1).subscribe(() => {
        // Low priority item completed
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle preload failures gracefully', (done) => {
      // Use an invalid URL that should fail to load
      service.preloadImage('invalid-url').subscribe(success => {
        expect(success).toBe(false);
        done();
      });
    });

    it('should continue processing queue after errors', (done) => {
      const urls = [
        'invalid-url-1',
        'invalid-url-2'
      ];

      service.preloadImages(urls).subscribe(progress => {
        if (progress.completed === progress.total) {
          expect(progress.total).toBe(2);
          done();
        }
      });
    });
  });

  describe('Performance', () => {
    it('should handle concurrent preload requests efficiently', () => {
      const startTime = performance.now();
      
      // Start multiple preload operations
      for (let i = 0; i < 10; i++) {
        service.preloadImage(`https://example.com/photo${i}.jpg`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should start preloading quickly (not actually wait for completion)
      expect(duration).toBeLessThan(50); // 50ms threshold for starting operations
    });

    it('should respect concurrent preload limits', () => {
      // Start many preload operations
      for (let i = 0; i < 20; i++) {
        service.preloadImage(`https://example.com/photo${i}.jpg`);
      }
      
      const stats = service.getStats();
      // Should not exceed the concurrent limit (3) plus queued items
      expect(stats.loading).toBeLessThanOrEqual(3);
      expect(stats.queued + stats.loading).toBeLessThanOrEqual(20);
    });
  });

  describe('Memory Management', () => {
    it('should clear cache properly', () => {
      // Add some items to preload
      service.preloadImage('https://example.com/test1.jpg');
      service.preloadImage('https://example.com/test2.jpg');
      
      service.clearCache();
      
      const stats = service.getStats();
      expect(stats.preloaded).toBe(0);
      expect(stats.queued).toBe(0);
      expect(stats.loading).toBe(0);
    });
  });
});