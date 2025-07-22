# Requirements Document

## Introduction

Chronoscape is a web-based guessing game where players are presented with historical photographs from around the world and must guess both the year the photo was taken and the location where it was captured. The game dynamically sources photos from Wikipedia or similar services, ensuring a large and varied pool of content. Players earn points based on the accuracy of their guesses across five rounds, with a maximum of 10,000 points per photo (5,000 for year accuracy, 5,000 for location accuracy).

## Requirements

### Requirement 1

**User Story:** As a player, I want to be presented with five historical photographs one at a time, so that I can test my knowledge of world history and geography.

#### Acceptance Criteria

1. WHEN the game starts THEN the system SHALL display the first of five photographs
2. WHEN a photograph is displayed THEN the system SHALL hide all metadata including year and location information
3. WHEN the user completes their guess for a photo THEN the system SHALL advance to the next photo
4. WHEN all five photos have been guessed THEN the system SHALL display the final score summary
5. IF fewer than five suitable photos are available THEN the system SHALL display an error message

### Requirement 2

**User Story:** As a player, I want to guess the year a photograph was taken, so that I can demonstrate my historical knowledge and earn points.

#### Acceptance Criteria

1. WHEN viewing a photograph THEN the system SHALL provide an input field for year guessing
2. WHEN the user enters a year guess THEN the system SHALL validate it is a 4-digit number between 1900 and current year
3. WHEN the user submits their guess THEN the system SHALL calculate points based on accuracy (5000 points for exact match)
4. WHEN the guess is within 1 year THEN the system SHALL award 4500 points
5. WHEN the guess is within 5 years THEN the system SHALL award 3000 points
6. WHEN the guess is within 10 years THEN the system SHALL award 1500 points
7. WHEN the guess is more than 10 years off THEN the system SHALL award 0 points

### Requirement 3

**User Story:** As a player, I want to guess the location where a photograph was taken by placing a pin on an interactive map, so that I can demonstrate my geographical knowledge and earn points.

#### Acceptance Criteria

1. WHEN viewing a photograph THEN the system SHALL display an interactive world map
2. WHEN the user clicks on the map THEN the system SHALL place a pin at that location
3. WHEN the user places a pin THEN the system SHALL allow them to adjust the pin position before confirming
4. WHEN the user confirms their location guess THEN the system SHALL calculate points based on distance from actual location
5. WHEN the guess is within 1km THEN the system SHALL award 5000 points
6. WHEN the guess is within 10km THEN the system SHALL award 4000 points
7. WHEN the guess is within 50km THEN the system SHALL award 2500 points
8. WHEN the guess is within 200km THEN the system SHALL award 1000 points
9. WHEN the guess is more than 200km away THEN the system SHALL award 0 points

### Requirement 4

**User Story:** As a player, I want to see the correct answer after making my guess, so that I can learn from my mistakes and understand the context of the photograph.

#### Acceptance Criteria

1. WHEN the user submits both year and location guesses THEN the system SHALL reveal the correct year and location
2. WHEN displaying the correct answer THEN the system SHALL show both the user's guess and the actual values
3. WHEN displaying the correct answer THEN the system SHALL show the points earned for each guess
4. WHEN displaying the correct answer THEN the system SHALL display the correct location pin on the map alongside the user's guess
5. WHEN the user views the results THEN the system SHALL provide a "Next Photo" button to continue

### Requirement 5

**User Story:** As a player, I want the game to dynamically source photographs from a large pool of historical images, so that each game session provides unique content and replay value.

#### Acceptance Criteria

1. WHEN the game starts THEN the system SHALL fetch photographs from Wikipedia or similar services
2. WHEN sourcing photographs THEN the system SHALL only select images with both geolocation and date metadata
3. WHEN sourcing photographs THEN the system SHALL only select images dated 1900 or later
4. WHEN sourcing photographs THEN the system SHALL ensure a diverse geographical distribution
5. IF a photo lacks required metadata THEN the system SHALL exclude it from selection
6. WHEN selecting photos for a game THEN the system SHALL randomly choose 5 from the available pool

### Requirement 6

**User Story:** As a player, I want to see my cumulative score and performance summary, so that I can track my progress and compare with previous games.

#### Acceptance Criteria

1. WHEN all five photos are completed THEN the system SHALL display the total score out of 50,000 possible points
2. WHEN displaying final results THEN the system SHALL show a breakdown of points per photo
3. WHEN displaying final results THEN the system SHALL show separate scores for year and location accuracy
4. WHEN viewing final results THEN the system SHALL provide an option to start a new game
5. WHEN displaying results THEN the system SHALL show performance categories (e.g., "History Expert", "Geography Novice")

### Requirement 7

**User Story:** As a player, I want the application to be responsive and performant, so that I can enjoy a smooth gaming experience across different devices.

#### Acceptance Criteria

1. WHEN loading photographs THEN the system SHALL display loading indicators
2. WHEN the application loads THEN the system SHALL be responsive on desktop, tablet, and mobile devices
3. WHEN interacting with the map THEN the system SHALL provide smooth zooming and panning capabilities
4. WHEN switching between photos THEN the system SHALL load the next photo within 3 seconds
5. IF network connectivity is poor THEN the system SHALL display appropriate error messages

### Requirement 8

**User Story:** As a developer, I want the application built with Angular and NgRx with comprehensive unit tests, so that the codebase is maintainable and reliable.

#### Acceptance Criteria

1. WHEN implementing the application THEN the system SHALL use Angular framework
2. WHEN managing application state THEN the system SHALL use NgRx for state management
3. WHEN creating components THEN the system SHALL keep classes focused and under 200 lines
4. WHEN implementing features THEN the system SHALL include unit tests with minimum 80% code coverage
5. WHEN structuring the code THEN the system SHALL follow Angular best practices and style guide