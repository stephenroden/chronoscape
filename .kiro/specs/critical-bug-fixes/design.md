# Design Document

## Overview

This design addresses critical bugs in the Chronoscape game that prevent photos and maps from displaying and cause navigation flow issues. The root causes appear to be related to state management inconsistencies, component initialization timing, and data flow between the game container and child components.

## Architecture

### Current Issues Analysis

1. **Photo/Map Display Issue**: The photo-map-toggle component may not be receiving valid photo data, or the photo-display and map-guess components are not initializing properly
2. **Navigation Flow Issue**: The game state management is not correctly tracking photo progression, causing incorrect photo counts and navigation staying on results page
3. **State Synchronization**: There may be timing issues between when photos are loaded and when components try to access them

### Solution Architecture

The fix will focus on three main areas:
- **Data Flow Validation**: Ensure photo data flows correctly from store to components
- **State Management Correction**: Fix the game progression logic and photo indexing
- **Component Lifecycle Management**: Ensure proper initialization order and error handling

## Components and Interfaces

### Game Component (Container)
- **Current Issue**: May not be properly passing photo data to child components
- **Fix**: Add null checks and ensure currentPhoto$ observable emits valid data
- **Interface**: Validate photo data before passing to photo-map-toggle component

### Photo-Map-Toggle Component
- **Current Issue**: May not be handling null/undefined photo data gracefully
- **Fix**: Add defensive programming and loading states for when photo data is not available
- **Interface**: Implement proper error boundaries and fallback UI

### Photo Display Component
- **Current Issue**: May not be receiving photo data or failing to render images
- **Fix**: Add comprehensive error handling and loading states
- **Interface**: Validate photo URL and metadata before attempting to render

### Map Guess Component
- **Current Issue**: Map may not be initializing due to container issues
- **Fix**: Ensure map container exists and is properly sized before initialization
- **Interface**: Add retry logic for map initialization failures

### Game State Management
- **Current Issue**: Photo index progression is incorrect, causing wrong photo counts
- **Fix**: Correct the nextPhoto action and reducer logic
- **Interface**: Ensure photo index increments by exactly 1 and stays in bounds

## Data Models

### Photo Data Flow
```typescript
// Ensure this flow works correctly:
Store (photos.currentPhoto) -> 
Game Component (currentPhoto$) -> 
PhotoMapToggle Component (photo input) -> 
PhotoDisplay Component (photo rendering)
```

### Game Progress Model
```typescript
interface GameProgress {
  current: number;        // Should be currentPhotoIndex + 1
  total: number;          // Always 5
  percentage: number;     // (current / total) * 100
}
```

### State Synchronization
- Game reducer must correctly increment currentPhotoIndex
- Photos reducer must update currentPhoto when index changes
- Components must handle null states gracefully during transitions

## Error Handling

### Photo Loading Errors
- Add loading states while photos are being fetched
- Display error messages if photos fail to load
- Provide retry mechanisms for failed photo loads

### Map Initialization Errors
- Detect when map container is not available
- Retry map initialization after container is ready
- Fallback to static map image if interactive map fails

### State Consistency Errors
- Validate photo index bounds (0-4 for 5 photos)
- Ensure currentPhoto matches currentPhotoIndex
- Reset state if inconsistencies are detected

## Testing Strategy

### Unit Tests
- Test game reducer nextPhoto action increments index correctly
- Test photo selectors return correct current photo
- Test component null data handling

### Integration Tests
- Test complete game flow from start to finish
- Test photo progression and counting accuracy
- Test photo/map display functionality

### Manual Testing
- Verify photos and maps display on game start
- Verify correct photo counting throughout game
- Verify navigation advances properly between photos

## Implementation Plan

### Phase 1: Data Flow Fixes
1. Fix game component photo data passing
2. Add null checks in photo-map-toggle component
3. Ensure photo display component handles missing data

### Phase 2: State Management Fixes
1. Correct game reducer nextPhoto logic
2. Fix photo index synchronization
3. Ensure progress calculation accuracy

### Phase 3: Component Initialization
1. Fix map component initialization timing
2. Add proper loading states
3. Implement error boundaries and fallbacks

### Phase 4: Testing and Validation
1. Test complete game flow
2. Verify photo counting accuracy
3. Ensure all components render properly