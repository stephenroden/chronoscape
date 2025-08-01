import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, firstValueFrom, TimeoutError, forkJoin } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { FormatValidationLoggerService } from './format-validation-logger.service';
import { FormatConfigService, FormatConfig } from './format-config.service';
import { FormatValidationPerformanceService } from './format-validation-performance.service';

// FormatConfig interface is now imported from FormatConfigService

/**
 * Result of format validation
 */
export interface FormatValidationResult {
  isValid: boolean;
  detectedFormat?: string;
  detectedMimeType?: string;
  rejectionReason?: string;
  confidence: number; // 0-1 scale
  detectionMethod: string;
}

/**
 * Strategy for detecting image format
 */
export interface FormatDetectionStrategy {
  name: string;
  priority: number;
  detect(url: string, metadata?: any): Promise<FormatValidationResult>;
}

/**
 * Cache entry for format validation results
 */
interface FormatValidationCacheEntry {
  result: FormatValidationResult;
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache configuration for format validation
 */
interface FormatValidationCacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  enabled: boolean;
}

/**
 * Service for validating image formats to ensure web compatibility
 */
@Injectable({
  providedIn: 'root'
})
export class FormatValidationService {

  private detectionStrategies: FormatDetectionStrategy[] = [];

  // Cache for format validation results
  private validationCache = new Map<string, FormatValidationCacheEntry>();
  private cacheAccessOrder = new Map<string, number>(); // Track access order for LRU
  private cacheAccessCounter = 0;
  
  // Cache configuration
  private readonly cacheConfig: FormatValidationCacheConfig = {
    ttl: 60 * 60 * 1000, // 1 hour TTL for format validation results
    maxSize: 500, // Store up to 500 validation results
    enabled: true
  };

  // Cache statistics for monitoring
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    keyGenerationErrors: 0
  };

  constructor(
    private http: HttpClient,
    private logger: FormatValidationLoggerService,
    private formatConfigService: FormatConfigService,
    private performanceService: FormatValidationPerformanceService
  ) {
    this.initializeDetectionStrategies();
    
    // Set up periodic cache cleanup (every 10 minutes)
    setInterval(() => {
      this.cleanupExpiredCacheEntries();
    }, 10 * 60 * 1000);
  }

  /**
   * Generates cache key for format validation results based on URL and metadata
   * @param url - Image URL
   * @param mimeType - Optional MIME type from metadata
   * @param metadata - Optional metadata object
   * @returns Cache key string or null if key generation fails
   */
  private generateCacheKey(url: string, mimeType?: string, metadata?: any): string | null {
    try {
      if (!url || typeof url !== 'string') {
        return null;
      }

      // Normalize URL by removing query parameters and fragments for consistent caching
      let normalizedUrl: string;
      try {
        const urlObj = new URL(url);
        normalizedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      } catch {
        // If URL parsing fails, use the original URL
        normalizedUrl = url;
      }

      // Create cache key components
      const keyComponents: string[] = [normalizedUrl];

      // Add MIME type if available
      if (mimeType && typeof mimeType === 'string') {
        keyComponents.push(`mime:${mimeType.trim().toLowerCase()}`);
      }

      // Add relevant metadata if available
      if (metadata?.extmetadata) {
        const wikimediaMimeType = this.extractMimeTypeFromWikimediaMetadata(metadata.extmetadata);
        if (wikimediaMimeType && wikimediaMimeType !== mimeType) {
          keyComponents.push(`wikimedia-mime:${wikimediaMimeType.trim().toLowerCase()}`);
        }
      }

      // Join components with a delimiter
      return keyComponents.join('|');
    } catch (error) {
      this.cacheStats.keyGenerationErrors++;
      console.warn('Error generating cache key for format validation:', error);
      return null;
    }
  }

  /**
   * Gets format validation result from cache
   * @param cacheKey - Cache key
   * @returns Cached validation result or null if not found or expired
   */
  private getCachedValidationResult(cacheKey: string): FormatValidationResult | null {
    if (!this.cacheConfig.enabled || !cacheKey) {
      return null;
    }

    const entry = this.validationCache.get(cacheKey);
    
    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.validationCache.delete(cacheKey);
      this.cacheAccessOrder.delete(cacheKey);
      this.cacheStats.misses++;
      return null;
    }
    
    // Update access order for LRU
    this.cacheAccessOrder.set(cacheKey, ++this.cacheAccessCounter);
    this.cacheStats.hits++;
    
    return entry.result;
  }

  /**
   * Stores format validation result in cache
   * @param cacheKey - Cache key
   * @param result - Validation result to cache
   */
  private setCachedValidationResult(cacheKey: string, result: FormatValidationResult): void {
    if (!this.cacheConfig.enabled || !cacheKey) {
      return;
    }

    // Only cache successful results or definitive failures (high confidence)
    // Don't cache network errors or temporary failures
    if (result.confidence < 0.6 || result.rejectionReason?.includes('HTTP request failed') || 
        result.rejectionReason?.includes('Network') || result.rejectionReason?.includes('timeout')) {
      return;
    }

    const entry: FormatValidationCacheEntry = {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.cacheConfig.ttl
    };
    
    // Check if we need to evict entries to make room
    if (this.validationCache.size >= this.cacheConfig.maxSize && !this.validationCache.has(cacheKey)) {
      this.evictLRUCacheEntry();
    }
    
    this.validationCache.set(cacheKey, entry);
    this.cacheAccessOrder.set(cacheKey, ++this.cacheAccessCounter);
  }

  /**
   * Evicts the least recently used cache entry
   */
  private evictLRUCacheEntry(): void {
    if (this.cacheAccessOrder.size === 0) return;
    
    // Find the key with the smallest access counter (least recently used)
    let lruKey: string | null = null;
    let minAccess = Infinity;
    
    this.cacheAccessOrder.forEach((accessTime, key) => {
      if (accessTime < minAccess) {
        minAccess = accessTime;
        lruKey = key;
      }
    });
    
    if (lruKey) {
      this.validationCache.delete(lruKey);
      this.cacheAccessOrder.delete(lruKey);
      this.cacheStats.evictions++;
    }
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredCacheEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.validationCache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.validationCache.delete(key);
      this.cacheAccessOrder.delete(key);
    });
  }

  /**
   * Gets cache statistics for monitoring
   * @returns Cache statistics object
   */
  getCacheStats(): { hits: number; misses: number; evictions: number; size: number; hitRate: number; keyGenerationErrors: number } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
    
    return {
      ...this.cacheStats,
      size: this.validationCache.size,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Clears the format validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.cacheAccessOrder.clear();
    this.cacheAccessCounter = 0;
    this.cacheStats = { hits: 0, misses: 0, evictions: 0, keyGenerationErrors: 0 };
  }

  /**
   * Validates multiple image formats in batch for improved performance
   * @param validationRequests - Array of validation requests
   * @returns Promise resolving to array of validation results
   */
  async validateImageFormatsBatch(validationRequests: Array<{
    url: string;
    mimeType?: string;
    metadata?: any;
  }>): Promise<FormatValidationResult[]> {
    const batchStartTime = Date.now();
    const batchSize = validationRequests.length;
    
    if (batchSize === 0) {
      return [];
    }

    console.log(`Starting batch validation for ${batchSize} images`);

    // Process validations with controlled concurrency to avoid overwhelming the system
    const MAX_CONCURRENT = 5;
    const results: FormatValidationResult[] = [];
    
    for (let i = 0; i < validationRequests.length; i += MAX_CONCURRENT) {
      const batch = validationRequests.slice(i, i + MAX_CONCURRENT);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (request, index) => {
        const token = this.performanceService.startValidation(request.url);
        
        try {
          const result = await this.validateImageFormatInternal(
            request.url, 
            request.mimeType, 
            request.metadata,
            batchSize // Pass batch size for performance tracking
          );
          
          this.performanceService.endValidation(
            token,
            request.url,
            result.isValid,
            result.detectionMethod,
            result.detectionMethod.includes('cached'),
            result.detectionMethod === 'http-content-type',
            batchSize
          );
          
          return result;
        } catch (error) {
          const errorResult: FormatValidationResult = {
            isValid: false,
            rejectionReason: `Batch validation error: ${(error as Error).message}`,
            confidence: 0.0,
            detectionMethod: 'batch-error'
          };
          
          this.performanceService.endValidation(
            token,
            request.url,
            false,
            'batch-error',
            false,
            false,
            batchSize
          );
          
          return errorResult;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const batchTotalTime = Date.now() - batchStartTime;
    const successCount = results.filter(r => r.isValid).length;
    
    // Record batch performance metrics
    this.performanceService.recordBatchValidation(batchSize, batchTotalTime, successCount);
    
    console.log(`Batch validation completed`, {
      batchSize,
      successCount,
      failureCount: batchSize - successCount,
      totalTime: batchTotalTime,
      averageTimePerValidation: batchTotalTime / batchSize
    });

    return results;
  }

  /**
   * Validates image format using multiple detection strategies with comprehensive logging
   * @param url - Image URL to validate
   * @param mimeType - Optional MIME type from metadata
   * @param metadata - Optional metadata object (can contain extmetadata for Wikimedia)
   * @returns Promise resolving to validation result
   */
  async validateImageFormat(url: string, mimeType?: string, metadata?: any): Promise<FormatValidationResult> {
    const token = this.performanceService.startValidation(url);
    
    try {
      const result = await this.validateImageFormatInternal(url, mimeType, metadata);
      
      this.performanceService.endValidation(
        token,
        url,
        result.isValid,
        result.detectionMethod,
        result.detectionMethod.includes('cached'),
        result.detectionMethod === 'http-content-type'
      );
      
      return result;
    } catch (error) {
      const errorResult: FormatValidationResult = {
        isValid: false,
        rejectionReason: `Validation error: ${(error as Error).message}`,
        confidence: 0.0,
        detectionMethod: 'error'
      };
      
      this.performanceService.endValidation(
        token,
        url,
        false,
        'error',
        false,
        false
      );
      
      return errorResult;
    }
  }

  /**
   * Internal method for validating image format (used by both single and batch validation)
   * @param url - Image URL to validate
   * @param mimeType - Optional MIME type from metadata
   * @param metadata - Optional metadata object (can contain extmetadata for Wikimedia)
   * @param batchSize - Optional batch size for performance tracking
   * @returns Promise resolving to validation result
   */
  private async validateImageFormatInternal(url: string, mimeType?: string, metadata?: any, batchSize?: number): Promise<FormatValidationResult> {
    const startTime = Date.now();
    
    // Input validation with logging
    if (!url || typeof url !== 'string') {
      const result: FormatValidationResult = {
        isValid: false,
        rejectionReason: 'Invalid URL provided',
        confidence: 1.0,
        detectionMethod: 'input-validation'
      };
      
      const validationTime = Date.now() - startTime;
      this.logger.logRejection(url || 'invalid-url', result, validationTime);
      return result;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(url, mimeType, metadata);
    if (cacheKey) {
      const cachedResult = this.getCachedValidationResult(cacheKey);
      if (cachedResult) {
        const validationTime = Date.now() - startTime;
        
        // Log cache hit with original detection method
        if (cachedResult.isValid) {
          this.logger.logSuccess(url, { ...cachedResult, detectionMethod: `${cachedResult.detectionMethod}-cached` }, validationTime);
        } else {
          this.logger.logRejection(url, { ...cachedResult, detectionMethod: `${cachedResult.detectionMethod}-cached` }, validationTime);
        }
        
        return cachedResult;
      }
    }

    // Try detection strategies in priority order
    const sortedStrategies = [...this.detectionStrategies].sort((a, b) => a.priority - b.priority);
    
    let bestResult: FormatValidationResult | null = null;
    let lastResult: FormatValidationResult | null = null;
    let lastError: Error | null = null;
    
    for (const strategy of sortedStrategies) {
      const strategyStartTime = Date.now();
      
      try {
        const result = await strategy.detect(url, { mimeType, extmetadata: metadata?.extmetadata });
        lastResult = result;
        
        // If we get a definitive result (high confidence), use it
        if (result.confidence >= 0.8) {
          const validationTime = Date.now() - startTime;
          
          // Cache the result before returning
          if (cacheKey) {
            this.setCachedValidationResult(cacheKey, result);
          }
          
          if (result.isValid) {
            this.logger.logSuccess(url, result, validationTime);
          } else {
            this.logger.logRejection(url, result, validationTime);
          }
          
          return result;
        }
        
        // Store the best result so far for fallback (only if it has a detected format and reasonable confidence)
        if (result.detectedFormat && result.confidence >= 0.6) {
          if (!bestResult || result.confidence > bestResult.confidence) {
            const isSupported = this.isFormatSupported(result.detectedFormat);
            const rejectionReason = isSupported ? undefined : this.getRejectionReason(result.detectedFormat);
            
            bestResult = {
              ...result,
              isValid: isSupported,
              rejectionReason
            };
          }
          // If we have a good result with reasonable confidence, stop here and don't call remaining strategies
          if (result.confidence >= 0.7) {
            break;
          }
        }
        
        // For results with low confidence but no detected format, continue to next strategy
        // This ensures we don't exit early when strategies return confidence 0.0 with no format
      } catch (error) {
        lastError = error as Error;
        const strategyTime = Date.now() - strategyStartTime;
        
        // Log strategy-specific errors with detailed information
        const isNetworkError = this.isNetworkError(error);
        const isTimeoutError = this.isTimeoutError(error);
        const httpStatusCode = this.extractHttpStatusCode(error);
        
        if (strategy.name === 'http-content-type') {
          this.logger.logNetworkError(url, error as Error, strategyTime, isTimeoutError, httpStatusCode);
        } else {
          this.logger.logError(url, error as Error, strategyTime, strategy.name, {
            networkTimeout: isTimeoutError,
            httpStatusCode
          });
        }
        
        // If this was the HTTP strategy and it failed, we want to return its error instead of a generic one
        if (strategy.name === 'http-content-type') {
          const errorResult: FormatValidationResult = {
            isValid: false,
            confidence: 0.0,
            detectionMethod: 'http-content-type',
            rejectionReason: this.getNetworkErrorMessage(error as Error, isTimeoutError)
          };
          
          // Don't cache network errors as they are temporary
          
          const validationTime = Date.now() - startTime;
          this.logger.logError(url, error as Error, validationTime, 'http-content-type', {
            networkTimeout: isTimeoutError,
            httpStatusCode
          });
          
          return errorResult;
        }
        continue;
      }
    }
    
    const validationTime = Date.now() - startTime;
    
    // Return the best result found, if any
    if (bestResult) {
      // Cache the result before returning
      if (cacheKey) {
        this.setCachedValidationResult(cacheKey, bestResult);
      }
      
      if (bestResult.isValid) {
        this.logger.logSuccess(url, bestResult, validationTime);
      } else {
        this.logger.logRejection(url, bestResult, validationTime);
      }
      return bestResult;
    }
    
    // If we have a last result (even with low confidence), use it instead of generic failure
    if (lastResult) {
      // Cache the result before returning
      if (cacheKey) {
        this.setCachedValidationResult(cacheKey, lastResult);
      }
      
      if (lastResult.isValid) {
        this.logger.logSuccess(url, lastResult, validationTime);
      } else {
        this.logger.logRejection(url, lastResult, validationTime);
      }
      return lastResult;
    }

    // If no strategy could determine the format, reject with comprehensive error info
    const finalResult: FormatValidationResult = {
      isValid: false,
      rejectionReason: lastError ? 
        `Unable to determine image format due to errors: ${lastError.message}` :
        'Unable to determine image format',
      confidence: 0.0,
      detectionMethod: 'unknown'
    };
    
    // Cache the final result before returning
    if (cacheKey) {
      this.setCachedValidationResult(cacheKey, finalResult);
    }
    
    if (lastError) {
      this.logger.logError(url, lastError, validationTime, 'unknown');
    } else {
      this.logger.logRejection(url, finalResult, validationTime);
    }
    
    return finalResult;
  }

  /**
   * Gets list of supported image formats
   * @returns Array of supported format names
   */
  getSupportedFormats(): string[] {
    return this.formatConfigService.getSupportedFormatNames();
  }

  /**
   * Extracts format from URL file extension
   * Handles query parameters, URL fragments, and various edge cases
   * @param url - Image URL
   * @returns Detected format or null
   */
  getFormatFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
      // Handle relative URLs by adding a dummy base
      let fullUrl = url;
      if (url.startsWith('//')) {
        // Protocol-relative URL
        fullUrl = `https:${url}`;
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Relative URL
        fullUrl = `https://example.com${url.startsWith('/') ? '' : '/'}${url}`;
      }
      
      // Parse URL and extract pathname, removing query parameters and fragments
      const urlObj = new URL(fullUrl);
      let pathname = urlObj.pathname.toLowerCase();
      
      // Remove trailing slash if present
      if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      
      // Handle empty pathname
      if (!pathname || pathname === '/') return null;
      
      // Extract file extension
      const lastDotIndex = pathname.lastIndexOf('.');
      const lastSlashIndex = pathname.lastIndexOf('/');
      
      // Ensure the dot is in the filename, not in a directory name
      if (lastDotIndex === -1 || lastDotIndex < lastSlashIndex) return null;
      
      const extension = pathname.substring(lastDotIndex);
      
      // Validate extension format (should be at least 2 characters: dot + letter)
      if (extension.length < 2 || !/^\.[\w]+$/.test(extension)) return null;
      
      const formatConfig = this.formatConfigService.getConfig();
      
      // Find matching format in supported formats
      for (const [formatName, config] of Object.entries(formatConfig.supportedFormats)) {
        if (config.extensions.includes(extension)) {
          return formatName;
        }
      }
      
      // Check rejected formats too
      for (const [formatName, config] of Object.entries(formatConfig.rejectedFormats)) {
        if (config.extensions.includes(extension)) {
          return formatName;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error parsing URL for format detection:', error);
      return null;
    }
  }

  /**
   * Extracts format from MIME type
   * @param mimeType - MIME type string
   * @returns Detected format or null
   */
  getFormatFromMimeType(mimeType: string): string | null {
    if (!mimeType || typeof mimeType !== 'string') return null;

    const normalizedMimeType = mimeType.toLowerCase().trim();
    const formatConfig = this.formatConfigService.getConfig();
    
    // Check supported formats
    for (const [formatName, config] of Object.entries(formatConfig.supportedFormats)) {
      if (config.mimeTypes.includes(normalizedMimeType)) {
        return formatName;
      }
    }
    
    // Check rejected formats
    for (const [formatName, config] of Object.entries(formatConfig.rejectedFormats)) {
      if (config.mimeTypes.includes(normalizedMimeType)) {
        return formatName;
      }
    }
    
    return null;
  }

  /**
   * Extracts MIME type from Wikimedia Commons extmetadata
   * @param extmetadata - Wikimedia extmetadata object
   * @returns Extracted MIME type or null
   */
  extractMimeTypeFromWikimediaMetadata(extmetadata: any): string | null {
    if (!extmetadata || typeof extmetadata !== 'object') {
      return null;
    }

    // Extract MIME type from Wikimedia extmetadata structure
    const mimeTypeField = extmetadata.MimeType;
    if (mimeTypeField && typeof mimeTypeField === 'object' && mimeTypeField.value) {
      const mimeType = mimeTypeField.value;
      if (typeof mimeType === 'string' && mimeType.trim()) {
        return mimeType.trim();
      }
    }

    return null;
  }

  /**
   * Validates MIME type from Wikimedia metadata with prioritization logic
   * @param url - Image URL for fallback detection
   * @param extmetadata - Wikimedia extmetadata object
   * @returns Promise resolving to validation result
   */
  async validateWithWikimediaMetadata(url: string, extmetadata: any): Promise<FormatValidationResult> {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        rejectionReason: 'Invalid URL provided',
        confidence: 1.0,
        detectionMethod: 'input-validation'
      };
    }

    // Extract MIME type from Wikimedia metadata
    const extractedMimeType = this.extractMimeTypeFromWikimediaMetadata(extmetadata);
    
    // Try MIME type detection first (highest priority)
    if (extractedMimeType) {
      const mimeTypeResult = await this.validateViaMimeType(url, extractedMimeType);
      if (mimeTypeResult.confidence >= 0.8) {
        return mimeTypeResult;
      }
    }

    // Fall back to URL extension detection
    const urlResult = await this.validateViaUrlExtension(url);
    if (urlResult.confidence >= 0.7) {
      // If both MIME type and URL extension are available but conflict, log warning
      if (extractedMimeType && urlResult.detectedFormat) {
        const mimeTypeFormat = this.getFormatFromMimeType(extractedMimeType);
        if (mimeTypeFormat && mimeTypeFormat !== urlResult.detectedFormat) {
          console.warn('Format conflict detected:', {
            url,
            mimeTypeFormat,
            urlFormat: urlResult.detectedFormat,
            mimeType: extractedMimeType
          });
        }
      }
      return urlResult;
    }

    // If no reliable detection method worked, return failure
    return {
      isValid: false,
      rejectionReason: 'Unable to determine image format from metadata or URL',
      confidence: 0.0,
      detectionMethod: 'wikimedia-metadata-validation'
    };
  }

  /**
   * Validates image format using MIME type detection
   * @param url - Image URL
   * @param mimeType - MIME type string
   * @returns Promise resolving to validation result
   */
  private async validateViaMimeType(url: string, mimeType: string): Promise<FormatValidationResult> {
    if (!mimeType) {
      return {
        isValid: false,
        confidence: 0.0,
        detectionMethod: 'mime-type',
        rejectionReason: 'No MIME type available'
      };
    }

    const detectedFormat = this.getFormatFromMimeType(mimeType);
    if (!detectedFormat) {
      return {
        isValid: false,
        confidence: 0.8,
        detectionMethod: 'mime-type',
        detectedMimeType: mimeType,
        rejectionReason: 'Unknown MIME type'
      };
    }

    const isSupported = this.isFormatSupported(detectedFormat);
    return {
      isValid: isSupported,
      detectedFormat,
      detectedMimeType: mimeType,
      confidence: 0.9,
      detectionMethod: 'mime-type',
      rejectionReason: isSupported ? undefined : this.getRejectionReason(detectedFormat)
    };
  }

  /**
   * Validates image format using URL extension detection
   * @param url - Image URL
   * @returns Promise resolving to validation result
   */
  private async validateViaUrlExtension(url: string): Promise<FormatValidationResult> {
    const detectedFormat = this.getFormatFromUrl(url);
    if (!detectedFormat) {
      return {
        isValid: false,
        confidence: 0.0,
        detectionMethod: 'url-extension',
        rejectionReason: 'No recognizable file extension'
      };
    }

    const isSupported = this.isFormatSupported(detectedFormat);
    return {
      isValid: isSupported,
      detectedFormat,
      confidence: 0.7,
      detectionMethod: 'url-extension',
      rejectionReason: isSupported ? undefined : this.getRejectionReason(detectedFormat)
    };
  }

  /**
   * Checks if a format is supported
   * @param format - Format name to check
   * @returns true if format is supported
   */
  isFormatSupported(format: string): boolean {
    const formatConfig = this.formatConfigService.getConfig();
    const config = formatConfig.supportedFormats[format];
    return config ? config.enabled : false;
  }

  /**
   * Gets the current format configuration
   * @returns Current format configuration
   */
  getFormatConfig(): FormatConfig {
    return this.formatConfigService.getConfig();
  }

  /**
   * Updates the format configuration
   * @param newConfig - New configuration to apply
   * @returns Validation result indicating success or failure with details
   */
  updateFormatConfig(newConfig: FormatConfig) {
    return this.formatConfigService.updateConfig(newConfig);
  }

  /**
   * Resets format configuration to default values
   */
  resetFormatConfigToDefault(): void {
    this.formatConfigService.resetToDefault();
  }

  /**
   * Gets the default format configuration
   * @returns Default format configuration
   */
  getDefaultFormatConfig(): FormatConfig {
    return this.formatConfigService.getDefaultConfig();
  }

  /**
   * Gets rejection reason for a format
   * @param format - Format name
   * @returns Rejection reason or generic message
   */
  private getRejectionReason(format: string): string {
    const formatConfig = this.formatConfigService.getConfig();
    const rejectedConfig = formatConfig.rejectedFormats[format];
    if (rejectedConfig) {
      return rejectedConfig.reason;
    }
    
    return 'Format not supported for web display';
  }

  /**
   * Checks if URL is valid for HTTP requests
   * @param url - URL to validate
   * @returns true if URL is valid for HTTP requests
   */
  private isValidHttpUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Initializes format detection strategies
   */
  private initializeDetectionStrategies(): void {
    // MIME type detection (highest priority)
    this.detectionStrategies.push({
      name: 'mime-type',
      priority: 1,
      detect: async (url: string, metadata?: any): Promise<FormatValidationResult> => {
        // Try to extract MIME type from Wikimedia metadata first
        let mimeType = metadata?.mimeType;
        
        // If metadata contains extmetadata (Wikimedia structure), extract from there
        if (!mimeType && metadata?.extmetadata) {
          mimeType = this.extractMimeTypeFromWikimediaMetadata(metadata.extmetadata);
        }
        
        if (!mimeType) {
          return {
            isValid: false,
            confidence: 0.0,
            detectionMethod: 'mime-type',
            rejectionReason: 'No MIME type available'
          };
        }

        const detectedFormat = this.getFormatFromMimeType(mimeType);
        if (!detectedFormat) {
          return {
            isValid: false,
            confidence: 0.8,
            detectionMethod: 'mime-type',
            detectedMimeType: mimeType,
            rejectionReason: 'Unknown MIME type'
          };
        }

        const isSupported = this.isFormatSupported(detectedFormat);
        return {
          isValid: isSupported,
          detectedFormat,
          detectedMimeType: mimeType,
          confidence: 0.9,
          detectionMethod: 'mime-type',
          rejectionReason: isSupported ? undefined : this.getRejectionReason(detectedFormat)
        };
      }
    });

    // URL extension detection (medium priority)
    this.detectionStrategies.push({
      name: 'url-extension',
      priority: 2,
      detect: async (url: string): Promise<FormatValidationResult> => {
        const detectedFormat = this.getFormatFromUrl(url);
        if (!detectedFormat) {
          return {
            isValid: false,
            confidence: 0.0,
            detectionMethod: 'url-extension',
            rejectionReason: 'No recognizable file extension'
          };
        }

        const isSupported = this.isFormatSupported(detectedFormat);
        return {
          isValid: isSupported,
          detectedFormat,
          confidence: 0.7,
          detectionMethod: 'url-extension',
          rejectionReason: isSupported ? undefined : this.getRejectionReason(detectedFormat)
        };
      }
    });

    // HTTP Content-Type detection (lowest priority, fallback)
    this.detectionStrategies.push({
      name: 'http-content-type',
      priority: 3,
      detect: async (url: string): Promise<FormatValidationResult> => {
        // Skip HTTP requests for obviously invalid URLs
        if (!this.isValidHttpUrl(url)) {
          return {
            isValid: false,
            confidence: 0.0,
            detectionMethod: 'url-validation',
            rejectionReason: 'Invalid URL for HTTP request'
          };
        }

        try {
          const contentType = await this.getContentTypeFromHttp(url);
          if (!contentType) {
            return {
              isValid: false,
              confidence: 0.0,
              detectionMethod: 'http-content-type',
              rejectionReason: 'Unable to retrieve Content-Type header'
            };
          }

          const detectedFormat = this.getFormatFromMimeType(contentType);
          if (!detectedFormat) {
            return {
              isValid: false,
              confidence: 0.6,
              detectionMethod: 'http-content-type',
              detectedMimeType: contentType,
              rejectionReason: 'Unknown Content-Type'
            };
          }

          const isSupported = this.isFormatSupported(detectedFormat);
          return {
            isValid: isSupported,
            detectedFormat,
            detectedMimeType: contentType,
            confidence: 0.8,
            detectionMethod: 'http-content-type',
            rejectionReason: isSupported ? undefined : this.getRejectionReason(detectedFormat)
          };
        } catch (error) {
          return {
            isValid: false,
            confidence: 0.0,
            detectionMethod: 'http-content-type',
            rejectionReason: 'HTTP request failed'
          };
        }
      }
    });
  }

  /**
   * Gets Content-Type header via HTTP HEAD request with comprehensive error handling
   * @param url - Image URL
   * @returns Promise resolving to Content-Type or null
   */
  private async getContentTypeFromHttp(url: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.head(url, { observe: 'response' })
          .pipe(
            timeout(this.formatConfigService.getConfig().fallbackBehavior.httpTimeoutMs),
            map(response => {
              const contentType = response.headers.get('content-type');
              return contentType ? contentType.split(';')[0].trim() : null;
            }),
            catchError(error => {
              // Enhanced error handling with detailed logging
              const isTimeout = this.isTimeoutError(error);
              const isNetwork = this.isNetworkError(error);
              const statusCode = this.extractHttpStatusCode(error);
              
              console.warn('HTTP HEAD request failed for format detection:', {
                url,
                error: error.message,
                isTimeout,
                isNetwork,
                statusCode,
                errorType: error.constructor.name
              });
              
              throw error; // Propagate the error with enhanced context
            })
          )
      );
      
      return response || null;
    } catch (error) {
      // Re-throw with additional context for upstream error handling
      throw new Error(`HTTP Content-Type detection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Checks if an error is a network-related error
   * @param error - Error to check
   * @returns true if error is network-related
   */
  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    return error instanceof HttpErrorResponse ||
           error.name === 'HttpErrorResponse' ||
           error.status !== undefined ||
           error.message?.includes('Http failure') ||
           error.message?.includes('Network') ||
           error.message?.includes('Connection') ||
           error.message?.includes('CORS');
  }

  /**
   * Checks if an error is a timeout error
   * @param error - Error to check
   * @returns true if error is timeout-related
   */
  private isTimeoutError(error: any): boolean {
    if (!error) return false;
    
    return error instanceof TimeoutError ||
           error.name === 'TimeoutError' ||
           error.message?.includes('Timeout') ||
           error.message?.includes('timeout') ||
           (error instanceof HttpErrorResponse && error.status === 0 && error.statusText === 'Unknown Error');
  }

  /**
   * Extracts HTTP status code from error if available
   * @param error - Error to extract status from
   * @returns HTTP status code or undefined
   */
  private extractHttpStatusCode(error: any): number | undefined {
    if (!error) return undefined;
    
    if (error instanceof HttpErrorResponse) {
      return error.status;
    }
    
    if (error.status !== undefined) {
      return error.status;
    }
    
    return undefined;
  }

  /**
   * Gets user-friendly error message for network errors
   * @param error - Network error
   * @param isTimeout - Whether error was due to timeout
   * @returns User-friendly error message
   */
  private getNetworkErrorMessage(error: Error, isTimeout: boolean): string {
    if (isTimeout) {
      return 'HTTP request timed out during format detection';
    }
    
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return 'Network connection failed during format detection';
        case 403:
          return 'Access forbidden during format detection';
        case 404:
          return 'Image not found during format detection';
        case 500:
        case 502:
        case 503:
        case 504:
          return 'Server error during format detection';
        default:
          return `HTTP error ${error.status} during format detection`;
      }
    }
    
    return `Network error during format detection: ${error.message}`;
  }

  /**
   * Gets performance metrics for monitoring
   * @returns Current performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceService.getMetrics();
  }

  /**
   * Gets performance health check results
   * @returns Performance health status with issues and recommendations
   */
  getPerformanceHealth() {
    return this.performanceService.checkPerformanceHealth();
  }

  /**
   * Gets performance summary for logging
   * @returns Performance summary string
   */
  getPerformanceSummary(): string {
    return this.performanceService.getPerformanceSummary();
  }

  /**
   * Resets performance metrics (useful for testing)
   */
  resetPerformanceMetrics(): void {
    this.performanceService.resetMetrics();
  }

  /**
   * Optimizes HTTP request patterns by batching Content-Type checks
   * @param urls - Array of URLs to check
   * @returns Promise resolving to map of URL to Content-Type
   */
  private async batchHttpContentTypeCheck(urls: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    if (urls.length === 0) {
      return results;
    }

    // Filter to only valid HTTP URLs
    const validUrls = urls.filter(url => this.isValidHttpUrl(url));
    
    if (validUrls.length === 0) {
      // Mark all invalid URLs as null
      urls.forEach(url => results.set(url, null));
      return results;
    }

    // Process URLs in smaller batches to avoid overwhelming the server
    const BATCH_SIZE = 3; // Conservative batch size for HTTP requests
    
    for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
      const batch = validUrls.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (url) => {
        try {
          const contentType = await this.getContentTypeFromHttp(url);
          return { url, contentType };
        } catch (error) {
          console.warn(`Batch HTTP Content-Type check failed for ${url}:`, error);
          return { url, contentType: null };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const url = batch[index];
        if (result.status === 'fulfilled') {
          results.set(url, result.value.contentType);
        } else {
          results.set(url, null);
        }
      });
      
      // Add small delay between batches to be respectful to servers
      if (i + BATCH_SIZE < validUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Mark any remaining URLs that weren't processed
    urls.forEach(url => {
      if (!results.has(url)) {
        results.set(url, null);
      }
    });

    return results;
  }
}