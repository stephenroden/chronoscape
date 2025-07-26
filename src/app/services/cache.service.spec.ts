import { TestBed } from '@angular/core/testing';
import { of, delay } from 'rxjs';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { test: 'data' };
      service.set('test-key', testData);
      
      const retrieved = service.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = service.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      service.set('test-key', 'test-data');
      
      expect(service.has('test-key')).toBe(true);
      expect(service.has('non-existent')).toBe(false);
    });

    it('should delete specific keys', () => {
      service.set('test-key', 'test-data');
      expect(service.has('test-key')).toBe(true);
      
      service.delete('test-key');
      expect(service.has('test-key')).toBe(false);
    });

    it('should clear all cached data', () => {
      service.set('key1', 'data1');
      service.set('key2', 'data2');
      
      service.clear();
      
      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire data after TTL', (done) => {
      const shortTTL = 50; // 50ms
      service.set('test-key', 'test-data', { ttl: shortTTL });
      
      expect(service.has('test-key')).toBe(true);
      
      setTimeout(() => {
        expect(service.has('test-key')).toBe(false);
        done();
      }, shortTTL + 10);
    });

    it('should use default TTL when not specified', () => {
      service.set('test-key', 'test-data');
      expect(service.has('test-key')).toBe(true);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used items when max size is reached', () => {
      const maxSize = 3;
      
      // Fill cache to max size
      service.set('key1', 'data1', { maxSize });
      service.set('key2', 'data2', { maxSize });
      service.set('key3', 'data3', { maxSize });
      
      // Access key1 to make it recently used
      service.get('key1');
      
      // Add new item, should evict key2 (least recently used)
      service.set('key4', 'data4', { maxSize });
      
      expect(service.has('key1')).toBe(true); // Recently accessed
      expect(service.has('key2')).toBe(false); // Should be evicted
      expect(service.has('key3')).toBe(true);
      expect(service.has('key4')).toBe(true);
    });
  });

  describe('getOrSet Method', () => {
    it('should return cached data if available', (done) => {
      const testData = { cached: true };
      service.set('test-key', testData);
      
      const dataFn = jasmine.createSpy('dataFn').and.returnValue(of({ fresh: true }));
      
      service.getOrSet('test-key', dataFn).subscribe(result => {
        expect(result).toEqual(testData);
        expect(dataFn).not.toHaveBeenCalled();
        done();
      });
    });

    it('should execute function and cache result if not cached', (done) => {
      const freshData = { fresh: true };
      const dataFn = jasmine.createSpy('dataFn').and.returnValue(of(freshData));
      
      service.getOrSet('test-key', dataFn).subscribe(result => {
        expect(result).toEqual(freshData);
        expect(dataFn).toHaveBeenCalled();
        expect(service.get('test-key')).toEqual(freshData);
        done();
      });
    });

    it('should share observable to prevent multiple executions', (done) => {
      const dataFn = jasmine.createSpy('dataFn').and.returnValue(of('data').pipe(delay(10)));
      
      // Make multiple concurrent requests
      const obs1 = service.getOrSet('test-key', dataFn);
      const obs2 = service.getOrSet('test-key', dataFn);
      
      let completedCount = 0;
      const checkCompletion = () => {
        completedCount++;
        if (completedCount === 2) {
          expect(dataFn).toHaveBeenCalledTimes(1);
          done();
        }
      };
      
      obs1.subscribe(() => checkCompletion());
      obs2.subscribe(() => checkCompletion());
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      service.set('test-key', 'test-data');
      
      // Hit
      service.get('test-key');
      
      // Miss
      service.get('non-existent');
      
      const stats = service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should track cache size', () => {
      service.set('key1', 'data1');
      service.set('key2', 'data2');
      
      const stats = service.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries during cleanup', (done) => {
      const shortTTL = 50;
      service.set('key1', 'data1', { ttl: shortTTL });
      service.set('key2', 'data2', { ttl: 1000 }); // Long TTL
      
      setTimeout(() => {
        service.cleanup();
        
        expect(service.has('key1')).toBe(false); // Expired
        expect(service.has('key2')).toBe(true); // Not expired
        done();
      }, shortTTL + 10);
    });
  });

  describe('Performance', () => {
    it('should handle large number of cache operations efficiently', () => {
      const startTime = performance.now();
      
      // Perform many cache operations
      for (let i = 0; i < 1000; i++) {
        service.set(`key-${i}`, `data-${i}`);
      }
      
      for (let i = 0; i < 1000; i++) {
        service.get(`key-${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100); // 100ms threshold
    });
  });
});