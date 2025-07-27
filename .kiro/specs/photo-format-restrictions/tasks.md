# Implementation Plan

- [x] 1. Create format validation service with core detection logic

  - Implement FormatValidationService with format detection methods
  - Add configuration for supported and rejected image formats
  - Create format detection strategies for MIME type and URL extension validation
  - Write unit tests for format detection logic and configuration handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2_

- [x] 2. Implement URL-based format detection

  - Create method to extract file extensions from image URLs
  - Handle query parameters and URL fragments in format detection
  - Add validation for common image file extensions (jpg, jpeg, png, webp)
  - Write unit tests for URL parsing and extension detection edge cases
  - _Requirements: 3.1, 3.4, 6.5_

- [x] 3. Add MIME type validation from Wikimedia metadata

  - Extract MIME type information from Wikimedia Commons extmetadata
  - Implement MIME type to format mapping logic
  - Add prioritization logic when both extension and MIME type are available
  - Write unit tests for MIME type extraction and validation
  - _Requirements: 3.2, 3.3, 5.3_

- [x] 4. Create HTTP Content-Type detection fallback

  - Implement HTTP HEAD request functionality for Content-Type detection
  - Add timeout and error handling for network requests
  - Create fallback chain: MIME type → URL extension → HTTP Content-Type
  - Write unit tests with mocked HTTP responses for Content-Type detection
  - _Requirements: 3.2, 3.3, 3.4, 6.4_

- [x] 5. Extend Photo model to include format metadata

  - Add format and mimeType fields to PhotoMetadata interface
  - Update validatePhotoMetadata function to handle new optional fields
  - Ensure backward compatibility with existing photo data
  - Write unit tests for enhanced photo model validation
  - _Requirements: 5.3, 6.1, 6.2_

- [x] 6. Integrate format validation into PhotoService

  - Modify processPhotoData method to include format validation
  - Add format validation before creating Photo objects
  - Implement logging for format validation decisions and rejections
  - Write unit tests for PhotoService integration with format validation
  - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.4_

- [x] 7. Enhance photo filtering with format restrictions

  - Update filterValidPhotos method to include format validation
  - Add format-based rejection logic with detailed logging
  - Ensure format validation integrates with existing metadata validation
  - Write unit tests for enhanced photo filtering logic
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

- [x] 8. Implement retry logic for insufficient valid photos

  - Add retry mechanism when format filtering reduces available photos
  - Implement expanding search radius on retry attempts
  - Create user-friendly error messages for format-related failures
  - Write unit tests for retry logic and error handling scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Add comprehensive error handling and logging

  - Implement detailed logging for all format validation decisions
  - Add error handling for network failures during format detection
  - Create structured logging with photo URLs and rejection reasons
  - Write unit tests for error scenarios and logging functionality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

- [x] 10. Create caching mechanism for format validation results

  - Implement cache for format validation results to improve performance
  - Add TTL-based cache expiration for validation results
  - Create cache key generation based on photo URLs and metadata
  - Write unit tests for caching functionality and cache invalidation
  - _Requirements: Performance optimization from design_

- [ ] 11. Add configuration management for supported formats

  - Create centralized configuration for supported and rejected formats
  - Implement easy format addition/removal through configuration updates
  - Add validation for format configuration structure
  - Write unit tests for configuration management and validation
  - _Requirements: 2.7, 5.5_

- [ ] 12. Implement comprehensive unit tests for format validation

  - Test format detection with various URL formats and edge cases
  - Test MIME type validation with different metadata structures
  - Test error handling for malformed URLs and network failures
  - Achieve minimum 90% code coverage for format validation components
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 13. Add integration tests for photo service enhancement

  - Test complete photo fetching workflow with format validation
  - Test retry logic when insufficient photos pass format validation
  - Test error scenarios and fallback behavior
  - Verify format validation doesn't break existing photo processing
  - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3_

- [ ] 14. Optimize performance and add monitoring

  - Implement batch validation for multiple photos
  - Add performance metrics tracking for validation speed
  - Optimize HTTP request patterns to minimize network calls
  - Write performance tests to ensure validation doesn't slow photo fetching
  - _Requirements: Performance considerations from design_

- [ ] 15. Final integration and end-to-end testing
  - Test complete game workflow with format validation enabled
  - Verify all photos load successfully in actual game sessions
  - Test error handling and user experience with format restrictions
  - Validate logging and monitoring functionality in realistic scenarios
  - _Requirements: 1.1, 1.3, 1.5, 4.4, 5.5_
