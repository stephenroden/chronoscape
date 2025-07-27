import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, firstValueFrom, TimeoutError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { FormatValidationLoggerService } from './format-validation-logger.service';

/**
 * Configuration for supported image formats
 */
export interface FormatConfig {
  supportedFormats: {
    [key: string]: {
      extensions: string[];
      mimeTypes: string[];
      enabled: boolean;
    };
  };
  rejectedFormats: {
    [key: string]: {
      extensions: string[];
      mimeTypes: string[];
      reason: string;
    };
  };
  fallbackBehavior: {
    retryCount: number;
    expandSearchRadius: boolean;
    httpTimeoutMs: number;
  };
}

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
 * Service for validating image formats to ensure web compatibility
 */
@Injectable({
  providedIn: 'root'
})
export class FormatValidationService {
  private readonly formatConfig: FormatConfig = {
    supportedFormats: {
      jpeg: {
        extensions: ['.jpg', '.jpeg'],
        mimeTypes: ['image/jpeg'],
        enabled: true
      },
      png: {
        extensions: ['.png'],
        mimeTypes: ['image/png'],
        enabled: true
      },
      webp: {
        extensions: ['.webp'],
        mimeTypes: ['image/webp'],
        enabled: true
      }
    },
    rejectedFormats: {
      tiff: {
        extensions: ['.tiff', '.tif'],
        mimeTypes: ['image/tiff'],
        reason: 'Limited browser support'
      },
      svg: {
        extensions: ['.svg'],
        mimeTypes: ['image/svg+xml'],
        reason: 'Not suitable for photographs'
      },
      gif: {
        extensions: ['.gif'],
        mimeTypes: ['image/gif'],
        reason: 'Avoid animated content'
      },
      bmp: {
        extensions: ['.bmp'],
        mimeTypes: ['image/bmp'],
        reason: 'Large file sizes, limited web optimization'
      }
    },
    fallbackBehavior: {
      retryCount: 3,
      expandSearchRadius: true,
      httpTimeoutMs: 5000
    }
  };

  private detectionStrategies: FormatDetectionStrategy[] = [];

  constructor(
    private http: HttpClient,
    private logger: FormatValidationLoggerService
  ) {
    this.initializeDetectionStrategies();
  }

  /**
   * Validates image format using multiple detection strategies with comprehensive logging
   * @param url - Image URL to validate
   * @param mimeType - Optional MIME type from metadata
   * @param metadata - Optional metadata object (can contain extmetadata for Wikimedia)
   * @returns Promise resolving to validation result
   */
  async validateImageFormat(url: string, mimeType?: string, metadata?: any): Promise<FormatValidationResult> {
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
      if (bestResult.isValid) {
        this.logger.logSuccess(url, bestResult, validationTime);
      } else {
        this.logger.logRejection(url, bestResult, validationTime);
      }
      return bestResult;
    }
    
    // If we have a last result (even with low confidence), use it instead of generic failure
    if (lastResult) {
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
    return Object.keys(this.formatConfig.supportedFormats)
      .filter(format => this.formatConfig.supportedFormats[format].enabled);
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
      
      // Find matching format in supported formats
      for (const [formatName, config] of Object.entries(this.formatConfig.supportedFormats)) {
        if (config.extensions.includes(extension)) {
          return formatName;
        }
      }
      
      // Check rejected formats too
      for (const [formatName, config] of Object.entries(this.formatConfig.rejectedFormats)) {
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
    
    // Check supported formats
    for (const [formatName, config] of Object.entries(this.formatConfig.supportedFormats)) {
      if (config.mimeTypes.includes(normalizedMimeType)) {
        return formatName;
      }
    }
    
    // Check rejected formats
    for (const [formatName, config] of Object.entries(this.formatConfig.rejectedFormats)) {
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
    const config = this.formatConfig.supportedFormats[format];
    return config ? config.enabled : false;
  }

  /**
   * Gets rejection reason for a format
   * @param format - Format name
   * @returns Rejection reason or generic message
   */
  private getRejectionReason(format: string): string {
    const rejectedConfig = this.formatConfig.rejectedFormats[format];
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
            timeout(this.formatConfig.fallbackBehavior.httpTimeoutMs),
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
}