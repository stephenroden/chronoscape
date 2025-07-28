# Design Document

## Overview

This design enhances the existing Chronoscape game interface by creating a unified photo/map display area with toggle functionality, adding photo zoom capabilities, and providing enhanced feedback after each guess. The solution maintains the current NgRx architecture while introducing new components and services to handle the enhanced interactions.

## Architecture

### Component Structure

The enhanced interface will modify the existing game component structure:

```
GameComponent (existing - modified)
├── PhotoMapToggleComponent (new)
│   ├── PhotoDisplayComponent (existing - enhanced with zoom)
│   └── MapGuessComponent (existing - modified for toggle)
├── YearGuessComponent (existing - modified for reset behavior)
└── EnhancedResultsComponent (existing ResultsComponent - enhanced)
```

### State Management

The existing NgRx store structure will be extended with new actions and selectors:

- **Game State**: Add interface toggle state and zoom state
- **Photos State**: Add photo metadata for enhanced feedback
- **Scoring State**: Add distance calculation results

### Services

New and enhanced services:

- **PhotoZoomService**: Handle photo zoom, pan, and reset functionality
- **InterfaceToggleService**: Manage photo/map toggle state and transitions
- **MapService** (enhanced): Add reset functionality and improved pin management
- **FeedbackService**: Generate enhanced feedback content

## Components and Interfaces

### PhotoMapToggleComponent

**Purpose**: Container component that manages the toggle between photo and map views.

**Interface**:
```typescript
interface PhotoMapToggleState {
  activeView: 'photo' | 'map';
  photoZoomLevel: number;
  photoPosition: { x: number; y: number };
  mapZoomLevel: number;
  mapCenter: Coordinates;
}
```

**Key Features**:
- Micro thumbnail display for inactive view
- Smooth transitions between views
- State preservation during toggles
- Keyboard navigation support

### Enhanced PhotoDisplayComponent

**Purpose**: Extends existing photo display with zoom and pan capabilities.

**New Features**:
- Zoom controls (zoom in, zoom out, reset)
- Pan functionality for zoomed images
- Touch gesture support (pinch-to-zoom)
- Zoom level preservation during toggles

**Interface**:
```typescript
interface PhotoZoomState {
  zoomLevel: number;
  position: { x: number; y: number };
  minZoom: number;
  maxZoom: number;
}
```

### Enhanced MapGuessComponent

**Purpose**: Modifies existing map component for toggle integration and reset functionality.

**New Features**:
- Reset to default view (zoom out, recenter)
- Clear previous guess markers
- Improved pin management
- Integration with toggle system

### Enhanced ResultsComponent

**Purpose**: Extends existing results with detailed feedback and enhanced map display.

**New Features**:
- Prominent correct year display
- Distance calculation and display
- Enhanced photo information
- Dual-pin map with distance line
- Historical context and interesting facts

**Interface**:
```typescript
interface EnhancedFeedback {
  correctYear: number;
  correctLocation: Coordinates;
  userGuess: Guess;
  distance: number;
  photoContext: {
    description: string;
    historicalContext?: string;
    interestingFacts?: string[];
  };
}
```

## Data Models

### Enhanced Photo Model

Extend existing Photo model with additional metadata:

```typescript
interface EnhancedPhoto extends Photo {
  metadata: {
    photographer?: string;
    historicalContext?: string;
    interestingFacts?: string[];
    detailedDescription?: string;
  };
}
```

### Interface State Model

New model for managing interface state:

```typescript
interface InterfaceState {
  activeView: 'photo' | 'map';
  photoZoom: PhotoZoomState;
  mapState: MapState;
  transitionInProgress: boolean;
}
```

### Enhanced Scoring Model

Extend existing scoring with distance calculations:

```typescript
interface EnhancedScore extends Score {
  distanceKm: number;
  distanceAccuracy: 'excellent' | 'good' | 'fair' | 'poor';
  yearAccuracy: 'perfect' | 'excellent' | 'good' | 'fair' | 'poor';
}
```

## Error Handling

### Photo Zoom Errors
- Handle zoom limit violations gracefully
- Provide fallback for unsupported zoom gestures
- Reset zoom state on errors

### Toggle Transition Errors
- Ensure state consistency during failed transitions
- Provide immediate fallback to last known good state
- Log transition errors for debugging

### Map Reset Errors
- Handle map service failures during reset
- Provide manual reset options
- Maintain game continuity despite map issues

### Enhanced Feedback Errors
- Graceful degradation when additional photo metadata is unavailable
- Fallback to basic feedback when enhanced features fail
- Ensure core game functionality remains intact

## Testing Strategy

### Unit Tests

**PhotoMapToggleComponent**:
- Toggle state management
- Micro thumbnail generation
- Keyboard navigation
- State preservation during toggles

**PhotoZoomService**:
- Zoom level calculations
- Pan boundary enforcement
- Touch gesture handling
- State reset functionality

**Enhanced ResultsComponent**:
- Distance calculations
- Feedback content generation
- Map initialization with dual pins
- Performance categorization

### Integration Tests

**Toggle Workflow**:
- Complete photo-to-map and map-to-photo transitions
- State preservation across toggles
- Zoom and pan state management
- Keyboard and touch interactions

**Reset Functionality**:
- New photo initialization
- Year reset to 1966
- Map reset to default view
- Previous guess marker removal

**Enhanced Feedback Flow**:
- Complete guess submission to enhanced results
- Distance calculation accuracy
- Map display with correct pins
- Photo metadata display

### E2E Tests

**Complete Game Flow**:
- Full game with enhanced interface
- Toggle usage throughout game
- Photo zoom during gameplay
- Enhanced feedback after each guess

**Accessibility**:
- Screen reader compatibility
- Keyboard navigation
- Touch accessibility
- ARIA label accuracy

**Responsive Design**:
- Mobile device compatibility
- Touch gesture support
- Responsive layout adaptation
- Performance on various screen sizes

## Implementation Considerations

### Performance Optimizations

**Image Handling**:
- Lazy loading for zoom levels
- Image caching for smooth zoom
- Optimized thumbnail generation
- Memory management for large images

**Map Performance**:
- Efficient pin management
- Optimized reset operations
- Smooth transition animations
- Reduced re-rendering during toggles

**State Management**:
- Selective state updates
- Memoized selectors
- Efficient action dispatching
- Minimal re-renders

### Accessibility

**Keyboard Navigation**:
- Tab order preservation during toggles
- Keyboard shortcuts for common actions
- Focus management during transitions
- Screen reader announcements

**Visual Accessibility**:
- High contrast mode support
- Zoom accessibility features
- Clear visual indicators
- Appropriate ARIA labels

### Mobile Considerations

**Touch Interactions**:
- Pinch-to-zoom support
- Touch-friendly toggle mechanism
- Swipe gestures for navigation
- Responsive touch targets

**Performance**:
- Optimized for mobile rendering
- Efficient memory usage
- Smooth animations on mobile
- Battery usage considerations

### Browser Compatibility

**Modern Browser Features**:
- CSS transforms for smooth transitions
- Touch event handling
- Intersection Observer for performance
- ResizeObserver for responsive behavior

**Fallbacks**:
- Graceful degradation for older browsers
- Alternative interaction methods
- Basic functionality preservation
- Progressive enhancement approach