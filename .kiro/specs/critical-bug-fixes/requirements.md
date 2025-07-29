# Requirements Document

## Introduction

This specification addresses critical bugs in the Chronoscape game that are preventing core functionality from working properly. The bugs affect the fundamental game experience by preventing photos and maps from displaying, and causing navigation flow issues that break the game progression.

## Requirements

### Requirement 1: Photo and Map Display Fix

**User Story:** As a player, I want to see the historical photograph and interactive map when playing the game, so that I can make informed guesses about the year and location.

#### Acceptance Criteria

1. WHEN the game starts THEN the system SHALL display the first historical photograph in the photo view
2. WHEN the user toggles to map view THEN the system SHALL display an interactive world map
3. WHEN the photo-map toggle component loads THEN both photo and map components SHALL be properly initialized
4. WHEN the current photo data is available THEN the photo display component SHALL render the image without errors
5. WHEN the map component initializes THEN the map SHALL be interactive and allow pin placement

### Requirement 2: Navigation Flow Fix

**User Story:** As a player, I want the game to progress correctly through all 5 photos with accurate photo counting, so that I can complete the full game experience.

#### Acceptance Criteria

1. WHEN I submit my first guess THEN the system SHALL show results for photo 1 of 5
2. WHEN I click "Next Photo" from results THEN the system SHALL advance to photo 2 and show the game interface (not stay on results)
3. WHEN advancing to the next photo THEN the photo counter SHALL increment by exactly 1
4. WHEN on photo 2 THEN the counter SHALL display "Photo 2 of 5" not "Photo 4 of 5"
5. WHEN completing all 5 photos THEN the system SHALL navigate to the final results page

### Requirement 3: State Management Consistency

**User Story:** As a player, I want the game state to remain consistent throughout my session, so that photo progression and scoring work correctly.

#### Acceptance Criteria

1. WHEN the game starts THEN the current photo index SHALL be set to 0
2. WHEN advancing to next photo THEN the current photo index SHALL increment by exactly 1
3. WHEN the photo index changes THEN the current photo data SHALL update to match the new index
4. WHEN displaying progress THEN the photo counter SHALL accurately reflect the current photo index + 1
5. WHEN the game state updates THEN all components SHALL receive the correct current photo data

### Requirement 4: Component Integration Fix

**User Story:** As a player, I want all game components to work together seamlessly, so that I have a smooth gaming experience without broken interfaces.

#### Acceptance Criteria

1. WHEN the game component loads THEN the photo-map-toggle component SHALL receive valid photo data
2. WHEN photo data is passed to child components THEN the data SHALL not be null or undefined
3. WHEN the interface toggle service manages state THEN it SHALL not interfere with photo/map rendering
4. WHEN components subscribe to state changes THEN they SHALL receive updates without causing infinite loops
5. WHEN error boundaries are triggered THEN they SHALL display fallback UI without breaking the entire game