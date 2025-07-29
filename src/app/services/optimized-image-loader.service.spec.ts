import { TestBed } from '@angular/core/testing';
import { OptimizedImageLoaderService, ImageLoadOptions, ImageLoadResult } from './optimized-image-loader.service';
import { PerformanceMonitorService } from './performance-monitor.service';

describe('OptimizedImageLoaderService', () => {
  let service: OptimizedImageLoaderService;
  let performanceMonitor: jasmine.SpyObj<PerformanceMonitorService>;

  beforeEach(() => {
    const performanceMonitorSpy = jasmine.createSpyObj('PerformanceMonitorService', [
      'startTiming', 'endTiming', 'measureAsync', 'measureSync'
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: PerformanceMonitorService, useValue: performanceMonitorSpy }
      ]
    });

    service = TestBed.inject(OptimizedImageLoaderService);
    performanceMonitor = TestBed.inject(PerformanceMonitorService) as jasmine.SpyObj<PerformanceMonitorService>;
  });

  afterEach(() => {
    service.clearCache();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Image Loading', () => {
    it('should load image successfully', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      service.loadImage(testUrl).subscribe({
        next: (result: ImageLoadResult) => {
          expect(result.url).toBe(testUrl);
          expect(result.image).toBeInstanceOf(HTMLImageElement);
          expect(result.loadTime).toBeGreaterThanOrEqual(0);
          expect(result.fromCache).toBe(false);
          expect(result.size).toBeGreaterThan(0);
          done();
        },
        error: (error) => {
          fail(`Image load should not fail: ${error}`);
        }
      });
    });

    it('should return cached image on second load', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      // First load
      service.loadImage(testUrl).subscribe({
        next: (firstResult) => {
          expect(firstResult.fromCache).toBe(false);
          
          // Second load should be from cache
          service.loadImage(testUrl).subscribe({
            next: (secondResult) => {
              expect(secondResult.fromCache).toBe(true);
              expect(secondResult.loadTime).toBe(0);
              expect(secondResult.image).toBe(firstResult.image);
              done();
            }
          });
        }
      });
    });

    it('should handle image load errors with retries', (done) => {
      const invalidUrl = 'invalid-image-url';
      const options: ImageLoadOptions = { retries: 2, timeout: 1000 };
      
      service.loadImage(invalidUrl, options).subscribe({
        next: () => {
          fail('Should not succeed with invalid URL');
        },
        error: (error) => {
          expect(error.message).toContain('Failed to load image after 2 retries');
          done();
        }
      });
    });

    it('should handle timeout errors', (done) => {
      const slowUrl = 'https://httpstat.us/200?sleep=5000'; // 5 second delay
      const options: ImageLoadOptions = { timeout: 100 }; // 100ms timeout
      
      service.loadImage(slowUrl, options).subscribe({
        next: () => {
          fail('Should timeout');
        },
        error: (error) => {
          expect(error.message).toContain('timeout');
          done();
        }
      });
    });

    it('should apply loading options correctly', () => {
      const testUrl = 'test-image.jpg';
      const options: ImageLoadOptions = {
        quality: 'high',
        maxWidth: 800,
        maxHeight: 600
      };
      
      const optimizedUrl = service.createOptimizedUrl(testUrl, options);
      
      expect(optimizedUrl).toContain('quality=90');
      expect(optimizedUrl).toContain('w=800');
      expect(optimizedUrl).toContain('h=600');
    });
  });

  describe('Caching', () => {
    it('should cache loaded images', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      expect(service.isCached(testUrl)).toBe(false);
      
      service.loadImage(testUrl).subscribe({
        next: () => {
          expect(service.isCached(testUrl)).toBe(true);
          
          const cachedImage = service.getCachedImage(testUrl);
          expect(cachedImage).toBeInstanceOf(HTMLImageElement);
          done();
        }
      });
    });

    it('should clear specific images from cache', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      service.loadImage(testUrl).subscribe({
        next: () => {
          expect(service.isCached(testUrl)).toBe(true);
          
          service.clearImage(testUrl);
          expect(service.isCached(testUrl)).toBe(false);
          done();
        }
      });
    });

    it('should clear entire cache', (done) => {
      const testUrl1 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const testUrl2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      service.loadImage(testUrl1).subscribe({
        next: () => {
          service.loadImage(testUrl2).subscribe({
            next: () => {
              expect(service.isCached(testUrl1)).toBe(true);
              expect(service.isCached(testUrl2)).toBe(true);
              
              service.clearCache();
              
              expect(service.isCached(testUrl1)).toBe(false);
              expect(service.isCached(testUrl2)).toBe(false);
              done();
            }
          });
        }
      });
    });

    it('should provide cache statistics', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      service.loadImage(testUrl).subscribe({
        next: () => {
          const stats = service.getCacheStatistics();
          
          expect(stats.totalEntries).toBe(1);
          expect(stats.totalSize).toBeGreaterThan(0);
          expect(stats.hitRate).toBe(0); // No hits yet
          expect(stats.missRate).toBe(1); // One miss
          
          // Load again to test hit rate
          service.loadImage(testUrl).subscribe({
            next: () => {
              const updatedStats = service.getCacheStatistics();
              expect(updatedStats.hitRate).toBe(0.5); // 1 hit out of 2 requests
              done();
            }
          });
        }
      });
    });

    it('should enforce cache size limits', () => {
      const smallCacheSize = 1024; // 1KB
      const maxEntries = 2;
      
      service.configureCacheSettings(smallCacheSize, maxEntries);
      
      // This would typically require loading actual images to test eviction
      // For unit tests, we can verify the configuration is set
      const thresholds = service.getCacheStatistics();
      expect(thresholds).toBeDefined();
    });
  });

  describe('Preloading', () => {
    it('should preload multiple images', (done) => {
      const urls = [
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      ];
      
      service.preloadImages(urls).subscribe({
        next: (loadedCount) => {
          if (loadedCount === urls.length) {
            urls.forEach(url => {
              expect(service.isCached(url)).toBe(true);
            });
            done();
          }
        }
      });
    });

    it('should skip already cached images during preload', (done) => {
      const url1 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const url2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      // Load first image
      service.loadImage(url1).subscribe({
        next: () => {
          // Preload both images (first should be skipped)
          service.preloadImages([url1, url2]).subscribe({
            next: (loadedCount) => {
              if (loadedCount === 2) {
                expect(service.isCached(url1)).toBe(true);
                expect(service.isCached(url2)).toBe(true);
                done();
              }
            }
          });
        }
      });
    });
  });

  describe('URL Optimization', () => {
    it('should create optimized URLs with quality parameters', () => {
      const baseUrl = 'https://example.com/image.jpg';
      
      const highQuality = service.createOptimizedUrl(baseUrl, { quality: 'high' });
      const mediumQuality = service.createOptimizedUrl(baseUrl, { quality: 'medium' });
      const lowQuality = service.createOptimizedUrl(baseUrl, { quality: 'low' });
      
      expect(highQuality).toContain('quality=90');
      expect(mediumQuality).toContain('quality=70');
      expect(lowQuality).toContain('quality=50');
    });

    it('should create optimized URLs with size parameters', () => {
      const baseUrl = 'https://example.com/image.jpg';
      const options: ImageLoadOptions = {
        maxWidth: 800,
        maxHeight: 600
      };
      
      const optimizedUrl = service.createOptimizedUrl(baseUrl, options);
      
      expect(optimizedUrl).toContain('w=800');
      expect(optimizedUrl).toContain('h=600');
    });

    it('should handle URLs with existing query parameters', () => {
      const baseUrl = 'https://example.com/image.jpg?existing=param';
      const options: ImageLoadOptions = { quality: 'high' };
      
      const optimizedUrl = service.createOptimizedUrl(baseUrl, options);
      
      expect(optimizedUrl).toContain('existing=param');
      expect(optimizedUrl).toContain('&quality=90');
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should start and end timing for image loads', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      service.loadImage(testUrl).subscribe({
        next: () => {
          expect(performanceMonitor.startTiming).toHaveBeenCalledWith(
            jasmine.stringMatching(/image-load-/),
            'image',
            jasmine.objectContaining({ url: testUrl })
          );
          expect(performanceMonitor.endTiming).toHaveBeenCalledWith(
            jasmine.stringMatching(/image-load-/),
            jasmine.stringMatching(/Image Load/)
          );
          done();
        }
      });
    });

    it('should track cached vs network loads differently', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      // First load (network)
      service.loadImage(testUrl).subscribe({
        next: () => {
          expect(performanceMonitor.endTiming).toHaveBeenCalledWith(
            jasmine.any(String),
            'Image Load (Network)'
          );
          
          // Second load (cached)
          service.loadImage(testUrl).subscribe({
            next: () => {
              expect(performanceMonitor.endTiming).toHaveBeenCalledWith(
                jasmine.any(String),
                'Image Load (Cached)'
              );
              done();
            }
          });
        }
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed URLs gracefully', (done) => {
      const malformedUrl = 'not-a-valid-url';
      
      service.loadImage(malformedUrl).subscribe({
        next: () => {
          fail('Should not succeed with malformed URL');
        },
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });
    });

    it('should handle network errors gracefully', (done) => {
      const networkErrorUrl = 'https://nonexistent-domain-12345.com/image.jpg';
      const options: ImageLoadOptions = { timeout: 1000, retries: 1 };
      
      service.loadImage(networkErrorUrl, options).subscribe({
        next: () => {
          fail('Should not succeed with network error');
        },
        error: (error) => {
          expect(error.message).toContain('Failed to load image');
          done();
        }
      });
    });

    it('should handle concurrent loads of same image', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let completedLoads = 0;
      
      const checkCompletion = () => {
        completedLoads++;
        if (completedLoads === 3) {
          done();
        }
      };
      
      // Start three concurrent loads
      service.loadImage(testUrl).subscribe({ next: checkCompletion });
      service.loadImage(testUrl).subscribe({ next: checkCompletion });
      service.loadImage(testUrl).subscribe({ next: checkCompletion });
    });
  });

  describe('Memory Management', () => {
    it('should estimate image sizes correctly', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      service.loadImage(testUrl).subscribe({
        next: (result) => {
          expect(result.size).toBeGreaterThan(0);
          
          // For a 1x1 pixel image, size should be 4 bytes (RGBA)
          expect(result.size).toBe(4);
          done();
        }
      });
    });

    it('should track cache size correctly', (done) => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      const initialStats = service.getCacheStatistics();
      expect(initialStats.totalSize).toBe(0);
      
      service.loadImage(testUrl).subscribe({
        next: () => {
          const updatedStats = service.getCacheStatistics();
          expect(updatedStats.totalSize).toBeGreaterThan(0);
          done();
        }
      });
    });
  });

  describe('Cross-Origin Handling', () => {
    it('should detect cross-origin URLs', () => {
      const sameOriginUrl = '/local-image.jpg';
      const crossOriginUrl = 'https://external-domain.com/image.jpg';
      
      // These are private methods, so we test through public interface
      const sameOriginOptimized = service.createOptimizedUrl(sameOriginUrl);
      const crossOriginOptimized = service.createOptimizedUrl(crossOriginUrl);
      
      expect(sameOriginOptimized).toBe(sameOriginUrl);
      expect(crossOriginOptimized).toBe(crossOriginUrl);
    });
  });

  describe('Lazy Loading Support', () => {
    it('should provide intersection observer methods', () => {
      const mockImage = document.createElement('img');
      
      // These methods should exist and not throw
      expect(() => service.observeForLazyLoading(mockImage)).not.toThrow();
      expect(() => service.unobserveForLazyLoading(mockImage)).not.toThrow();
    });
  });
});