import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { Photo } from '../models/photo.model';

/**
 * Image preload status interface
 */
interface PreloadStatus {
  url: string;
  loaded: boolean;
  error: boolean;
  progress?: number;
}

/**
 * Service for preloading images to improve performance and user experience.
 * Implements intelligent preloading strategies including next photo preloading
 * and batch preloading with priority queuing.
 */
@Injectable({
  providedIn: 'root'
})
export class ImagePreloaderService {
  private preloadedImages = new Map<string, HTMLImageElement>();
  private preloadQueue: string[] = [];
  private currentlyPreloading = new Set<string>();
  private preloadStatus = new Map<string, PreloadStatus>();

  // Subjects for tracking preload progress
  private preloadProgress$ = new BehaviorSubject<Map<string, PreloadStatus>>(new Map());
  private preloadComplete$ = new Subject<string>();
  private preloadError$ = new Subject<{ url: string; error: Error }>();

  // Configuration
  private readonly MAX_CONCURRENT_PRELOADS = 3;
  private readonly PRELOAD_TIMEOUT = 30000; // 30 seconds

  /**
   * Preload a single image
   * @param url - Image URL to preload
   * @param priority - Higher numbers get priority (default: 0)
   * @returns Observable that emits when preload completes
   */
  preloadImage(url: string, priority: number = 0): Observable<boolean> {
    // Return immediately if already preloaded
    if (this.preloadedImages.has(url)) {
      return of(true);
    }

    // Return existing observable if currently preloading
    if (this.currentlyPreloading.has(url)) {
      return new Observable(subscriber => {
        const subscription = this.preloadComplete$.subscribe(completedUrl => {
          if (completedUrl === url) {
            subscriber.next(true);
            subscriber.complete();
          }
        });

        const errorSubscription = this.preloadError$.subscribe(({ url: errorUrl }) => {
          if (errorUrl === url) {
            subscriber.next(false);
            subscriber.complete();
          }
        });

        return () => {
          subscription.unsubscribe();
          errorSubscription.unsubscribe();
        };
      });
    }

    return new Observable(subscriber => {
      this.addToQueue(url, priority);
      this.processQueue();

      const subscription = this.preloadComplete$.subscribe(completedUrl => {
        if (completedUrl === url) {
          subscriber.next(true);
          subscriber.complete();
        }
      });

      const errorSubscription = this.preloadError$.subscribe(({ url: errorUrl }) => {
        if (errorUrl === url) {
          subscriber.next(false);
          subscriber.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
        errorSubscription.unsubscribe();
      };
    });
  }

  /**
   * Preload multiple images with priority
   * @param urls - Array of image URLs to preload
   * @param priority - Priority level for all images
   * @returns Observable that emits progress updates
   */
  preloadImages(urls: string[], priority: number = 0): Observable<{ completed: number; total: number; progress: number }> {
    return new Observable(subscriber => {
      let completed = 0;
      const total = urls.length;

      if (total === 0) {
        subscriber.next({ completed: 0, total: 0, progress: 100 });
        subscriber.complete();
        return;
      }

      urls.forEach(url => {
        this.preloadImage(url, priority).subscribe(success => {
          completed++;
          const progress = (completed / total) * 100;

          subscriber.next({ completed, total, progress });

          if (completed === total) {
            subscriber.complete();
          }
        });
      });
    });
  }

  /**
   * Preload the next photo in sequence for smooth transitions
   * @param photos - Array of all photos
   * @param currentIndex - Current photo index
   */
  preloadNextPhoto(photos: Photo[], currentIndex: number): void {
    const nextIndex = currentIndex + 1;
    if (nextIndex < photos.length) {
      const nextPhoto = photos[nextIndex];
      this.preloadImage(nextPhoto.url, 10).subscribe(); // High priority for next photo
    }
  }

  /**
   * Preload all photos for a game session
   * @param photos - Array of photos to preload
   * @returns Observable with preload progress
   */
  preloadGamePhotos(photos: Photo[]): Observable<{ completed: number; total: number; progress: number }> {
    const urls = photos.map(photo => photo.url);
    return this.preloadImages(urls, 5); // Medium priority for batch preload
  }

  /**
   * Check if an image is already preloaded
   * @param url - Image URL to check
   * @returns True if image is preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedImages.has(url);
  }

  /**
   * Get preloaded image element
   * @param url - Image URL
   * @returns HTMLImageElement if preloaded, null otherwise
   */
  getPreloadedImage(url: string): HTMLImageElement | null {
    return this.preloadedImages.get(url) || null;
  }

  /**
   * Get current preload status for all images
   * @returns Observable with preload status map
   */
  getPreloadStatus(): Observable<Map<string, PreloadStatus>> {
    return this.preloadProgress$.asObservable();
  }

  /**
   * Clear all preloaded images and reset state
   */
  clearCache(): void {
    this.preloadedImages.clear();
    this.preloadQueue = [];
    this.currentlyPreloading.clear();
    this.preloadStatus.clear();
    this.preloadProgress$.next(new Map());
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getStats(): { preloaded: number; queued: number; loading: number } {
    return {
      preloaded: this.preloadedImages.size,
      queued: this.preloadQueue.length,
      loading: this.currentlyPreloading.size
    };
  }

  /**
   * Add URL to preload queue with priority
   */
  private addToQueue(url: string, priority: number): void {
    // Remove if already in queue
    const existingIndex = this.preloadQueue.findIndex(queuedUrl => queuedUrl === url);
    if (existingIndex !== -1) {
      this.preloadQueue.splice(existingIndex, 1);
    }

    // Insert based on priority (higher priority first)
    let insertIndex = 0;
    for (let i = 0; i < this.preloadQueue.length; i++) {
      // For simplicity, we'll just add to the front for high priority
      if (priority <= 5) {
        insertIndex = this.preloadQueue.length;
        break;
      }
    }

    this.preloadQueue.splice(insertIndex, 0, url);

    // Update status
    this.preloadStatus.set(url, {
      url,
      loaded: false,
      error: false
    });
    this.preloadProgress$.next(new Map(this.preloadStatus));
  }

  /**
   * Process the preload queue
   */
  private processQueue(): void {
    while (this.currentlyPreloading.size < this.MAX_CONCURRENT_PRELOADS && this.preloadQueue.length > 0) {
      const url = this.preloadQueue.shift();
      if (url && !this.currentlyPreloading.has(url) && !this.preloadedImages.has(url)) {
        this.startPreload(url);
      }
    }
  }

  /**
   * Start preloading a single image
   */
  private startPreload(url: string): void {
    this.currentlyPreloading.add(url);

    const img = new Image();
    const timeoutId = setTimeout(() => {
      this.handlePreloadError(url, new Error('Preload timeout'));
    }, this.PRELOAD_TIMEOUT);

    img.onload = () => {
      clearTimeout(timeoutId);
      this.handlePreloadSuccess(url, img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      this.handlePreloadError(url, new Error('Image load failed'));
    };

    // Start loading
    img.src = url;
  }

  /**
   * Handle successful preload
   */
  private handlePreloadSuccess(url: string, img: HTMLImageElement): void {
    this.preloadedImages.set(url, img);
    this.currentlyPreloading.delete(url);

    // Update status
    this.preloadStatus.set(url, {
      url,
      loaded: true,
      error: false
    });
    this.preloadProgress$.next(new Map(this.preloadStatus));

    this.preloadComplete$.next(url);
    this.processQueue(); // Continue with next item in queue
  }

  /**
   * Handle preload error
   */
  private handlePreloadError(url: string, error: Error): void {
    this.currentlyPreloading.delete(url);

    // Update status
    this.preloadStatus.set(url, {
      url,
      loaded: false,
      error: true
    });
    this.preloadProgress$.next(new Map(this.preloadStatus));

    this.preloadError$.next({ url, error });
    this.processQueue(); // Continue with next item in queue
  }
}