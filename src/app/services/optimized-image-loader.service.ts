import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { catchError, map, retry, timeout, switchMap, tap } from 'rxjs/operators';
import { PerformanceMonitorService } from './performance-monitor.service';

/**
 * Interface for image cache entry
 */
interface ImageCacheEntry {
  url: string;
  image: HTMLImageElement;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Interface for image loading options
 */
export interface ImageLoadOptions {
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'normal' | 'low';
  preload?: boolean;
  quality?: 'high' | 'medium' | 'low';
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Interface for image loading result
 */
export interface ImageLoadResult {
  image: HTMLImageElement;
  url: string;
  loadTime: number;
  fromCache: boolean;
  size: number;
}

/**
 * Interface for cache statistics
 */
export interface CacheStatistics {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Optimized image loading and caching service for zoom functionality
 * Provides efficient image loading, caching, and preloading capabilities
 */
@Injectable({
  providedIn: 'root'
})
export class OptimizedImageLoaderService {
  private readonly DEFAULT_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_MAX_ENTRIES = 100;
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_RETRIES = 3;
  private readonly CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private imageCache = new Map<string, ImageCacheEntry>();
  private loadingPromises = new Map<string, Promise<ImageLoadResult>>();
  private preloadQueue: string[] = [];
  private isPreloading = false;

  // Configuration
  private maxCacheSize = this.DEFAULT_CACHE_SIZE;
  private maxCacheEntries = this.DEFAULT_MAX_ENTRIES;
  private currentCacheSize = 0;

  // Statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private evictionCount = 0;

  // Observables
  private cacheStatsSubject = new BehaviorSubject<CacheStatistics>(this.getCacheStatistics());
  public readonly cacheStats$ = this.cacheStatsSubject.asObservable();

  constructor(private performanceMonitor: PerformanceMonitorService) {
    this.setupCacheCleanup();
    this.setupIntersectionObserver();
  }

  /**
   * Load an image with caching and optimization
   * @param url - Image URL to load
   * @param options - Loading options
   */
  loadImage(url: string, options: ImageLoadOptions = {}): Observable<ImageLoadResult> {
    const operationId = `image-load-${Date.now()}-${Math.random()}`;
    this.performanceMonitor.startTiming(operationId, 'image', { url, options });

    // Check cache first
    const cachedEntry = this.imageCache.get(url);
    if (cachedEntry) {
      this.cacheHits++;
      cachedEntry.accessCount++;
      cachedEntry.lastAccessed = Date.now();
      this.updateCacheStats();

      const result: ImageLoadResult = {
        image: cachedEntry.image,
        url,
        loadTime: 0,
        fromCache: true,
        size: cachedEntry.size
      };

      this.performanceMonitor.endTiming(operationId, 'Image Load (Cached)');
      return of(result);
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      return new Observable(subscriber => {
        existingPromise
          .then(result => {
            this.performanceMonitor.endTiming(operationId, 'Image Load (Existing Promise)');
            subscriber.next(result);
            subscriber.complete();
          })
          .catch(error => {
            this.performanceMonitor.endTiming(operationId, 'Image Load Error (Existing Promise)');
            subscriber.error(error);
          });
      });
    }

    // Start new load
    this.cacheMisses++;
    const loadPromise = this.performImageLoad(url, options);
    this.loadingPromises.set(url, loadPromise);

    return new Observable(subscriber => {
      loadPromise
        .then(result => {
          this.performanceMonitor.endTiming(operationId, 'Image Load (Network)');
          subscriber.next(result);
          subscriber.complete();
        })
        .catch(error => {
          this.performanceMonitor.endTiming(operationId, 'Image Load Error (Network)');
          subscriber.error(error);
        })
        .finally(() => {
          this.loadingPromises.delete(url);
        });
    });
  }

  /**
   * Preload images for better performance
   * @param urls - Array of image URLs to preload
   * @param options - Loading options
   */
  preloadImages(urls: string[], options: ImageLoadOptions = {}): Observable<number> {
    const uniqueUrls = urls.filter(url => !this.imageCache.has(url) && !this.preloadQueue.includes(url));
    this.preloadQueue.push(...uniqueUrls);

    if (!this.isPreloading) {
      this.startPreloading(options);
    }

    return new Observable(subscriber => {
      const checkProgress = () => {
        const loaded = urls.filter(url => this.imageCache.has(url)).length;
        subscriber.next(loaded);
        
        if (loaded === urls.length) {
          subscriber.complete();
        } else {
          setTimeout(checkProgress, 100);
        }
      };
      
      checkProgress();
    });
  }

  /**
   * Clear image from cache
   * @param url - Image URL to clear
   */
  clearImage(url: string): void {
    const entry = this.imageCache.get(url);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.imageCache.delete(url);
      this.updateCacheStats();
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.currentCacheSize = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.evictionCount = 0;
    this.updateCacheStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): CacheStatistics {
    const entries = Array.from(this.imageCache.values());
    const totalRequests = this.cacheHits + this.cacheMisses;

    return {
      totalEntries: this.imageCache.size,
      totalSize: this.currentCacheSize,
      hitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.cacheMisses / totalRequests : 0,
      evictionCount: this.evictionCount,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Configure cache settings
   * @param maxSize - Maximum cache size in bytes
   * @param maxEntries - Maximum number of cache entries
   */
  configureCacheSettings(maxSize: number, maxEntries: number): void {
    this.maxCacheSize = maxSize;
    this.maxCacheEntries = maxEntries;
    this.enforceCacheLimits();
  }

  /**
   * Check if image is cached
   * @param url - Image URL to check
   */
  isCached(url: string): boolean {
    return this.imageCache.has(url);
  }

  /**
   * Get cached image if available
   * @param url - Image URL to get
   */
  getCachedImage(url: string): HTMLImageElement | null {
    const entry = this.imageCache.get(url);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry.image;
    }
    return null;
  }

  /**
   * Create optimized image URL with quality and size parameters
   * @param url - Original image URL
   * @param options - Optimization options
   */
  createOptimizedUrl(url: string, options: ImageLoadOptions = {}): string {
    // This would typically integrate with a CDN or image optimization service
    // For now, return the original URL
    let optimizedUrl = url;

    // Add quality parameter if supported
    if (options.quality && url.includes('?')) {
      optimizedUrl += `&quality=${this.getQualityValue(options.quality)}`;
    } else if (options.quality) {
      optimizedUrl += `?quality=${this.getQualityValue(options.quality)}`;
    }

    // Add size parameters if specified
    if (options.maxWidth || options.maxHeight) {
      const separator = optimizedUrl.includes('?') ? '&' : '?';
      const sizeParams = [];
      
      if (options.maxWidth) {
        sizeParams.push(`w=${options.maxWidth}`);
      }
      if (options.maxHeight) {
        sizeParams.push(`h=${options.maxHeight}`);
      }
      
      optimizedUrl += separator + sizeParams.join('&');
    }

    return optimizedUrl;
  }

  /**
   * Perform the actual image loading
   */
  private async performImageLoad(url: string, options: ImageLoadOptions): Promise<ImageLoadResult> {
    const startTime = performance.now();
    const optimizedUrl = this.createOptimizedUrl(url, options);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set up timeout
      const timeoutMs = options.timeout || this.DEFAULT_TIMEOUT;
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image load timeout after ${timeoutMs}ms: ${url}`));
      }, timeoutMs);

      // Set up error handling with retries
      let retryCount = 0;
      const maxRetries = options.retries || this.DEFAULT_RETRIES;

      const attemptLoad = () => {
        img.onload = () => {
          clearTimeout(timeoutId);
          const loadTime = performance.now() - startTime;
          const size = this.estimateImageSize(img);

          // Cache the image
          this.cacheImage(url, img, size);

          const result: ImageLoadResult = {
            image: img,
            url,
            loadTime,
            fromCache: false,
            size
          };

          resolve(result);
        };

        img.onerror = () => {
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(`Image load failed, retrying (${retryCount}/${maxRetries}): ${url}`);
            setTimeout(attemptLoad, 1000 * retryCount); // Exponential backoff
          } else {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to load image after ${maxRetries} retries: ${url}`));
          }
        };

        // Set crossOrigin if needed
        if (this.isCrossOrigin(optimizedUrl)) {
          img.crossOrigin = 'anonymous';
        }

        // Start loading
        img.src = optimizedUrl;
      };

      attemptLoad();
    });
  }

  /**
   * Cache an image
   */
  private cacheImage(url: string, image: HTMLImageElement, size: number): void {
    const entry: ImageCacheEntry = {
      url,
      image,
      timestamp: Date.now(),
      size,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.imageCache.set(url, entry);
    this.currentCacheSize += size;

    this.enforceCacheLimits();
    this.updateCacheStats();
  }

  /**
   * Enforce cache size and entry limits
   */
  private enforceCacheLimits(): void {
    // Remove entries if over limits
    while (
      (this.currentCacheSize > this.maxCacheSize || this.imageCache.size > this.maxCacheEntries) &&
      this.imageCache.size > 0
    ) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Evict least recently used cache entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestEntry: ImageCacheEntry | null = null;
    let oldestUrl = '';

    for (const [url, entry] of this.imageCache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestUrl = url;
      }
    }

    if (oldestEntry) {
      this.currentCacheSize -= oldestEntry.size;
      this.imageCache.delete(oldestUrl);
      this.evictionCount++;
    }
  }

  /**
   * Start preloading images from queue
   */
  private async startPreloading(options: ImageLoadOptions): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const url = this.preloadQueue.shift()!;
      
      try {
        await this.performImageLoad(url, { ...options, priority: 'low' });
      } catch (error) {
        console.warn(`Preload failed for ${url}:`, error);
      }

      // Small delay to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.isPreloading = false;
  }

  /**
   * Estimate image size in bytes
   */
  private estimateImageSize(img: HTMLImageElement): number {
    // Rough estimation: width * height * 4 bytes per pixel (RGBA)
    // This is an approximation since we don't know the actual file size
    return img.naturalWidth * img.naturalHeight * 4;
  }

  /**
   * Check if URL is cross-origin
   */
  private isCrossOrigin(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Get quality value for URL parameter
   */
  private getQualityValue(quality: 'high' | 'medium' | 'low'): number {
    switch (quality) {
      case 'high': return 90;
      case 'medium': return 70;
      case 'low': return 50;
      default: return 80;
    }
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(): void {
    this.cacheStatsSubject.next(this.getCacheStatistics());
  }

  /**
   * Set up periodic cache cleanup
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [url, entry] of this.imageCache.entries()) {
      if (now - entry.lastAccessed > maxAge) {
        this.currentCacheSize -= entry.size;
        this.imageCache.delete(url);
      }
    }

    this.updateCacheStats();
  }

  /**
   * Set up intersection observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    // This would be used for lazy loading images that come into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const dataSrc = img.getAttribute('data-src');
            
            if (dataSrc && !img.src) {
              this.loadImage(dataSrc).subscribe({
                next: (result) => {
                  img.src = result.image.src;
                  observer.unobserve(img);
                },
                error: (error) => {
                  console.error('Lazy load failed:', error);
                  observer.unobserve(img);
                }
              });
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    // Store observer for potential use by components
    (this as any).intersectionObserver = observer;
  }

  /**
   * Observe element for lazy loading
   * @param element - Element to observe
   */
  observeForLazyLoading(element: HTMLImageElement): void {
    const observer = (this as any).intersectionObserver;
    if (observer) {
      observer.observe(element);
    }
  }

  /**
   * Stop observing element
   * @param element - Element to stop observing
   */
  unobserveForLazyLoading(element: HTMLImageElement): void {
    const observer = (this as any).intersectionObserver;
    if (observer) {
      observer.unobserve(element);
    }
  }
}