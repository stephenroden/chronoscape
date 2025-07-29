import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';

/**
 * Interface for performance metrics
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'toggle' | 'zoom' | 'image' | 'render' | 'interaction';
  metadata?: Record<string, any>;
}

/**
 * Interface for performance thresholds
 */
export interface PerformanceThresholds {
  toggleTransition: number;
  imageLoad: number;
  zoomOperation: number;
  renderTime: number;
  interactionResponse: number;
}

/**
 * Interface for performance summary
 */
export interface PerformanceSummary {
  averageToggleTime: number;
  averageZoomTime: number;
  averageImageLoadTime: number;
  slowOperations: PerformanceMetric[];
  totalOperations: number;
  performanceScore: number;
}

/**
 * Service for monitoring performance of enhanced interface components
 * Tracks toggle transitions, zoom operations, image loading, and user interactions
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    toggleTransition: 500, // ms
    imageLoad: 2000, // ms
    zoomOperation: 100, // ms
    renderTime: 16, // ms (60fps)
    interactionResponse: 100 // ms
  };

  private metrics: PerformanceMetric[] = [];
  private activeTimers = new Map<string, number>();
  private thresholds = { ...this.DEFAULT_THRESHOLDS };
  private isEnabled = true;
  private maxMetricsHistory = 1000;

  private metricsSubject = new BehaviorSubject<PerformanceMetric[]>([]);
  private performanceSummarySubject = new BehaviorSubject<PerformanceSummary | null>(null);

  // Observable streams
  public readonly metrics$ = this.metricsSubject.asObservable();
  public readonly performanceSummary$ = this.performanceSummarySubject.asObservable();
  public readonly slowOperations$: Observable<PerformanceMetric[]>;

  constructor() {
    this.slowOperations$ = this.metrics$.pipe(
      map(metrics => metrics.filter(metric => this.isSlowOperation(metric)))
    );

    // Set up automatic performance summary updates
    this.metrics$.pipe(
      debounceTime(1000)
    ).subscribe(() => {
      this.updatePerformanceSummary();
    });

    // Monitor frame rate
    this.setupFrameRateMonitoring();

    // Monitor memory usage if available
    this.setupMemoryMonitoring();
  }

  /**
   * Start timing an operation
   * @param operationId - Unique identifier for the operation
   * @param category - Category of the operation
   * @param metadata - Additional metadata
   */
  startTiming(operationId: string, category: PerformanceMetric['category'], metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    this.activeTimers.set(operationId, startTime);

    // Store metadata for later use
    if (metadata) {
      this.activeTimers.set(`${operationId}_metadata`, metadata as any);
    }
  }

  /**
   * End timing an operation and record the metric
   * @param operationId - Unique identifier for the operation
   * @param operationName - Human-readable name for the operation
   */
  endTiming(operationId: string, operationName: string): void {
    if (!this.isEnabled) return;

    const endTime = performance.now();
    const startTime = this.activeTimers.get(operationId);
    
    if (startTime === undefined) {
      console.warn(`Performance timer not found for operation: ${operationId}`);
      return;
    }

    const duration = endTime - startTime;
    const metadata = this.activeTimers.get(`${operationId}_metadata`) as Record<string, any> | undefined;

    // Determine category based on operation name if not stored
    const category = this.getCategoryFromOperationName(operationName);

    const metric: PerformanceMetric = {
      name: operationName,
      value: duration,
      timestamp: endTime,
      category,
      metadata
    };

    this.recordMetric(metric);

    // Clean up timers
    this.activeTimers.delete(operationId);
    if (metadata) {
      this.activeTimers.delete(`${operationId}_metadata`);
    }

    // Log slow operations
    if (this.isSlowOperation(metric)) {
      console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Record a metric directly
   * @param metric - The metric to record
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Maintain history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    this.metricsSubject.next([...this.metrics]);
  }

  /**
   * Record a simple timing metric
   * @param name - Name of the operation
   * @param duration - Duration in milliseconds
   * @param category - Category of the operation
   * @param metadata - Additional metadata
   */
  recordTiming(
    name: string, 
    duration: number, 
    category: PerformanceMetric['category'], 
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value: duration,
      timestamp: performance.now(),
      category,
      metadata
    };

    this.recordMetric(metric);
  }

  /**
   * Measure and record the execution time of a function
   * @param name - Name of the operation
   * @param category - Category of the operation
   * @param fn - Function to measure
   * @param metadata - Additional metadata
   */
  async measureAsync<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) {
      return fn();
    }

    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordTiming(name, duration, category, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordTiming(name, duration, category, { 
        ...metadata, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Measure and record the execution time of a synchronous function
   * @param name - Name of the operation
   * @param category - Category of the operation
   * @param fn - Function to measure
   * @param metadata - Additional metadata
   */
  measureSync<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.isEnabled) {
      return fn();
    }

    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.recordTiming(name, duration, category, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordTiming(name, duration, category, { 
        ...metadata, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific category
   * @param category - Category to filter by
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.category === category);
  }

  /**
   * Get performance metrics within a time range
   * @param startTime - Start timestamp
   * @param endTime - End timestamp
   */
  getMetricsByTimeRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(metric => 
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  /**
   * Get average performance for a specific operation
   * @param operationName - Name of the operation
   */
  getAveragePerformance(operationName: string): number {
    const operationMetrics = this.metrics.filter(metric => metric.name === operationName);
    if (operationMetrics.length === 0) return 0;

    const total = operationMetrics.reduce((sum, metric) => sum + metric.value, 0);
    return total / operationMetrics.length;
  }

  /**
   * Get performance percentile for a specific operation
   * @param operationName - Name of the operation
   * @param percentile - Percentile to calculate (0-100)
   */
  getPerformancePercentile(operationName: string, percentile: number): number {
    const operationMetrics = this.metrics
      .filter(metric => metric.name === operationName)
      .map(metric => metric.value)
      .sort((a, b) => a - b);

    if (operationMetrics.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * operationMetrics.length) - 1;
    return operationMetrics[Math.max(0, index)];
  }

  /**
   * Clear all performance metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.metricsSubject.next([]);
    this.performanceSummarySubject.next(null);
  }

  /**
   * Set performance thresholds
   * @param thresholds - New thresholds to set
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current performance thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Enable or disable performance monitoring
   * @param enabled - Whether to enable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.activeTimers.clear();
    }
  }

  /**
   * Check if performance monitoring is enabled
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current performance summary
   */
  getCurrentSummary(): PerformanceSummary | null {
    return this.performanceSummarySubject.value;
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    metrics: PerformanceMetric[];
    summary: PerformanceSummary | null;
    thresholds: PerformanceThresholds;
    timestamp: number;
  } {
    return {
      metrics: [...this.metrics],
      summary: this.getCurrentSummary(),
      thresholds: this.getThresholds(),
      timestamp: Date.now()
    };
  }

  /**
   * Check if an operation is considered slow
   */
  private isSlowOperation(metric: PerformanceMetric): boolean {
    const threshold = this.getThresholdForCategory(metric.category);
    return metric.value > threshold;
  }

  /**
   * Get threshold for a specific category
   */
  private getThresholdForCategory(category: PerformanceMetric['category']): number {
    switch (category) {
      case 'toggle':
        return this.thresholds.toggleTransition;
      case 'zoom':
        return this.thresholds.zoomOperation;
      case 'image':
        return this.thresholds.imageLoad;
      case 'render':
        return this.thresholds.renderTime;
      case 'interaction':
        return this.thresholds.interactionResponse;
      default:
        return 1000; // Default threshold
    }
  }

  /**
   * Determine category from operation name
   */
  private getCategoryFromOperationName(operationName: string): PerformanceMetric['category'] {
    const name = operationName.toLowerCase();
    
    if (name.includes('toggle') || name.includes('transition')) {
      return 'toggle';
    }
    if (name.includes('zoom') || name.includes('pan')) {
      return 'zoom';
    }
    if (name.includes('image') || name.includes('load')) {
      return 'image';
    }
    if (name.includes('render') || name.includes('paint')) {
      return 'render';
    }
    if (name.includes('click') || name.includes('interaction')) {
      return 'interaction';
    }
    
    return 'interaction'; // Default category
  }

  /**
   * Update performance summary
   */
  private updatePerformanceSummary(): void {
    if (this.metrics.length === 0) {
      this.performanceSummarySubject.next(null);
      return;
    }

    const toggleMetrics = this.getMetricsByCategory('toggle');
    const zoomMetrics = this.getMetricsByCategory('zoom');
    const imageMetrics = this.getMetricsByCategory('image');
    const slowOperations = this.metrics.filter(metric => this.isSlowOperation(metric));

    const averageToggleTime = toggleMetrics.length > 0 
      ? toggleMetrics.reduce((sum, m) => sum + m.value, 0) / toggleMetrics.length 
      : 0;

    const averageZoomTime = zoomMetrics.length > 0 
      ? zoomMetrics.reduce((sum, m) => sum + m.value, 0) / zoomMetrics.length 
      : 0;

    const averageImageLoadTime = imageMetrics.length > 0 
      ? imageMetrics.reduce((sum, m) => sum + m.value, 0) / imageMetrics.length 
      : 0;

    // Calculate performance score (0-100, higher is better)
    const performanceScore = this.calculatePerformanceScore();

    const summary: PerformanceSummary = {
      averageToggleTime,
      averageZoomTime,
      averageImageLoadTime,
      slowOperations: slowOperations.slice(-10), // Last 10 slow operations
      totalOperations: this.metrics.length,
      performanceScore
    };

    this.performanceSummarySubject.next(summary);
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(): number {
    if (this.metrics.length === 0) return 100;

    const slowOperationRatio = this.metrics.filter(m => this.isSlowOperation(m)).length / this.metrics.length;
    const baseScore = Math.max(0, 100 - (slowOperationRatio * 100));

    // Adjust score based on specific operation performance
    const toggleScore = this.getOperationScore('toggle');
    const zoomScore = this.getOperationScore('zoom');
    const imageScore = this.getOperationScore('image');

    return Math.round((baseScore + toggleScore + zoomScore + imageScore) / 4);
  }

  /**
   * Get performance score for a specific operation category
   */
  private getOperationScore(category: PerformanceMetric['category']): number {
    const metrics = this.getMetricsByCategory(category);
    if (metrics.length === 0) return 100;

    const threshold = this.getThresholdForCategory(category);
    const averageTime = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    
    // Score based on how close to threshold
    const ratio = averageTime / threshold;
    return Math.max(0, Math.min(100, 100 - (ratio - 1) * 50));
  }

  /**
   * Set up frame rate monitoring
   */
  private setupFrameRateMonitoring(): void {
    if (typeof requestAnimationFrame === 'undefined') return;

    let lastTime = performance.now();
    let frameCount = 0;
    const frameTimes: number[] = [];

    const measureFrameRate = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      
      frameTimes.push(frameTime);
      frameCount++;

      // Report every 60 frames (approximately 1 second at 60fps)
      if (frameCount >= 60) {
        const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
        const fps = 1000 / averageFrameTime;
        
        this.recordTiming('Frame Rate', averageFrameTime, 'render', { 
          fps: Math.round(fps),
          frameCount: frameTimes.length 
        });

        // Reset for next measurement
        frameTimes.length = 0;
        frameCount = 0;
      }

      lastTime = currentTime;
      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  /**
   * Set up memory monitoring if available
   */
  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    // Monitor memory usage every 30 seconds
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        this.recordTiming('Memory Usage', memory.usedJSHeapSize / 1024 / 1024, 'render', {
          totalHeapSize: memory.totalJSHeapSize / 1024 / 1024,
          heapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024,
          unit: 'MB'
        });
      }
    }, 30000);
  }
}