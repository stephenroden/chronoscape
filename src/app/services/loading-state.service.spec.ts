import { TestBed } from '@angular/core/testing';
import { LoadingStateService } from './loading-state.service';

describe('LoadingStateService', () => {
  let service: LoadingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get loading state', (done) => {
    const key = 'test-operation';
    const message = 'Testing...';

    service.startLoading(key, message);

    service.getLoadingState(key).subscribe(state => {
      expect(state.isLoading).toBe(true);
      expect(state.message).toBe(message);
      expect(state.progress).toBe(0);
      done();
    });
  });

  it('should update progress', (done) => {
    const key = 'test-progress';
    
    service.startLoading(key, 'Testing...');
    service.updateProgress(key, 50, 'Half way...');

    service.getLoadingState(key).subscribe(state => {
      expect(state.progress).toBe(50);
      expect(state.message).toBe('Half way...');
      done();
    });
  });

  it('should complete loading', (done) => {
    const key = 'test-complete';
    
    service.startLoading(key, 'Testing...');
    service.completeLoading(key, 'Done!');

    service.getLoadingState(key).subscribe(state => {
      expect(state.isLoading).toBe(false);
      expect(state.progress).toBe(100);
      expect(state.message).toBe('Done!');
      done();
    });
  });

  it('should handle errors', (done) => {
    const key = 'test-error';
    const errorMessage = 'Something went wrong';
    
    service.startLoading(key, 'Testing...');
    service.setError(key, errorMessage);

    service.getLoadingState(key).subscribe(state => {
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
      done();
    });
  });

  it('should track global loading state', (done) => {
    const key1 = 'test-1';
    const key2 = 'test-2';
    let hasSeenLoading = false;

    service.getGlobalLoadingState().subscribe(isLoading => {
      if (isLoading && !hasSeenLoading) {
        // Should be true when any operation is loading
        hasSeenLoading = true;
        expect(isLoading).toBe(true);
        
        // Complete all operations
        service.completeLoading(key1);
        service.completeLoading(key2);
      } else if (!isLoading && hasSeenLoading) {
        // Should be false when no operations are loading
        expect(isLoading).toBe(false);
        done();
      }
    });

    // Start loading operations
    service.startLoading(key1, 'Test 1');
    service.startLoading(key2, 'Test 2');
  });
});