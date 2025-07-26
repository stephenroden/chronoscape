import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PhotoService } from './photo.service';
import { CacheService } from './cache.service';
import { ImagePreloaderService } from './image-preloader.service';
import { MapService } from './map.service';
import { Photo } from '../models/photo.model';

/**
 * Performance tests to validate loading time requirements
 * Requirement 7.3, 7.4: Performance optimization and loading time validation
 */
describe('Performance Tests', () => {
  let photoService: PhotoService;
  let cacheService: CacheService;
  let imagePreloader: ImagePreloaderService;
  let mapService: MapService;
  let httpMock: HttpTestingController;

  const mockPhoto: Photo = {
    id: 'test-photo',
    url: 'https://example.com/test.jpg',
    title: 'Test Photo',
    year: 2020,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'Test Source',
    metadata: {
      license: 'CC BY-SA',
      originalSource: 'https://example.com/test.jpg',
      dateCreated: new Date('2020-01-01')
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PhotoService, CacheService, ImagePreloaderService, MapService]
    });

    photoService = TestBed.inject(PhotoService);
    cacheService = TestBed.inject(CacheService);
    imagePreloader = TestBed.inject(ImagePreloaderService);
    mapService = TestBed.inject(MapService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    cacheService.clear();
    imagePreloader.clearCache();
  });

  describe('Photo Loading Performance', () => {
    it('should load photos within 3 seconds (Requirement 7.4)', (done) => {
      const startTime = performance.now();
      
      photoService.fetchRandomPhotos(5).subscribe(photos => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        // Should load within 3000ms (3 seconds) as per requirement
        expect(loadTime).toBeLessThan(3000);
        done();
      });

      // Mock the API responses to simulate realistic timing
      const requests = httpMock.match(() => true);
      requests.forEach(req => {
        // Simulate network delay
        setTimeout(() => {
          req.flush({
            query: {
              geosearch: [
                { title: 'File:Test1.jpg' },
                { title: 'File:Test2.jpg' }
              ],
              pages: {
                '1': {
                  title: 'File:Test1.jpg',
                  imageinfo: [{
                    url: 'https://example.com/test1.jpg',
                    extmetadata: {
                      DateTime: { value: '2020-01-01' },
                      GPSLatitude: { value: '40.7128' },
                      GPSLongitude: { value: '-74.0060' }
                    }
                  }]
                }
              }
            }
          });
        }, 100); // 100ms simulated network delay
      });
    });

    it('should benefit from caching on subsequent requests', (done) => {
      // First request
      const firstStartTime = performance.now();
      
      photoService.fetchRandomPhotos(5).subscribe(() => {
        const firstEndTime = performance.now();
        const firstLoadTime = firstEndTime - firstStartTime;
        
        // Second request (should be faster due to caching)
        const secondStartTime = performance.now();
        
        photoService.fetchRandomPhotos(5).subscribe(() => {
          const secondEndTime = performance.now();
          const secondLoadTime = secondEndTime - secondStartTime;
          
          // Second request should be significantly faster
          expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.5);
          done();
        });

        // Second request should hit cache, no HTTP calls expected
      });

      // Mock first request
      const requests = httpMock.match(() => true);
      requests.forEach(req => {
        req.flush({
          query: {
            geosearch: [{ title: 'File:Test1.jpg' }],
            pages: {
              '1': {
                title: 'File:Test1.jpg',
                imageinfo: [{
                  url: 'https://example.com/test1.jpg',
                  extmetadata: {
                    DateTime: { value: '2020-01-01' },
                    GPSLatitude: { value: '40.7128' },
                    GPSLongitude: { value: '-74.0060' }
                  }
                }]
              }
            }
          }
        });
      });
    });
  });

  describe('Cache Performance', () => {
    it('should provide sub-millisecond cache retrieval', () => {
      const testData = { large: 'data'.repeat(1000) };
      cacheService.set('test-key', testData);
      
      const startTime = performance.now();
      const result = cacheService.get('test-key');
      const endTime = performance.now();
      
      const retrievalTime = endTime - startTime;
      
      expect(result).toEqual(testData);
      expect(retrievalTime).toBeLessThan(1); // Sub-millisecond retrieval
    });

    it('should handle large cache operations efficiently', () => {
      const startTime = performance.now();
      
      // Store 1000 items
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`key-${i}`, { data: `value-${i}` });
      }
      
      // Retrieve all items
      for (let i = 0; i < 1000; i++) {
        cacheService.get(`key-${i}`);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle 2000 operations (1000 sets + 1000 gets) in under 100ms
      expect(totalTime).toBeLessThan(100);
    });

    it('should maintain good hit rate under load', () => {
      // Fill cache with data
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key-${i}`, `value-${i}`);
      }
      
      // Access items multiple times
      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < 100; i++) {
          cacheService.get(`key-${i}`);
        }
      }
      
      const stats = cacheService.getStats();
      const hitRate = stats.hitRate;
      
      // Should maintain high hit rate
      expect(hitRate).toBeGreaterThan(90); // 90% hit rate
    });
  });

  describe('Image Preloading Performance', () => {
    it('should start preloading operations quickly', () => {
      const startTime = performance.now();
      
      // Start preloading multiple images
      const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/photo${i}.jpg`);
      
      imagePreloader.preloadImages(urls).subscribe();
      
      const endTime = performance.now();
      const startupTime = endTime - startTime;
      
      // Should start preloading operations within 10ms
      expect(startupTime).toBeLessThan(10);
    });

    it('should respect concurrent loading limits', () => {
      // Start many preload operations
      for (let i = 0; i < 50; i++) {
        imagePreloader.preloadImage(`https://example.com/photo${i}.jpg`);
      }
      
      const stats = imagePreloader.getStats();
      
      // Should not exceed concurrent limit (typically 3)
      expect(stats.loading).toBeLessThanOrEqual(3);
      expect(stats.queued).toBeGreaterThan(0); // Remaining should be queued
    });

    it('should handle preload queue efficiently', () => {
      const startTime = performance.now();
      
      // Add many items to preload queue
      for (let i = 0; i < 100; i++) {
        imagePreloader.preloadImage(`https://example.com/photo${i}.jpg`);
      }
      
      const endTime = performance.now();
      const queueTime = endTime - startTime;
      
      // Should queue 100 items quickly
      expect(queueTime).toBeLessThan(50); // 50ms threshold
    });
  });

  describe('Map Performance', () => {
    it('should initialize map quickly', () => {
      // Create a mock container element
      const container = document.createElement('div');
      container.id = 'test-map';
      document.body.appendChild(container);
      
      const startTime = performance.now();
      
      try {
        mapService.initializeMap('test-map');
        const endTime = performance.now();
        const initTime = endTime - startTime;
        
        // Map should initialize within 100ms
        expect(initTime).toBeLessThan(100);
      } finally {
        document.body.removeChild(container);
        mapService.destroy();
      }
    });

    it('should handle pin operations efficiently', () => {
      const container = document.createElement('div');
      container.id = 'test-map';
      document.body.appendChild(container);
      
      try {
        mapService.initializeMap('test-map');
        
        const startTime = performance.now();
        
        // Add and remove pins multiple times
        for (let i = 0; i < 100; i++) {
          mapService.addPin({ latitude: 40 + i * 0.01, longitude: -74 + i * 0.01 });
          mapService.removePin();
        }
        
        const endTime = performance.now();
        const pinTime = endTime - startTime;
        
        // 200 pin operations should complete within 200ms
        expect(pinTime).toBeLessThan(200);
      } finally {
        document.body.removeChild(container);
        mapService.destroy();
      }
    });

    it('should calculate distances efficiently', () => {
      const point1 = { latitude: 40.7128, longitude: -74.0060 };
      const point2 = { latitude: 51.5074, longitude: -0.1278 };
      
      const startTime = performance.now();
      
      // Calculate distance many times
      for (let i = 0; i < 10000; i++) {
        mapService.calculateDistance(point1, point2);
      }
      
      const endTime = performance.now();
      const calcTime = endTime - startTime;
      
      // 10,000 distance calculations should complete within 50ms
      expect(calcTime).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during cache operations', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform many cache operations
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`key-${i}`, { data: 'x'.repeat(1000) });
      }
      
      // Clear cache
      cacheService.clear();
      
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory usage should not increase significantly after clearing
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
      }
    });

    it('should clean up image preloader resources', () => {
      // Start many preload operations
      for (let i = 0; i < 100; i++) {
        imagePreloader.preloadImage(`https://example.com/photo${i}.jpg`);
      }
      
      const statsBeforeClear = imagePreloader.getStats();
      expect(statsBeforeClear.queued + statsBeforeClear.loading).toBeGreaterThan(0);
      
      // Clear cache
      imagePreloader.clearCache();
      
      const statsAfterClear = imagePreloader.getStats();
      expect(statsAfterClear.preloaded).toBe(0);
      expect(statsAfterClear.queued).toBe(0);
      expect(statsAfterClear.loading).toBe(0);
    });
  });

  describe('Integration Performance', () => {
    it('should handle complete photo loading workflow efficiently', (done) => {
      const startTime = performance.now();
      
      // Simulate complete workflow: fetch photos, cache them, preload images
      photoService.fetchRandomPhotos(5).subscribe(photos => {
        // Start preloading
        imagePreloader.preloadGamePhotos(photos).subscribe(() => {
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          
          // Complete workflow should finish within 5 seconds
          expect(totalTime).toBeLessThan(5000);
          done();
        });
      });

      // Mock API responses
      const requests = httpMock.match(() => true);
      requests.forEach(req => {
        req.flush({
          query: {
            geosearch: [{ title: 'File:Test1.jpg' }],
            pages: {
              '1': {
                title: 'File:Test1.jpg',
                imageinfo: [{
                  url: 'https://example.com/test1.jpg',
                  extmetadata: {
                    DateTime: { value: '2020-01-01' },
                    GPSLatitude: { value: '40.7128' },
                    GPSLongitude: { value: '-74.0060' }
                  }
                }]
              }
            }
          }
        });
      });
    });
  });
});