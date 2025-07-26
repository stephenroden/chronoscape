import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

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

  constructor(private http: HttpClient) {
    this.initializeDetectionStrategies();
  }

  /**
   * Validates image format using multiple detection strategies
   * @param url - Image URL to validate
   * @param mimeType - Optional MIME type from metadata
   * @returns Promise resolving to validation result
   */
  async validateImageFormat(url: string, mimeType?: string): Promise<FormatValidationResult> {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        rejectionReason: 'Invalid URL provided',
        confidence: 1.0,
        detectionMethod: 'input-validation'
      };
    }

    // Try detection strategies in priority order
    const sortedStrategies = [...this.detectionStrategies].sort((a, b) => a.priority - b.priority);
    
    for (const strategy of sortedStrategies) {
      try {
        const result = await strategy.detect(url, { mimeType });
        
        // If we get a definitive result (high confidence), use it
        if (result.confidence >= 0.8) {
          return result;
        }
        
        // Store the best result so far for fallback
        if (result.detectedFormat) {
          const isSupported = this.isFormatSupported(result.detectedFormat);
          const rejectionReason = isSupported ? undefined : this.getRejectionReason(result.detectedFormat);
          
          return {
            ...result,
            isValid: isSupported,
            rejectionReason
          };
        }
      } catch (error) {
        console.warn(`Format detection strategy ${strategy.name} failed:`, error);
        continue;
      }
    }

    // If no strategy could determine the format, reject
    return {
      isValid: false,
      rejectionReason: 'Unable to determine image format',
      confidence: 0.0,
      detectionMethod: 'unknown'
    };
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
   * @param url - Image URL
   * @returns Detected format or null
   */
  getFormatFromUrl(url: string): string | null {
    if (!url) return null;

    try {
      // Parse URL and extract pathname, removing query parameters and fragments
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      // Extract file extension
      const lastDotIndex = pathname.lastIndexOf('.');
      if (lastDotIndex === -1) return null;
      
      const extension = pathname.substring(lastDotIndex);
      
      // Find matching format
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
    if (!mimeType) return null;

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
        const mimeType = metadata?.mimeType;
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
            detectionMethod: 'http-content-type',
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
   * Gets Content-Type header via HTTP HEAD request
   * @param url - Image URL
   * @returns Promise resolving to Content-Type or null
   */
  private async getContentTypeFromHttp(url: string): Promise<string | null> {
    try {
      const response = await this.http.head(url, { observe: 'response' })
        .pipe(
          timeout(this.formatConfig.fallbackBehavior.httpTimeoutMs),
          map(response => {
            const contentType = response.headers.get('content-type');
            return contentType ? contentType.split(';')[0].trim() : null;
          }),
          catchError(error => {
            console.warn('HTTP HEAD request failed for format detection:', error);
            return of(null);
          })
        )
        .toPromise();
      
      return response || null;
    } catch (error) {
      console.warn('HTTP HEAD request failed for format detection:', error);
      return null;
    }
  }
}