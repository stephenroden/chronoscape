import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

/**
 * Cache entry interface for storing cached data with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache configuration options
 */
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

/**
 * Service for caching API responses and other data to reduce network requests
 * and improve performance. Implements LRU (Least Recently Used) eviction policy.
 */
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder = new Map<string, number>(); // Track access order for LRU
  private accessCounter = 0;
  
  // Default cache configuration
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_MAX_SIZE = 100;
  
  // Cache statistics for monitoring
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  // Store for ongoing requests to prevent duplicate calls
  private ongoingRequests = new Map<string, Observable<any>>();

  /**
   * Get data from cache or execute the provided function if not cached
   * @param key - Unique cache key
   * @param dataFn - Function that returns Observable with data to cache
   * @param options - Cache configuration options
   * @returns Observable with cached or fresh data
   */
  getOrSet<T>(
    key: string, 
    dataFn: () => Observable<T>, 
    options: CacheOptions = {}
  ): Observable<T> {
    const cachedEntry = this.get<T>(key);
    
    if (cachedEntry) {
      return of(cachedEntry);
    }
    
    // Check if there's an ongoing request for this key
    if (this.ongoingRequests.has(key)) {
      return this.ongoingRequests.get(key)!;
    }
    
    // Execute the data function and cache the result
    const request$ = dataFn().pipe(
      tap(data => this.set(key, data, options)),
      shareReplay(1), // Share the result to prevent multiple executions
      tap(() => this.ongoingRequests.delete(key)) // Clean up after completion
    );
    
    this.ongoingRequests.set(key, request$);
    return request$;
  }

  /**
   * Get data from cache
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Set data in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param options - Cache configuration options
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    // Check if we need to evict entries to make room
    if (this.cache.size >= maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Check if a key exists in cache and is not expired
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific key from cache
   * @param key - Cache key to remove
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.ongoingRequests.clear();
    this.accessCounter = 0;
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics for monitoring
   * @returns Cache statistics object
   */
  getStats(): { hits: number; misses: number; evictions: number; size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.size === 0) return;
    
    // Find the key with the smallest access counter (least recently used)
    let lruKey: string | null = null;
    let minAccess = Infinity;
    
    this.accessOrder.forEach((accessTime, key) => {
      if (accessTime < minAccess) {
        minAccess = accessTime;
        lruKey = key;
      }
    });
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.stats.evictions++;
    }
  }
}