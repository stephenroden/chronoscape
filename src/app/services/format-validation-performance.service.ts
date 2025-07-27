import { Injectable } from '@angular/core';

/**
 * Performance metrics for format validation operations
 */
export interface FormatValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  minValidationTime: number;
  maxValidationTime: number;
  cacheHitRate: number;
  networkRequestCount: number;
  batchValidationCount: number;
  averageBatchSize: number;
  detectionMethodStats: {
    [method: string]: {
      count: number;
      averageTime: number;
      successRate: number;
    };
  };
}

/**
 * Individual validation performance record
 */
interface ValidationPerformanceRecord {
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  detectionMethod: string;
  cacheHit: boolean;
  networkRequest: boolean;
  batchSize?: number;
}

/**
 * Service for tracking and monitoring format validation performance
 */
@Injectable({
  providedIn: 'root'
})
export class FormatValidationPerformanceService {
  private performanceRecords: ValidationPerformanceRecord[] = [];
  private readonly MAX_RECORDS = 1000; // Keep last 1000 records for analysis
  
  // Real-time metrics
  private totalValidations = 0;
  private successfulValidations = 0;
  private failedValidations = 0;
  private totalValidationTime = 0;
  private minValidationTime = Infinity;
  private maxValidationTime = 0;
  private networkRequestCount = 0;
  private batchValidationCount = 0;
  private totalBatchSize = 0;
  
  // Detection method statistics
  private detectionMethodStats = new Map<string, {
    count: number;
    totalTime: number;
    successCount: number;
  }>();

  /**
   * Records the start of a validation operation
   * @param url - URL being validated
   * @returns Performance tracking token
   */
  startValidation(url: string): string {
    const token = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return token;
  }

  /**
   * Records the completion of a validation operation
   * @param token - Performance tracking token from startValidation
   * @param url - URL that was validated
   * @param success - Whether validation was successful
   * @param detectionMethod - Method used for detection
   * @param cacheHit - Whether result came from cache
   * @param networkRequest - Whether a network request was made
   * @param batchSize - Size of batch if this was part of batch validation
   */
  endValidation(
    token: string,
    url: string,
    success: boolean,
    detectionMethod: string,
    cacheHit: boolean = false,
    networkRequest: boolean = false,
    batchSize?: number
  ): void {
    const endTime = Date.now();
    const startTime = parseInt(token.split('-')[0]);
    const duration = endTime - startTime;

    // Create performance record
    const record: ValidationPerformanceRecord = {
      url,
      startTime,
      endTime,
      duration,
      success,
      detectionMethod,
      cacheHit,
      networkRequest,
      batchSize
    };

    // Add to records (with size limit)
    this.performanceRecords.push(record);
    if (this.performanceRecords.length > this.MAX_RECORDS) {
      this.performanceRecords.shift();
    }

    // Update real-time metrics
    this.totalValidations++;
    if (success) {
      this.successfulValidations++;
    } else {
      this.failedValidations++;
    }

    this.totalValidationTime += duration;
    this.minValidationTime = Math.min(this.minValidationTime, duration);
    this.maxValidationTime = Math.max(this.maxValidationTime, duration);

    if (networkRequest) {
      this.networkRequestCount++;
    }

    if (batchSize !== undefined) {
      this.batchValidationCount++;
      this.totalBatchSize += batchSize;
    }

    // Update detection method statistics
    const methodKey = cacheHit ? `${detectionMethod}-cached` : detectionMethod;
    const methodStats = this.detectionMethodStats.get(methodKey) || {
      count: 0,
      totalTime: 0,
      successCount: 0
    };

    methodStats.count++;
    methodStats.totalTime += duration;
    if (success) {
      methodStats.successCount++;
    }

    this.detectionMethodStats.set(methodKey, methodStats);
  }

  /**
   * Records a batch validation operation
   * @param batchSize - Number of URLs validated in batch
   * @param totalTime - Total time for batch operation
   * @param successCount - Number of successful validations in batch
   */
  recordBatchValidation(batchSize: number, totalTime: number, successCount: number): void {
    this.batchValidationCount++;
    this.totalBatchSize += batchSize;
    
    // Record average time per validation in batch
    const avgTimePerValidation = totalTime / batchSize;
    this.totalValidationTime += totalTime;
    this.totalValidations += batchSize;
    this.successfulValidations += successCount;
    this.failedValidations += (batchSize - successCount);
  }

  /**
   * Gets current performance metrics
   * @returns Current performance metrics
   */
  getMetrics(): FormatValidationMetrics {
    const averageValidationTime = this.totalValidations > 0 
      ? this.totalValidationTime / this.totalValidations 
      : 0;

    const averageBatchSize = this.batchValidationCount > 0
      ? this.totalBatchSize / this.batchValidationCount
      : 0;

    // Calculate cache hit rate from recent records
    const recentRecords = this.performanceRecords.slice(-100); // Last 100 records
    const cacheHits = recentRecords.filter(r => r.cacheHit).length;
    const cacheHitRate = recentRecords.length > 0 ? (cacheHits / recentRecords.length) * 100 : 0;

    // Build detection method statistics
    const detectionMethodStats: { [method: string]: { count: number; averageTime: number; successRate: number } } = {};
    
    this.detectionMethodStats.forEach((stats, method) => {
      detectionMethodStats[method] = {
        count: stats.count,
        averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
        successRate: stats.count > 0 ? (stats.successCount / stats.count) * 100 : 0
      };
    });

    return {
      totalValidations: this.totalValidations,
      successfulValidations: this.successfulValidations,
      failedValidations: this.failedValidations,
      averageValidationTime: Math.round(averageValidationTime * 100) / 100,
      minValidationTime: this.minValidationTime === Infinity ? 0 : this.minValidationTime,
      maxValidationTime: this.maxValidationTime,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      networkRequestCount: this.networkRequestCount,
      batchValidationCount: this.batchValidationCount,
      averageBatchSize: Math.round(averageBatchSize * 100) / 100,
      detectionMethodStats
    };
  }

  /**
   * Gets recent performance records for detailed analysis
   * @param limit - Maximum number of records to return
   * @returns Array of recent performance records
   */
  getRecentRecords(limit: number = 50): ValidationPerformanceRecord[] {
    return this.performanceRecords.slice(-limit);
  }

  /**
   * Resets all performance metrics and records
   */
  resetMetrics(): void {
    this.performanceRecords = [];
    this.totalValidations = 0;
    this.successfulValidations = 0;
    this.failedValidations = 0;
    this.totalValidationTime = 0;
    this.minValidationTime = Infinity;
    this.maxValidationTime = 0;
    this.networkRequestCount = 0;
    this.batchValidationCount = 0;
    this.totalBatchSize = 0;
    this.detectionMethodStats.clear();
  }

  /**
   * Gets performance summary for logging/monitoring
   * @returns Performance summary string
   */
  getPerformanceSummary(): string {
    const metrics = this.getMetrics();
    
    return `Format Validation Performance Summary:
- Total Validations: ${metrics.totalValidations}
- Success Rate: ${metrics.totalValidations > 0 ? Math.round((metrics.successfulValidations / metrics.totalValidations) * 100) : 0}%
- Average Time: ${metrics.averageValidationTime}ms
- Cache Hit Rate: ${metrics.cacheHitRate}%
- Network Requests: ${metrics.networkRequestCount}
- Batch Operations: ${metrics.batchValidationCount} (avg size: ${metrics.averageBatchSize})`;
  }

  /**
   * Checks if performance is within acceptable thresholds
   * @returns Performance health check result
   */
  checkPerformanceHealth(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check average validation time (target: <100ms)
    if (metrics.averageValidationTime > 100) {
      issues.push(`Average validation time is ${metrics.averageValidationTime}ms (target: <100ms)`);
      recommendations.push('Consider optimizing detection strategies or increasing cache TTL');
    }

    // Check cache hit rate (target: >60%)
    if (metrics.cacheHitRate < 60) {
      issues.push(`Cache hit rate is ${metrics.cacheHitRate}% (target: >60%)`);
      recommendations.push('Consider increasing cache size or TTL');
    }

    // Check success rate (target: >90%)
    const successRate = metrics.totalValidations > 0 
      ? (metrics.successfulValidations / metrics.totalValidations) * 100 
      : 100;
    
    if (successRate < 90) {
      issues.push(`Success rate is ${successRate}% (target: >90%)`);
      recommendations.push('Review format detection strategies and error handling');
    }

    // Check network request ratio (target: <30% of validations)
    const networkRequestRatio = metrics.totalValidations > 0
      ? (metrics.networkRequestCount / metrics.totalValidations) * 100
      : 0;
    
    if (networkRequestRatio > 30) {
      issues.push(`Network request ratio is ${networkRequestRatio}% (target: <30%)`);
      recommendations.push('Improve MIME type and URL extension detection to reduce HTTP fallbacks');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}