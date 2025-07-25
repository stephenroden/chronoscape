import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Error types for categorizing different kinds of errors
 */
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  MAP = 'map',
  PHOTO = 'photo',
  SCORING = 'scoring',
  GAME = 'game',
  UNKNOWN = 'unknown'
}

/**
 * Structured error information
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  userMessage: string;
  code?: string | number;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

/**
 * Service for handling and categorizing errors throughout the application
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  /**
   * Processes various error types and returns structured error information
   * @param error - The error to process
   * @param context - Optional context about where the error occurred
   * @returns Structured error information
   */
  processError(error: any, context?: string): ErrorInfo {
    const timestamp = new Date();
    
    // Handle HTTP errors
    if (error instanceof HttpErrorResponse) {
      return this.processHttpError(error, timestamp);
    }
    
    // Handle JavaScript errors
    if (error instanceof Error) {
      return this.processJavaScriptError(error, timestamp, context);
    }
    
    // Handle string errors
    if (typeof error === 'string') {
      return this.processStringError(error, timestamp, context);
    }
    
    // Handle unknown error types
    return {
      type: ErrorType.UNKNOWN,
      message: 'An unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again.',
      details: error,
      timestamp,
      retryable: true
    };
  }

  /**
   * Processes HTTP errors from API calls
   */
  private processHttpError(error: HttpErrorResponse, timestamp: Date): ErrorInfo {
    let type = ErrorType.API;
    let userMessage = '';
    let retryable = true;

    switch (error.status) {
      case 0:
        type = ErrorType.NETWORK;
        userMessage = 'Network connection failed. Please check your internet connection and try again.';
        break;
      case 400:
        type = ErrorType.VALIDATION;
        userMessage = 'Invalid request. Please check your input and try again.';
        retryable = false;
        break;
      case 401:
        userMessage = 'Authentication required. Please refresh the page and try again.';
        retryable = false;
        break;
      case 403:
        userMessage = 'Access denied. You do not have permission to perform this action.';
        retryable = false;
        break;
      case 404:
        userMessage = 'The requested resource was not found. Please try again later.';
        break;
      case 429:
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        userMessage = 'Server error occurred. Please try again later.';
        break;
      default:
        userMessage = `An error occurred (${error.status}). Please try again.`;
    }

    return {
      type,
      message: error.message || `HTTP ${error.status} error`,
      userMessage,
      code: error.status,
      details: {
        url: error.url,
        statusText: error.statusText,
        body: error.error
      },
      timestamp,
      retryable
    };
  }

  /**
   * Processes JavaScript Error objects
   */
  private processJavaScriptError(error: Error, timestamp: Date, context?: string): ErrorInfo {
    let type = ErrorType.UNKNOWN;
    let userMessage = 'An unexpected error occurred. Please try again.';
    let retryable = true;

    // Categorize based on error message or context
    const message = error.message.toLowerCase();
    
    if (context) {
      const contextLower = context.toLowerCase();
      if (contextLower.includes('map')) {
        type = ErrorType.MAP;
        userMessage = 'Map loading failed. Please refresh the page and try again.';
      } else if (contextLower.includes('photo')) {
        type = ErrorType.PHOTO;
        userMessage = 'Photo loading failed. Please try again.';
      } else if (contextLower.includes('scoring')) {
        type = ErrorType.SCORING;
        userMessage = 'Score calculation failed. Please try again.';
      } else if (contextLower.includes('game')) {
        type = ErrorType.GAME;
        userMessage = 'Game error occurred. Please restart the game.';
      }
    }

    // Categorize based on error message
    if (message.includes('network') || message.includes('fetch')) {
      type = ErrorType.NETWORK;
      userMessage = 'Network error occurred. Please check your connection and try again.';
    } else if (message.includes('validation') || message.includes('invalid')) {
      type = ErrorType.VALIDATION;
      userMessage = 'Invalid input provided. Please check your entries and try again.';
      retryable = false;
    } else if (message.includes('map') || message.includes('leaflet')) {
      type = ErrorType.MAP;
      userMessage = 'Map error occurred. Please refresh the page and try again.';
    }

    return {
      type,
      message: error.message,
      userMessage,
      details: {
        stack: error.stack,
        name: error.name,
        context
      },
      timestamp,
      retryable
    };
  }

  /**
   * Processes string error messages
   */
  private processStringError(error: string, timestamp: Date, context?: string): ErrorInfo {
    let type = ErrorType.UNKNOWN;
    let userMessage = error;
    let retryable = true;

    const errorLower = error.toLowerCase();

    // Categorize based on error content
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      type = ErrorType.NETWORK;
      userMessage = 'Network connection failed. Please check your internet connection and try again.';
    } else if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      type = ErrorType.VALIDATION;
      retryable = false;
    } else if (errorLower.includes('map')) {
      type = ErrorType.MAP;
      userMessage = 'Map error occurred. Please refresh the page and try again.';
    } else if (errorLower.includes('photo')) {
      type = ErrorType.PHOTO;
      userMessage = 'Photo loading failed. Please try again.';
    } else if (errorLower.includes('score') || errorLower.includes('scoring')) {
      type = ErrorType.SCORING;
      userMessage = 'Score calculation failed. Please try again.';
    }

    return {
      type,
      message: error,
      userMessage,
      details: { context },
      timestamp,
      retryable
    };
  }

  /**
   * Gets user-friendly error messages for specific error types
   */
  getErrorMessage(errorType: ErrorType, defaultMessage?: string): string {
    const messages = {
      [ErrorType.NETWORK]: 'Network connection failed. Please check your internet connection and try again.',
      [ErrorType.API]: 'Service temporarily unavailable. Please try again later.',
      [ErrorType.VALIDATION]: 'Please check your input and try again.',
      [ErrorType.MAP]: 'Map loading failed. Please refresh the page and try again.',
      [ErrorType.PHOTO]: 'Photo loading failed. Please try again.',
      [ErrorType.SCORING]: 'Score calculation failed. Please try again.',
      [ErrorType.GAME]: 'Game error occurred. Please restart the game.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };

    return messages[errorType] || defaultMessage || messages[ErrorType.UNKNOWN];
  }

  /**
   * Determines if an error is retryable
   */
  isRetryable(error: ErrorInfo): boolean {
    return error.retryable && error.type !== ErrorType.VALIDATION;
  }

  /**
   * Logs error information for debugging
   */
  logError(error: ErrorInfo, context?: string): void {
    const logData = {
      type: error.type,
      message: error.message,
      userMessage: error.userMessage,
      code: error.code,
      timestamp: error.timestamp,
      context,
      details: error.details
    };

    if (error.type === ErrorType.NETWORK || error.type === ErrorType.API) {
      console.warn('Application Error:', logData);
    } else {
      console.error('Application Error:', logData);
    }
  }

  /**
   * Creates a retry function for retryable errors
   */
  createRetryHandler(originalAction: () => void, maxRetries: number = 3): (attempt?: number) => void {
    return (attempt: number = 1) => {
      if (attempt <= maxRetries) {
        try {
          originalAction();
        } catch (error) {
          const errorInfo = this.processError(error);
          if (this.isRetryable(errorInfo) && attempt < maxRetries) {
            // Exponential backoff: wait 1s, 2s, 4s, etc.
            const delay = Math.pow(2, attempt - 1) * 1000;
            setTimeout(() => {
              this.createRetryHandler(originalAction, maxRetries)(attempt + 1);
            }, delay);
          } else {
            throw error;
          }
        }
      }
    };
  }
}