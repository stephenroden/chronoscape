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

### Code Generation
- `ng generate component component-name` - Generate new component
- `ng generate service service-name` - Generate new service

## Architecture

### State Management (NgRx)
The application uses NgRx with three main state slices:
- **Game State** (`src/app/state/game/`) - Current game status, round tracking, navigation
- **Photos State** (`src/app/state/photos/`) - Photo loading, caching, metadata management
- **Scoring State** (`src/app/state/scoring/`) - Score calculation, guess tracking, results

State is configured in `src/app/app.config.ts` with reducers, effects, and devtools.

### Core Models
Located in `src/app/models/` with barrel exports:
- `Photo` & `PhotoMetadata` - Photo data structures with validation
- `GameState` & `PhotoState` - Game and photo state interfaces
- `Coordinates` - Geographic coordinate handling
- `Guess`, `Score`, `ScoringState` - Scoring and guess tracking

### Services Architecture
- **PhotoService** (`src/app/services/photo.service.ts`) - API integration with caching
- **MapService** (`src/app/services/map.service.ts`) - Leaflet map management with performance optimizations
- **ScoringService** - Score calculations and validation
- **CacheService** - LRU caching with TTL support for API responses
- **ImagePreloaderService** - Intelligent image preloading with priority queue

### Performance Features
- **API Caching**: 10-minute TTL for geosearch/photo details, 30-minute for processed photos
- **Image Preloading**: Next photo preloading with priority system, concurrent loading limits
- **Map Optimization**: Enhanced tile loading with buffer management and optimized update intervals

### Component Structure
Components are organized by feature in `src/app/components/`:
- **GameComponent** - Main game orchestration
- **PhotoDisplayComponent** - Photo rendering with preloading integration
- **MapGuessComponent** - Location guessing interface
- **YearGuessComponent** - Year guessing interface
- **ResultsComponent** - Round results display
- **FinalResultsComponent** - Game completion summary

### Testing Strategy
- Unit tests for all components, services, and state management
- Performance tests in `src/app/services/performance.spec.ts`
- Integration tests for game workflow
- Coverage targeting 70%+ statement coverage

## Development Notes

### Style Guidelines
- Uses SCSS with component-scoped styles
- Prettier configured for Angular HTML templates
- Component prefix: `app`

### Performance Requirements
- 3-second loading time target
- Sub-millisecond cache retrieval
- Concurrent image loading limited to 3 simultaneous requests

### Build Configuration
- Production budgets: 500kB warning, 1MB error for initial bundle
- Component styles: 4kB warning, 8kB error
- Source maps enabled in development mode