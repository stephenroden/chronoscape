# Implementation Plan

- [x] 1. Set up Angular project structure and core dependencies

  - Create new Angular project with NgRx, Leaflet, and testing dependencies
  - Configure TypeScript strict mode and linting rules
  - Set up project folder structure for components, services, and state management
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 2. Implement core data models and interfaces

  - Create TypeScript interfaces for Photo, Coordinates, GameState, and scoring models
  - Implement validation functions for photo metadata and user input
  - Write unit tests for data model validation and type safety
  - _Requirements: 5.2, 5.3, 2.2, 3.2_

- [x] 3. Set up NgRx store architecture

  - Configure NgRx store with game, photo, and scoring feature states
  - Create action definitions for game flow, photo loading, and scoring
  - Implement reducers for each feature state with immutable updates
  - Write unit tests for actions and reducers
  - _Requirements: 8.2, 8.4_

- [x] 4. Implement Wikipedia/Wikimedia Commons API service

  - Create PhotoService with methods to fetch photos from Wikimedia Commons API
  - Implement metadata parsing to extract year, coordinates, and image URLs
  - Add filtering logic to ensure photos meet date and location requirements
  - Write unit tests with mocked API responses
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 5. Create NgRx effects for photo loading

  - Implement effects to handle asynchronous photo fetching from API
  - Add error handling for network failures and invalid photo data
  - Create selectors for photo state and loading indicators
  - Write unit tests for effects and selectors
  - _Requirements: 5.1, 5.6, 7.1_

- [x] 6. Implement scoring service and logic

  - Create ScoringService with methods to calculate year and location accuracy points
  - Implement distance calculation between coordinates using Haversine formula
  - Add scoring tiers based on accuracy ranges defined in requirements
  - Write comprehensive unit tests for all scoring scenarios
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 7. Create map service with Leaflet integration

  - Implement MapService to initialize Leaflet maps with OpenStreetMap tiles
  - Add methods for pin placement, coordinate retrieval, and distance calculation
  - Implement zoom and pan functionality for precise location selection
  - Write unit tests for map interactions and coordinate handling
  - _Requirements: 3.1, 3.2, 3.3, 7.3_

- [x] 8. Build main game container component

  - Create GameComponent to orchestrate overall game flow and state
  - Implement game lifecycle management (start, progress tracking, completion)
  - Add progress indicators showing current photo number out of five
  - Connect component to NgRx store for game state management
  - Write unit tests for game flow logic and state transitions
  - _Requirements: 1.1, 1.3, 1.4, 6.1_

- [x] 9. Implement photo display component

  - Create PhotoDisplayComponent to render current photograph with loading states
  - Add responsive image display that works across desktop, tablet, and mobile
  - Implement error handling for failed image loads with fallback messaging
  - Write unit tests for component rendering and responsive behavior
  - _Requirements: 1.2, 7.2, 7.4_

- [x] 10. Build year guessing input component

  - Create YearGuessComponent with form validation for 4-digit years (1900+)
  - Implement input field with proper validation messages and constraints
  - Add form submission handling that dispatches guess actions to store
  - Write unit tests for input validation and form submission
  - _Requirements: 2.1, 2.2_

- [x] 11. Create interactive map guessing component

  - Build MapGuessComponent that integrates with MapService for pin placement
  - Implement click handlers for map interaction and pin positioning
  - Add pin adjustment functionality allowing users to refine their guess
  - Write unit tests for map interactions and pin placement logic
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 12. Implement results display component

  - Create ResultsComponent to show correct answers alongside user guesses
  - Display points earned for both year and location accuracy
  - Show both user's pin and correct location pin on the map
  - Add "Next Photo" button functionality to advance game state
  - Write unit tests for results display and navigation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 13. Build final score summary component

  - Create ScoreSummaryComponent displaying total score out of 50,000 points
  - Implement score breakdown showing points per photo and category performance
  - Add performance categorization logic based on total score ranges
  - Include "New Game" button to reset game state and start over
  - Write unit tests for score calculations and display logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 14. Implement NgRx effects for scoring workflow

  - Create effects to handle guess submission and score calculation
  - Add effects for transitioning between photos and managing game completion
  - Implement selectors for current scores, total points, and game progress
  - Write unit tests for scoring effects and state transitions
  - _Requirements: 2.3, 3.4, 4.1, 6.1_

- [ ] 15. Add comprehensive error handling and loading states

  - Implement error handling throughout the application for network failures
  - Add loading indicators for photo fetching and map initialization
  - Create user-friendly error messages for various failure scenarios
  - Write unit tests for error scenarios and loading state management
  - _Requirements: 1.5, 7.1, 7.5_

- [ ] 16. Implement responsive design and accessibility features

  - Add CSS media queries and responsive layouts for mobile, tablet, and desktop
  - Implement keyboard navigation support for all interactive elements
  - Add ARIA labels and screen reader support for accessibility compliance
  - Write tests for responsive behavior and accessibility features
  - _Requirements: 7.2, 8.5_

- [ ] 17. Create routing and navigation structure

  - Set up Angular routing for game flow (start screen, game play, results)
  - Implement route guards to prevent navigation during active games
  - Add navigation components and breadcrumb indicators
  - Write unit tests for routing logic and navigation guards
  - _Requirements: 1.1, 1.4, 6.4_

- [ ] 18. Integrate all components and test complete user workflow

  - Wire together all components, services, and state management
  - Test complete game flow from start to finish with real API integration
  - Verify scoring calculations work correctly with actual photo data
  - Run comprehensive integration tests covering all user scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 4.1, 6.1_

- [ ] 19. Optimize performance and implement caching strategies

  - Add image preloading for next photo in sequence
  - Implement caching for API responses to reduce network requests
  - Optimize map rendering and tile loading performance
  - Write performance tests and validate loading time requirements
  - _Requirements: 7.3, 7.4_

- [ ] 20. Final testing and code quality improvements
  - Achieve minimum 80% code coverage across all components and services
  - Run end-to-end tests covering complete user workflows
  - Perform code review and refactoring to ensure classes stay under 200 lines
  - Validate all requirements are met through comprehensive testing
  - _Requirements: 8.3, 8.4, 8.5_
