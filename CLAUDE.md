# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chronoscape** is an Angular 20 geolocation guessing game where players view historical photos and guess both the location and year. Built with NgRx for state management, Leaflet for maps, and comprehensive performance optimizations.

## Development Commands

### Core Development
- `npm start` or `ng serve` - Start development server (http://localhost:4200)
- `ng build` - Build for production
- `ng build --watch --configuration development` - Watch mode for development

### Testing
- `ng test` - Run unit tests with coverage and watch mode
- `ng test --watch=false --code-coverage` - Run tests once with coverage (CI mode)
- `ng test --include='**/specific.spec.ts'` - Run specific test file

### Code Generation
- `ng generate component component-name` - Generate new component
- `ng generate service service-name` - Generate new service
- `ng generate directive|pipe|class|interface|enum|module` - Other generators

## Architecture

### State Management (NgRx)
The application uses NgRx with four main state slices configured in `src/app/app.config.ts`:
- **Game State** (`src/app/state/game/`) - Current game status, round tracking, navigation
- **Photos State** (`src/app/state/photos/`) - Photo loading, caching, metadata management
- **Scoring State** (`src/app/state/scoring/`) - Score calculation, guess tracking, results
- **Interface State** (`src/app/state/interface/`) - UI state management and toggles

Each state slice includes actions, reducers, effects, and selectors with comprehensive test coverage.

### Core Models
Located in `src/app/models/` with barrel exports via `index.ts`:
- `Photo` & `PhotoMetadata` - Photo data structures with validation
- `GameState` & `PhotoState` - Game and photo state interfaces
- `Coordinates` - Geographic coordinate handling
- `Guess`, `Score`, `ScoringState` - Scoring and guess tracking
- `EnhancedFeedback` - Enhanced feedback models

### Services Architecture
- **PhotoService** - Wikimedia API integration with comprehensive caching
- **MapService** - Leaflet map management with performance optimizations
- **ScoringService** - Score calculations and validation logic
- **CacheService** - LRU caching with TTL support for API responses
- **ImagePreloaderService** - Intelligent image preloading with priority queue
- **FormatValidationService** - Image format validation with batch processing
- **PerformanceMonitorService** - Performance tracking and monitoring
- **PhotoZoomService** - Photo zoom controls and state management
- **InterfaceToggleService** - UI toggle functionality

### Performance Features
- **API Caching**: 10-minute TTL for geosearch/photo details, 30-minute for processed photos
- **Image Preloading**: Next photo preloading with priority system, concurrent loading limits (3)
- **Map Optimization**: Enhanced tile loading with buffer management and optimized update intervals
- **Format Validation**: Batch image format validation with caching and performance monitoring
- **Performance Monitoring**: Comprehensive performance tests with targets (3s load time, <100ms validations)

### Component Structure
Components are organized by feature in `src/app/components/`:
- **GameComponent** - Main game orchestration and state management
- **PhotoDisplayComponent** - Photo rendering with preloading integration
- **MapGuessComponent** - Location guessing interface with Leaflet integration
- **YearGuessComponent** - Year guessing interface
- **ResultsComponent** - Round results display
- **FinalResultsComponent** - Game completion summary
- **StartScreenComponent** - Game initialization
- **NavigationComponent** - Game navigation controls
- **ErrorBoundaryComponent** - Error handling UI
- **PhotoMapToggleComponent** - Toggle between photo and map views
- **PhotoZoomControlsComponent** - Photo zoom controls

### Testing Strategy
- Unit tests for all components, services, and state management
- Performance tests in `src/app/services/performance.spec.ts`
- Integration tests for game workflow and state transitions
- Store integration tests in `src/app/state/store-integration.spec.ts`
- Coverage targeting 70%+ statement coverage

## Development Notes

### Style Guidelines
- Uses SCSS with component-scoped styles
- Prettier configured for Angular HTML templates (see package.json)
- Component prefix: `app`
- Maximum component style budgets: 4kB warning, 20kB error

### Performance Requirements
- 3-second loading time target
- Sub-millisecond cache retrieval
- Concurrent image loading limited to 3 simultaneous requests
- Batch validation processing for improved performance
- HTTP HEAD requests for format detection when needed

### Build Configuration
- Production budgets: 500kB warning, 1MB error for initial bundle
- Component styles: 4kB warning, 20kB error
- Source maps enabled in development mode
- Output hashing enabled for production builds