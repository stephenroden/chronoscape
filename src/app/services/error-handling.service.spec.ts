import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlingService, ErrorType } from './error-handling.service';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorHandlingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('processError', () => {
    it('should process HTTP network errors correctly', () => {
      const httpError = new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        url: 'https://example.com/api'
      });

      const result = service.processError(httpError);

      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.userMessage).toContain('Network connection failed');
      expect(result.retryable).toBe(true);
      expect(result.code).toBe(0);
    });

    it('should process HTTP 404 errors correctly', () => {
      const httpError = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        url: 'https://example.com/api'
      });

      const result = service.processError(httpError);

      expect(result.type).toBe(ErrorType.API);
      expect(result.userMessage).toContain('not found');
      expect(result.retryable).toBe(true);
      expect(result.code).toBe(404);
    });

    it('should process HTTP 400 validation errors correctly', () => {
      const httpError = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        url: 'https://example.com/api'
      });

      const result = service.processError(httpError);

      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.userMessage).toContain('Invalid request');
      expect(result.retryable).toBe(false);
      expect(result.code).toBe(400);
    });

    it('should process HTTP 429 rate limit errors correctly', () => {
      const httpError = new HttpErrorResponse({
        status: 429,
        statusText: 'Too Many Requests',
        url: 'https://example.com/api'
      });

      const result = service.processError(httpError);

      expect(result.type).toBe(ErrorType.API);
      expect(result.userMessage).toContain('Too many requests');
      expect(result.retryable).toBe(true);
      expect(result.code).toBe(429);
    });

    it('should process HTTP 500 server errors correctly', () => {
      const httpError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        url: 'https://example.com/api'
      });

      const result = service.processError(httpError);

      expect(result.type).toBe(ErrorType.API);
      expect(result.userMessage).toContain('Server error occurred');
      expect(result.retryable).toBe(true);
      expect(result.code).toBe(500);
    });

    it('should process JavaScript Error objects correctly', () => {
      const jsError = new Error('Test error message');

      const result = service.processError(jsError);

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Test error message');
      expect(result.userMessage).toContain('unexpected error');
      expect(result.retryable).toBe(true);
    });

    it('should categorize map errors correctly', () => {
      const mapError = new Error('Map initialization failed');

      const result = service.processError(mapError, 'map');

      expect(result.type).toBe(ErrorType.MAP);
      expect(result.userMessage).toContain('Map error occurred');
      expect(result.retryable).toBe(true);
    });

    it('should categorize photo errors correctly', () => {
      const photoError = new Error('Photo loading failed');

      const result = service.processError(photoError, 'photo');

      expect(result.type).toBe(ErrorType.PHOTO);
      expect(result.userMessage).toContain('Photo loading failed');
      expect(result.retryable).toBe(true);
    });

    it('should categorize scoring errors correctly', () => {
      const scoringError = new Error('Score calculation failed');

      const result = service.processError(scoringError, 'scoring');

      expect(result.type).toBe(ErrorType.SCORING);
      expect(result.userMessage).toContain('Score calculation failed');
      expect(result.retryable).toBe(true);
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid input provided');

      const result = service.processError(validationError);

      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.userMessage).toContain('Invalid input');
      expect(result.retryable).toBe(false);
    });

    it('should process string errors correctly', () => {
      const stringError = 'Network connection failed';

      const result = service.processError(stringError);

      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.message).toBe(stringError);
      expect(result.userMessage).toContain('Network connection failed');
      expect(result.retryable).toBe(true);
    });

    it('should process unknown error types correctly', () => {
      const unknownError = { someProperty: 'value' };

      const result = service.processError(unknownError);

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.userMessage).toContain('unexpected error');
      expect(result.retryable).toBe(true);
      expect(result.details).toBe(unknownError);
    });

    it('should include timestamp in error info', () => {
      const error = new Error('Test error');
      const beforeTime = new Date();

      const result = service.processError(error);

      const afterTime = new Date();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct message for network errors', () => {
      const message = service.getErrorMessage(ErrorType.NETWORK);
      expect(message).toContain('Network connection failed');
    });

    it('should return correct message for API errors', () => {
      const message = service.getErrorMessage(ErrorType.API);
      expect(message).toContain('Service temporarily unavailable');
    });

    it('should return correct message for validation errors', () => {
      const message = service.getErrorMessage(ErrorType.VALIDATION);
      expect(message).toContain('check your input');
    });

    it('should return correct message for map errors', () => {
      const message = service.getErrorMessage(ErrorType.MAP);
      expect(message).toContain('Map loading failed');
    });

    it('should return correct message for photo errors', () => {
      const message = service.getErrorMessage(ErrorType.PHOTO);
      expect(message).toContain('Photo loading failed');
    });

    it('should return correct message for scoring errors', () => {
      const message = service.getErrorMessage(ErrorType.SCORING);
      expect(message).toContain('Score calculation failed');
    });

    it('should return correct message for game errors', () => {
      const message = service.getErrorMessage(ErrorType.GAME);
      expect(message).toContain('Game error occurred');
    });

    it('should return default message for unknown errors', () => {
      const message = service.getErrorMessage(ErrorType.UNKNOWN);
      expect(message).toContain('unexpected error');
    });

    it('should return custom default message when provided for unknown error type', () => {
      const customMessage = 'Custom error message';
      // Use a non-existent error type to trigger the fallback
      const message = service.getErrorMessage('non-existent' as ErrorType, customMessage);
      expect(message).toBe(customMessage);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      const errorInfo = {
        type: ErrorType.NETWORK,
        message: 'Network error',
        userMessage: 'Network connection failed',
        timestamp: new Date(),
        retryable: true
      };

      expect(service.isRetryable(errorInfo)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const errorInfo = {
        type: ErrorType.VALIDATION,
        message: 'Validation error',
        userMessage: 'Invalid input',
        timestamp: new Date(),
        retryable: false
      };

      expect(service.isRetryable(errorInfo)).toBe(false);
    });

    it('should return false for validation errors even if marked retryable', () => {
      const errorInfo = {
        type: ErrorType.VALIDATION,
        message: 'Validation error',
        userMessage: 'Invalid input',
        timestamp: new Date(),
        retryable: true // This should be overridden
      };

      expect(service.isRetryable(errorInfo)).toBe(false);
    });
  });

  describe('logError', () => {
    it('should log network errors as warnings', () => {
      spyOn(console, 'warn');
      const errorInfo = {
        type: ErrorType.NETWORK,
        message: 'Network error',
        userMessage: 'Network connection failed',
        timestamp: new Date(),
        retryable: true
      };

      service.logError(errorInfo, 'test context');

      expect(console.warn).toHaveBeenCalledWith('Application Error:', jasmine.any(Object));
    });

    it('should log API errors as warnings', () => {
      spyOn(console, 'warn');
      const errorInfo = {
        type: ErrorType.API,
        message: 'API error',
        userMessage: 'Service unavailable',
        timestamp: new Date(),
        retryable: true
      };

      service.logError(errorInfo, 'test context');

      expect(console.warn).toHaveBeenCalledWith('Application Error:', jasmine.any(Object));
    });

    it('should log other errors as errors', () => {
      spyOn(console, 'error');
      const errorInfo = {
        type: ErrorType.VALIDATION,
        message: 'Validation error',
        userMessage: 'Invalid input',
        timestamp: new Date(),
        retryable: false
      };

      service.logError(errorInfo, 'test context');

      expect(console.error).toHaveBeenCalledWith('Application Error:', jasmine.any(Object));
    });
  });

  describe('createRetryHandler', () => {
    it('should create a retry handler that executes the action', () => {
      const mockAction = jasmine.createSpy('mockAction');
      const retryHandler = service.createRetryHandler(mockAction, 3);

      retryHandler();

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors up to max attempts', (done) => {
      let attemptCount = 0;
      const mockAction = jasmine.createSpy('mockAction').and.callFake(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network connection failed');
        }
      });

      const retryHandler = service.createRetryHandler(mockAction, 2);

      retryHandler();

      // Wait for retries to complete
      setTimeout(() => {
        expect(mockAction).toHaveBeenCalledTimes(2);
        done();
      }, 2500); // Wait for exponential backoff (1s + 2s)
    });

    it('should not retry non-retryable errors', () => {
      const mockAction = jasmine.createSpy('mockAction').and.throwError('Invalid input provided');
      const retryHandler = service.createRetryHandler(mockAction, 3);

      expect(() => retryHandler()).toThrowError('Invalid input provided');
      expect(mockAction).toHaveBeenCalledTimes(1);
    });
  });
});