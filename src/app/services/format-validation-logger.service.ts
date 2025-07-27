import { Injectable } from '@angular/core';
import { FormatValidationResult } from './format-validation.service';

/**
 * Structured log entry for format validation decisions
 */
export interface FormatValidationLog {
  timestamp: Date;
  photoUrl: string;
  detectedFormat?: string;
  detectedMimeType?: string;
  validationResult: boolean;
  rejectionReason?: string;
  validationTime: number;
  detectionMethod: string;
  confidence: number;
  errorDetails?: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
  };
  metadata?: {
    retryAttempt?: number;
    networkTimeout?: boolean;
    httpStatusCode?: number;
    fallbackUsed?: boolean;
  };
}

/**
 * Statistics for format validation monitoring
 */
export interface FormatValidationStats {
  totalValidations: number;
  successfulValidations: number;
  rejectedValidations: number;
  errorValidations: number;
  averageValidationTime: number;
  formatDistribution: { [format: string]: number };
  rejectionReasons: { [reason: string]: number };
  detectionMethods: { [method: string]: number };
  networkErrors: number;
  timeoutErrors: number;
}

/**
 * Service for comprehensive logging of format validation decisions
 */
@Injectable({
  providedIn: 'root'
})
export class FormatValidationLoggerService {
  private logs: FormatValidationLog[] = [];
  private readonly MAX_LOG_ENTRIES = 1000; // Prevent memory leaks
  private stats: FormatValidationStats = this.initializeStats();

  /**
   * Logs a format validation decision with detailed information
   * @param url - Photo URL being validated
   * @param result - Validation result
   * @param validationTime - Time taken for validation in milliseconds
   * @param error - Optional error information
   * @param metadata - Optional additional metadata
   */
  logValidation(
    url: string,
    result: FormatValidationResult,
    validationTime: number,
    error?: Error,
    metadata?: {
      retryAttempt?: number;
      networkTimeout?: boolean;
      httpStatusCode?: number;
      fallbackUsed?: boolean;
    }
  ): void {
    const logEntry: FormatValidationLog = {
      timestamp: new Date(),
      photoUrl: url,
      detectedFormat: result.detectedFormat,
      detectedMimeType: result.detectedMimeType,
      validationResult: result.isValid,
      rejectionReason: result.rejectionReason,
      validationTime,
      detectionMethod: result.detectionMethod,
      confidence: result.confidence,
      metadata
    };

    // Add error details if present
    if (error) {
      logEntry.errorDetails = {
        errorType: error.constructor.name,
        errorMessage: error.message,
        stackTrace: error.stack
      };
    }

    // Add to logs array (with size limit)
    this.logs.push(logEntry);
    if (this.logs.length > this.MAX_LOG_ENTRIES) {
      this.logs.shift(); // Remove oldest entry
    }

    // Update statistics
    this.updateStats(logEntry);

    // Log to console with appropriate level
    this.logToConsole(logEntry);
  }

  /**
   * Logs successful format validation
   * @param url - Photo URL
   * @param result - Validation result
   * @param validationTime - Time taken for validation
   */
  logSuccess(url: string, result: FormatValidationResult, validationTime: number): void {
    this.logValidation(url, result, validationTime);
  }

  /**
   * Logs format validation rejection
   * @param url - Photo URL
   * @param result - Validation result
   * @param validationTime - Time taken for validation
   */
  logRejection(url: string, result: FormatValidationResult, validationTime: number): void {
    this.logValidation(url, result, validationTime);
  }

  /**
   * Logs format validation error
   * @param url - Photo URL
   * @param error - Error that occurred
   * @param validationTime - Time taken before error
   * @param detectionMethod - Method that failed
   * @param metadata - Additional error metadata
   */
  logError(
    url: string,
    error: Error,
    validationTime: number,
    detectionMethod: string,
    metadata?: {
      retryAttempt?: number;
      networkTimeout?: boolean;
      httpStatusCode?: number;
      fallbackUsed?: boolean;
    }
  ): void {
    const errorResult: FormatValidationResult = {
      isValid: false,
      confidence: 0.0,
      detectionMethod,
      rejectionReason: `Error during validation: ${error.message}`
    };

    this.logValidation(url, errorResult, validationTime, error, metadata);
  }

  /**
   * Logs network-related errors during format detection
   * @param url - Photo URL
   * @param error - Network error
   * @param validationTime - Time taken before error
   * @param isTimeout - Whether error was due to timeout
   * @param httpStatusCode - HTTP status code if available
   */
  logNetworkError(
    url: string,
    error: Error,
    validationTime: number,
    isTimeout: boolean = false,
    httpStatusCode?: number
  ): void {
    this.logError(url, error, validationTime, 'http-content-type', {
      networkTimeout: isTimeout,
      httpStatusCode
    });
  }

  /**
   * Gets recent validation logs
   * @param limit - Maximum number of logs to return
   * @returns Array of recent log entries
   */
  getRecentLogs(limit: number = 100): FormatValidationLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Gets validation statistics
   * @returns Current validation statistics
   */
  getStats(): FormatValidationStats {
    return { ...this.stats };
  }

  /**
   * Gets logs filtered by criteria
   * @param criteria - Filter criteria
   * @returns Filtered log entries
   */
  getFilteredLogs(criteria: {
    validationResult?: boolean;
    detectionMethod?: string;
    hasError?: boolean;
    minConfidence?: number;
    maxConfidence?: number;
    since?: Date;
  }): FormatValidationLog[] {
    return this.logs.filter(log => {
      if (criteria.validationResult !== undefined && log.validationResult !== criteria.validationResult) {
        return false;
      }
      if (criteria.detectionMethod && log.detectionMethod !== criteria.detectionMethod) {
        return false;
      }
      if (criteria.hasError !== undefined && !!log.errorDetails !== criteria.hasError) {
        return false;
      }
      if (criteria.minConfidence !== undefined && log.confidence < criteria.minConfidence) {
        return false;
      }
      if (criteria.maxConfidence !== undefined && log.confidence > criteria.maxConfidence) {
        return false;
      }
      if (criteria.since && log.timestamp < criteria.since) {
        return false;
      }
      return true;
    });
  }

  /**
   * Clears all logs and resets statistics
   */
  clearLogs(): void {
    this.logs = [];
    this.stats = this.initializeStats();
  }

  /**
   * Gets rejection patterns for monitoring
   * @returns Object with rejection pattern analysis
   */
  getRejectionPatterns(): {
    commonReasons: Array<{ reason: string; count: number; percentage: number }>;
    formatDistribution: Array<{ format: string; count: number; percentage: number }>;
    methodEffectiveness: Array<{ method: string; successRate: number; avgConfidence: number }>;
  } {
    const totalValidations = this.stats.totalValidations;
    
    // Common rejection reasons
    const commonReasons = Object.entries(this.stats.rejectionReasons)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalValidations > 0 ? (count / totalValidations) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Format distribution
    const formatDistribution = Object.entries(this.stats.formatDistribution)
      .map(([format, count]) => ({
        format,
        count,
        percentage: totalValidations > 0 ? (count / totalValidations) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Method effectiveness
    const methodStats = this.calculateMethodEffectiveness();
    const methodEffectiveness = Object.entries(methodStats)
      .map(([method, stats]) => ({
        method,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
        avgConfidence: stats.total > 0 ? stats.totalConfidence / stats.total : 0
      }))
      .sort((a, b) => b.successRate - a.successRate);

    return {
      commonReasons,
      formatDistribution,
      methodEffectiveness
    };
  }

  /**
   * Initializes empty statistics object
   */
  private initializeStats(): FormatValidationStats {
    return {
      totalValidations: 0,
      successfulValidations: 0,
      rejectedValidations: 0,
      errorValidations: 0,
      averageValidationTime: 0,
      formatDistribution: {},
      rejectionReasons: {},
      detectionMethods: {},
      networkErrors: 0,
      timeoutErrors: 0
    };
  }

  /**
   * Updates statistics with new log entry
   */
  private updateStats(logEntry: FormatValidationLog): void {
    this.stats.totalValidations++;
    
    // Update validation result counts
    if (logEntry.errorDetails) {
      this.stats.errorValidations++;
      
      // Track network and timeout errors
      if (logEntry.metadata?.networkTimeout) {
        this.stats.timeoutErrors++;
      }
      if (logEntry.detectionMethod === 'http-content-type' && logEntry.errorDetails) {
        this.stats.networkErrors++;
      }
    } else if (logEntry.validationResult) {
      this.stats.successfulValidations++;
    } else {
      this.stats.rejectedValidations++;
    }

    // Update average validation time
    const totalTime = this.stats.averageValidationTime * (this.stats.totalValidations - 1) + logEntry.validationTime;
    this.stats.averageValidationTime = totalTime / this.stats.totalValidations;

    // Update format distribution
    if (logEntry.detectedFormat) {
      this.stats.formatDistribution[logEntry.detectedFormat] = 
        (this.stats.formatDistribution[logEntry.detectedFormat] || 0) + 1;
    }

    // Update rejection reasons
    if (logEntry.rejectionReason) {
      this.stats.rejectionReasons[logEntry.rejectionReason] = 
        (this.stats.rejectionReasons[logEntry.rejectionReason] || 0) + 1;
    }

    // Update detection methods
    this.stats.detectionMethods[logEntry.detectionMethod] = 
      (this.stats.detectionMethods[logEntry.detectionMethod] || 0) + 1;
  }

  /**
   * Logs entry to console with appropriate level
   */
  private logToConsole(logEntry: FormatValidationLog): void {
    const baseMessage = `Format validation: ${logEntry.photoUrl}`;
    const details = {
      result: logEntry.validationResult ? 'ACCEPTED' : 'REJECTED',
      format: logEntry.detectedFormat || 'unknown',
      method: logEntry.detectionMethod,
      confidence: logEntry.confidence,
      time: `${logEntry.validationTime}ms`
    };

    if (logEntry.errorDetails) {
      console.error(`${baseMessage} - ERROR`, {
        ...details,
        error: logEntry.errorDetails.errorMessage,
        errorType: logEntry.errorDetails.errorType
      });
    } else if (!logEntry.validationResult) {
      console.warn(`${baseMessage} - REJECTED`, {
        ...details,
        reason: logEntry.rejectionReason
      });
    } else {
      console.log(`${baseMessage} - ACCEPTED`, details);
    }
  }

  /**
   * Calculates method effectiveness statistics
   */
  private calculateMethodEffectiveness(): {
    [method: string]: {
      total: number;
      successful: number;
      totalConfidence: number;
    };
  } {
    const methodStats: {
      [method: string]: {
        total: number;
        successful: number;
        totalConfidence: number;
      };
    } = {};

    this.logs.forEach(log => {
      if (!methodStats[log.detectionMethod]) {
        methodStats[log.detectionMethod] = {
          total: 0,
          successful: 0,
          totalConfidence: 0
        };
      }

      const stats = methodStats[log.detectionMethod];
      stats.total++;
      stats.totalConfidence += log.confidence;
      
      if (log.validationResult && !log.errorDetails) {
        stats.successful++;
      }
    });

    return methodStats;
  }
}