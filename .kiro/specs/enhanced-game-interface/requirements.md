# Requirements Document

## Introduction

This feature enhances the game interface to make better use of screen real estate by combining the map and photo into a single interactive area with toggle functionality. It also adds photo zoom capabilities and provides detailed feedback after each guess, including correct answers and distance calculations.

## Requirements

### Requirement 1

**User Story:** As a player, I want the map and photo to share the same screen area with a toggle mechanism, so that I can see more content without excessive scrolling.

#### Acceptance Criteria

1. WHEN the game loads THEN the system SHALL display either the photo or map in the main content area
2. WHEN the photo is active THEN the system SHALL show a micro thumbnail of the map that can be clicked
3. WHEN the map is active THEN the system SHALL show a micro thumbnail of the photo that can be clicked
4. WHEN I click on the inactive micro thumbnail THEN the system SHALL swap the active and inactive elements
5. WHEN swapping occurs THEN the system SHALL provide smooth visual transitions

### Requirement 2

**User Story:** As a player, I want to zoom in on photos, so that I can examine details more closely to make better guesses.

#### Acceptance Criteria

1. WHEN viewing a photo THEN the system SHALL provide zoom controls (zoom in, zoom out, reset)
2. WHEN I zoom in THEN the system SHALL allow me to pan around the zoomed image
3. WHEN I zoom out beyond the original size THEN the system SHALL limit zoom to the original photo dimensions
4. WHEN I reset zoom THEN the system SHALL return the photo to its original size and position
5. WHEN switching between photo and map THEN the system SHALL preserve the current zoom level and position

### Requirement 3

**User Story:** As a player, I want detailed feedback after each guess, so that I can learn from my mistakes and understand the correct answers.

#### Acceptance Criteria

1. WHEN I submit a guess THEN the system SHALL display the correct year prominently
2. WHEN I submit a location guess THEN the system SHALL highlight the correct location on the map
3. WHEN showing the correct location THEN the system SHALL display my guess location alongside it
4. WHEN both locations are shown THEN the system SHALL calculate and display the distance between my guess and the correct answer
5. WHEN displaying feedback THEN the system SHALL show additional information about the photo (description, historical context, or interesting facts)

### Requirement 4

**User Story:** As a player, I want the interface to be responsive and accessible, so that I can play comfortably on different devices and screen sizes.

#### Acceptance Criteria

1. WHEN using the interface on mobile devices THEN the system SHALL adapt the toggle mechanism for touch interactions
2. WHEN using keyboard navigation THEN the system SHALL provide keyboard shortcuts for toggling between photo and map
3. WHEN using screen readers THEN the system SHALL announce state changes and provide appropriate labels
4. WHEN the screen size changes THEN the system SHALL adjust the micro thumbnail size and positioning appropriately
5. WHEN zooming on touch devices THEN the system SHALL support pinch-to-zoom gestures

### Requirement 5

**User Story:** As a player, I want the interface to reset properly when moving to a new photo, so that each round starts with a clean slate.

#### Acceptance Criteria

1. WHEN advancing to a new photo THEN the system SHALL reset the year guess input to 1966
2. WHEN advancing to a new photo THEN the system SHALL zoom out and recenter the map to its default view
3. WHEN advancing to a new photo THEN the system SHALL remove any previous guess markers from the map
4. WHEN advancing to a new photo THEN the system SHALL reset the photo zoom level and position to default
5. WHEN advancing to a new photo THEN the system SHALL clear any previous feedback information

### Requirement 6

**User Story:** As a player, I want the enhanced interface to maintain game flow, so that the improvements don't disrupt the core gameplay experience.

#### Acceptance Criteria

1. WHEN making guesses THEN the system SHALL preserve all existing guess submission functionality
2. WHEN viewing feedback THEN the system SHALL maintain the current scoring and progression logic
3. WHEN transitioning between rounds THEN the system SHALL reset zoom levels and toggle states appropriately
4. WHEN the game ends THEN the system SHALL display final results with the same enhanced feedback format
5. WHEN restarting the game THEN the system SHALL reset all interface elements to their default states