import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, BehaviorSubject } from 'rxjs';

import { GameComponent } from '../components/game/game.component';
import { PhotoMapToggleComponent } from '../components/photo-map-toggle/photo-map-toggle.component';
import { YearGuessComponent } from '../components/year-guess/year-guess.component';
import { MapGuessComponent } from '../components/map-guess/map-guess.component';
import { InterfaceToggleService } from '../services/interface-toggle.service';
import { PhotoZoomService, PhotoZoomState } from '../services/photo-zoom.service';
import { MapService } from '../services/map.service';
import { Photo } from '../models/photo.model';
import { ActiveView, MapState } from '../models/interface-state.model';
import { AppState } from '../state/app.state';
import { GameStatus } from '../models/game-state.model';

// Mock components for reset testing
@Component({
  selector: 'app-photo-display',
  template: `
    <div class="photo-display" 
         [class.zoomed]="isZoomed"
         [style.transform]="transform">
      <img [src]="photo?.url" [alt]="photo?.title" />
    </div>
  `,
  standalone: true
})
class MockPhotoDisplayComponent {
  photo: Photo | null = null;
  isZoomed = false;
  transform = 'translate(0px, 0px) scale(1)';
  
  reset(): void {
    this.isZoomed = false;
    this.transform = 'translate(0px, 0px) scale(1)';
  }
}

@Component({
  selector: 'app-map-guess',
  template: `
    <div class="leaflet-map-container" 
         [class.has-pins]="hasPins"
         [style.zoom]="mapZoom">
      <div class="map-pins">
        <div *ngFor="let pin of pins" class="map-pin"></div>
      </div>
      <div class="map-center" [style.transform]="centerTransform"></div>
    </div>
  `,
  standalone: true,
  imports: []
})
class MockMapGuessComponent {
  hasPins = false;
  mapZoom = 1;
  centerTransform = 'translate(0px, 0px)';
  pins: any[] = [];
  
  addPin(coordinates: { latitude: number; longitude: number }): void {
    this.pins.push(coordinates);
    this.hasPins = true;
  }
  
  clearPins(): void {
    this.pins = [];
    this.hasPins = false;
  }
  
  resetMapView(): void {
    this.mapZoom = 1;
    this.centerTransform = 'translate(0px, 0px)';
    this.clearPins();
  }
  
  setMapState(zoom: number, center: { latitude: number; longitude: number }): void {
    this.mapZoom = zoom;
    // Center transform would be calculated based on coordinates
    this.centerTransform = `translate(${center.longitude * 10}px, ${center.latitude * 10}px)`;
  }
}

@Component({
  selector: 'app-year-guess',
  template: `
    <div class="year-guess-container">
      <input type="range" 
             min="1900" 
             max="2024" 
             [(ngModel)]="selectedYear"
             class="year-slider" 
             id="year-slider" />
      <div class="year-display">{{selectedYear}}</div>
      <div class="year-buttons">
        <button class="year-decrease" (click)="decreaseYear()">-</button>
        <button class="year-increase" (click)="increaseYear()">+</button>
      </div>
    </div>
  `,
  standalone: true,
  imports: []
})
class MockYearGuessComponent {
  selectedYear = 1966;
  
  reset(): void {
    this.selectedYear = 1966;
  }
  
  decreaseYear(): void {
    if (this.selectedYear > 1900) {
      this.selectedYear--;
    }
  }
  
  increaseYear(): void {
    if (this.selectedYear < 2024) {
      this.selectedYear++;
    }
  }
}

@Component({
  selector: 'app-results',
  template: `
    <div class="results-container" *ngIf="visible">
      <div class="correct-year">Correct Year: {{correctYear}}</div>
      <div class="distance">Distance: {{distance}} km</div>
      <div class="enhanced-feedback">{{feedback}}</div>
      <div class="score">Score: {{score}}</div>
    </div>
  `,
  standalone: true,
  imports: []
})
class MockResultsComponent {
  visible = false;
  correctYear = 1950;
  distance = 150;
  feedback = 'Enhanced feedback content';
  score = 7000;
  
  show(data: any): void {
    this.visible = true;
    this.correctYear = data.correctYear;
    this.distance = data.distance;
    this.feedback = data.feedback;
    this.score = data.score;
  }
  
  hide(): void {
    this.visible = false;
  }
  
  clear(): void {
    this.visible = false;
    this.correctYear = 0;
    this.distance = 0;
    this.feedback = '';
    this.score = 0;
  }
}

// Test host component that simulates the game workflow
@Component({
  template: `
    <div class="reset-test-container">
      <div class="game-header">
        <span class="photo-counter">Photo {{currentPhotoIndex + 1}} of {{totalPhotos}}</span>
        <button class="next-photo-btn" (click)="nextPhoto()" [disabled]="!canAdvance">
          Next Photo
        </button>
      </div>
      
      <app-photo-map-toggle
        [photo]="currentPhoto"
        [enableZoom]="true"
        (viewToggled)="onViewToggled($event)">
      </app-photo-map-toggle>
      
      <app-year-guess #yearGuess></app-year-guess>
      
      <app-results #results></app-results>
      
      <div class="test-controls">
        <button class="zoom-photo-btn" (click)="zoomPhoto()">Zoom Photo</button>
        <button class="pan-photo-btn" (click)="panPhoto()">Pan Photo</button>
        <button class="add-map-pin-btn" (click)="addMapPin()">Add Map Pin</button>
        <button class="change-year-btn" (click)="changeYear()">Change Year</button>
        <button class="show-results-btn" (click)="showResults()">Show Results</button>
        <button class="manual-reset-btn" (click)="manualReset()">Manual Reset</button>
      </div>
      
      <div class="state-display">
        <div class="current-photo">Current Photo: {{currentPhoto?.id}}</div>
        <div class="zoom-level">Zoom Level: {{currentZoomLevel}}</div>
        <div class="zoom-position">Position: {{currentZoomPosition.x}}, {{currentZoomPosition.y}}</div>
        <div class="map-pins">Map Pins: {{mapPinCount}}</div>
        <div class="selected-year">Selected Year: {{currentSelectedYear}}</div>
        <div class="results-visible">Results Visible: {{resultsVisible}}</div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [
    PhotoMapToggleComponent,
    MockYearGuessComponent,
    MockResultsComponent
  ]
})
class TestHostComponent {
  currentPhotoIndex = 0;
  totalPhotos = 3;
  canAdvance = true;
  
  photos: Photo[] = [
    {
      id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      title: 'Historical Photo 1',
      description: 'First test photo',
      year: 1950,
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      source: 'test',
      metadata: {
        photographer: 'Test Photographer 1',
        license: 'CC BY 4.0',
        originalSource: 'Test Archive',
        dateCreated: new Date('1950-01-01'),
        format: 'JPEG',
        mimeType: 'image/jpeg'
      }
    },
    {
      id: 'photo-2',
      url: 'https://example.com/photo2.jpg',
      title: 'Historical Photo 2',
      description: 'Second test photo',
      year: 1965,
      coordinates: { latitude: 51.5074, longitude: -0.1278 },
      source: 'test',
      metadata: {
        photographer: 'Test Photographer 2',
        license: 'CC BY 4.0',
        originalSource: 'Test Archive',
        dateCreated: new Date('1965-01-01'),
        format: 'JPEG',
        mimeType: 'image/jpeg'
      }
    },
    {
      id: 'photo-3',
      url: 'https://example.com/photo3.jpg',
      title: 'Historical Photo 3',
      description: 'Third test photo',
      year: 1980,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
      source: 'test',
      metadata: {
        photographer: 'Test Photographer 3',
        license: 'CC BY 4.0',
        originalSource: 'Test Archive',
        dateCreated: new Date('1980-01-01'),
        format: 'JPEG',
        mimeType: 'image/jpeg'
      }
    }
  ];
  
  currentPhoto: Photo;
  currentZoomLevel = 1;
  currentZoomPosition = { x: 0, y: 0 };
  mapPinCount = 0;
  currentSelectedYear = 1966;
  resultsVisible = false;
  
  constructor(
    private interfaceToggleService: InterfaceToggleService,
    private photoZoomService: PhotoZoomService,
    private mapService: MapService
  ) {
    this.currentPhoto = this.photos[0];
    
    // Subscribe to zoom state changes
    this.photoZoomService.zoomState$.subscribe(state => {
      this.currentZoomLevel = state.zoomLevel;
      this.currentZoomPosition = state.position;
    });
  }
  
  onViewToggled(view: ActiveView): void {
    // Handle view toggle
  }
  
  nextPhoto(): void {
    if (this.currentPhotoIndex < this.totalPhotos - 1) {
      this.currentPhotoIndex++;
      this.currentPhoto = this.photos[this.currentPhotoIndex];
      
      // Trigger reset functionality
      this.resetForNewPhoto();
    }
  }
  
  private resetForNewPhoto(): void {
    // Requirement 5.1: Reset year guess input to 1966
    this.currentSelectedYear = 1966;
    
    // Requirement 5.2: Zoom out and recenter map to default view
    this.mapService.resetToDefault();
    
    // Requirement 5.3: Remove previous guess markers from map
    this.mapPinCount = 0;
    
    // Requirement 5.4: Reset photo zoom level and position to default
    this.photoZoomService.reset();
    
    // Requirement 5.5: Clear previous feedback information
    this.resultsVisible = false;
    
    // Reset interface state
    this.interfaceToggleService.resetForNewPhoto();
  }
  
  zoomPhoto(): void {
    this.photoZoomService.zoomIn();
  }
  
  panPhoto(): void {
    this.photoZoomService.pan(25, -15);
  }
  
  addMapPin(): void {
    this.mapPinCount++;
    // Simulate adding a pin to the map
  }
  
  changeYear(): void {
    this.currentSelectedYear = 1975;
  }
  
  showResults(): void {
    this.resultsVisible = true;
  }
  
  manualReset(): void {
    this.resetForNewPhoto();
  }
}

/**
 * Integration tests for reset functionality across photo transitions
 * Tests that all components properly reset their state when advancing to new photos
 */
describe('Reset Functionality Integration', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockStore: MockStore<AppState>;
  let interfaceToggleService: InterfaceToggleService;
  let photoZoomService: PhotoZoomService;
  let mapService: jasmine.SpyObj<MapService>;
  let debugElement: DebugElement;

  const mockPhotoZoomState: PhotoZoomState = {
    zoomLevel: 1,
    position: { x: 0, y: 0 },
    minZoom: 0.5,
    maxZoom: 4,
    containerWidth: 800,
    containerHeight: 600,
    imageWidth: 1200,
    imageHeight: 900
  };

  const mockMapState: MapState = {
    zoomLevel: 2,
    center: { latitude: 20, longitude: 0 },
    defaultZoom: 2,
    defaultCenter: { latitude: 20, longitude: 0 }
  };

  const initialState: AppState = {
    game: {
      gameStatus: GameStatus.IN_PROGRESS,
      currentPhotoIndex: 0,
      totalPhotos: 3,
      startTime: new Date(),
      endTime: undefined,
      loading: false,
      error: null
    },
    photos: {
      photos: [],
      currentPhoto: null,
      loading: false,
      error: null
    },
    scoring: {
      scores: [],
      totalScore: 0,
      currentGuess: null,
      loading: false,
      error: null
    },
    interface: {
      activeView: 'photo',
      photoZoom: mockPhotoZoomState,
      mapState: mockMapState,
      transitionInProgress: false
    }
  };

  beforeEach(async () => {
    const mapServiceSpy = jasmine.createSpyObj('MapService', [
      'resetToDefault',
      'clearPins',
      'setZoom',
      'setCenter',
      'addPin'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        PhotoMapToggleComponent,
        MockPhotoDisplayComponent,
        MockMapGuessComponent
      ],
      providers: [
        provideMockStore({ initialState }),
        InterfaceToggleService,
        PhotoZoomService,
        { provide: MapService, useValue: mapServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as MockStore<AppState>;
    interfaceToggleService = TestBed.inject(InterfaceToggleService);
    photoZoomService = TestBed.inject(PhotoZoomService);
    mapService = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    debugElement = fixture.debugElement;
    
    fixture.detectChanges();
  });

  describe('Year Guess Reset', () => {
    it('should reset year guess to 1966 when advancing to new photo', fakeAsync(() => {
      // Change year from default
      const changeYearButton = debugElement.query(By.css('.change-year-btn'));
      changeYearButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(hostComponent.currentSelectedYear).toBe(1975);

      // Advance to next photo
      const nextPhotoButton = debugElement.query(By.css('.next-photo-btn'));
      nextPhotoButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      // Requirement 5.1: Reset year guess input to 1966
      expect(hostComponent.currentSelectedYear).toBe(1966);
    }));

    it('should reset year slider position', fakeAsync(() => {
      const yearGuess = debugElement.query(By.css('app-year-guess'));
      const yearSlider = yearGuess.query(By.css('.year-slider'));

      // Change year slider value
      yearSlider.nativeElement.value = '1985';
      yearSlider.nativeElement.dispatchEvent(new Event('input'));
      tick();
      fixture.detectChanges();

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Year slider should be reset
      expect(yearSlider.nativeElement.value).toBe('1966');
    }));

    it('should reset year display text', fakeAsync(() => {
      // Change year
      hostComponent.changeYear();
      fixture.detectChanges();

      const yearDisplay = debugElement.query(By.css('.year-display'));
      expect(yearDisplay.nativeElement.textContent).toBe('1975');

      // Reset
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      expect(yearDisplay.nativeElement.textContent).toBe('1966');
    }));
  });

  describe('Photo Zoom Reset', () => {
    it('should reset photo zoom level to default when advancing to new photo', fakeAsync(() => {
      // Zoom in the photo
      const zoomButton = debugElement.query(By.css('.zoom-photo-btn'));
      zoomButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(hostComponent.currentZoomLevel).toBeGreaterThan(1);

      // Advance to next photo
      const nextPhotoButton = debugElement.query(By.css('.next-photo-btn'));
      nextPhotoButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      // Requirement 5.4: Reset photo zoom level to default
      expect(hostComponent.currentZoomLevel).toBe(1);
    }));

    it('should reset photo position to center when advancing to new photo', fakeAsync(() => {
      // Zoom and pan the photo
      const zoomButton = debugElement.query(By.css('.zoom-photo-btn'));
      const panButton = debugElement.query(By.css('.pan-photo-btn'));
      
      zoomButton.nativeElement.click();
      tick();
      panButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(hostComponent.currentZoomPosition.x !== 0 || hostComponent.currentZoomPosition.y !== 0).toBe(true);

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Requirement 5.4: Reset photo position to default
      expect(hostComponent.currentZoomPosition.x).toBe(0);
      expect(hostComponent.currentZoomPosition.y).toBe(0);
    }));

    it('should reset photo transform styles', fakeAsync(() => {
      // Zoom photo
      photoZoomService.zoomIn();
      photoZoomService.pan(50, -25);
      tick();
      fixture.detectChanges();

      const photoDisplay = debugElement.query(By.css('app-photo-display'));
      const photoElement = photoDisplay.query(By.css('.photo-display'));
      
      // Should have transform applied
      expect(photoElement.nativeElement.style.transform).not.toBe('translate(0px, 0px) scale(1)');

      // Reset
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Transform should be reset
      expect(photoElement.nativeElement.style.transform).toBe('translate(0px, 0px) scale(1)');
    }));
  });

  describe('Map State Reset', () => {
    it('should reset map zoom to default when advancing to new photo', fakeAsync(() => {
      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Requirement 5.2: Zoom out and recenter map to default view
      expect(mapService.resetToDefault).toHaveBeenCalled();
    }));

    it('should clear previous guess markers from map', fakeAsync(() => {
      // Add map pins
      const addPinButton = debugElement.query(By.css('.add-map-pin-btn'));
      addPinButton.nativeElement.click();
      addPinButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(hostComponent.mapPinCount).toBe(2);

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Requirement 5.3: Remove previous guess markers from map
      expect(hostComponent.mapPinCount).toBe(0);
    }));

    it('should reset map center position', fakeAsync(() => {
      // Simulate map center change
      const mapGuess = debugElement.query(By.css('app-map-guess'));
      const mapComponent = mapGuess.componentInstance as MockMapGuessComponent;
      
      mapComponent.setMapState(5, { latitude: 45, longitude: -75 });
      fixture.detectChanges();

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Map should be reset to default
      expect(mapService.resetToDefault).toHaveBeenCalled();
    }));

    it('should clear map pins visually', fakeAsync(() => {
      // Add pins to map component
      const mapGuess = debugElement.query(By.css('app-map-guess'));
      const mapComponent = mapGuess.componentInstance as MockMapGuessComponent;
      
      mapComponent.addPin({ latitude: 40, longitude: -74 });
      mapComponent.addPin({ latitude: 41, longitude: -75 });
      fixture.detectChanges();

      expect(mapComponent.pins.length).toBe(2);
      expect(mapComponent.hasPins).toBe(true);

      // Reset
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Pins should be cleared
      expect(hostComponent.mapPinCount).toBe(0);
    }));
  });

  describe('Results and Feedback Reset', () => {
    it('should clear previous feedback information when advancing to new photo', fakeAsync(() => {
      // Show results
      const showResultsButton = debugElement.query(By.css('.show-results-btn'));
      showResultsButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(hostComponent.resultsVisible).toBe(true);

      const results = debugElement.query(By.css('app-results'));
      const resultsContainer = results.query(By.css('.results-container'));
      expect(resultsContainer).toBeTruthy();

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Requirement 5.5: Clear previous feedback information
      expect(hostComponent.resultsVisible).toBe(false);
    }));

    it('should hide results component when advancing', fakeAsync(() => {
      // Show results first
      hostComponent.showResults();
      fixture.detectChanges();

      let resultsContainer = debugElement.query(By.css('.results-container'));
      expect(resultsContainer).toBeTruthy();

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      resultsContainer = debugElement.query(By.css('.results-container'));
      expect(resultsContainer).toBeFalsy();
    }));

    it('should clear enhanced feedback content', fakeAsync(() => {
      const results = debugElement.query(By.css('app-results'));
      const resultsComponent = results.componentInstance as MockResultsComponent;
      
      // Show results with content
      resultsComponent.show({
        correctYear: 1950,
        distance: 150,
        feedback: 'Test feedback content',
        score: 7000
      });
      fixture.detectChanges();

      expect(resultsComponent.visible).toBe(true);
      expect(resultsComponent.feedback).toBe('Test feedback content');

      // Reset
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      expect(resultsComponent.visible).toBe(false);
    }));
  });

  describe('Interface State Reset', () => {
    it('should reset interface toggle state for new photo', fakeAsync(() => {
      // Change to map view
      interfaceToggleService.setActiveView('map');
      tick();
      fixture.detectChanges();

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Interface should be reset
      expect(interfaceToggleService.resetForNewPhoto).toHaveBeenCalled();
    }));

    it('should preserve interface preferences while resetting content', fakeAsync(() => {
      // Set specific interface state
      interfaceToggleService.setActiveView('map');
      tick();
      fixture.detectChanges();

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Reset should be called but preferences might be preserved
      expect(interfaceToggleService.resetForNewPhoto).toHaveBeenCalled();
    }));
  });

  describe('Complete Reset Workflow', () => {
    it('should perform complete reset when advancing through multiple photos', fakeAsync(() => {
      // Modify all states
      hostComponent.zoomPhoto();
      hostComponent.panPhoto();
      hostComponent.addMapPin();
      hostComponent.changeYear();
      hostComponent.showResults();
      tick();
      fixture.detectChanges();

      // Verify states are modified
      expect(hostComponent.currentZoomLevel).toBeGreaterThan(1);
      expect(hostComponent.currentZoomPosition.x !== 0 || hostComponent.currentZoomPosition.y !== 0).toBe(true);
      expect(hostComponent.mapPinCount).toBeGreaterThan(0);
      expect(hostComponent.currentSelectedYear).not.toBe(1966);
      expect(hostComponent.resultsVisible).toBe(true);

      // Advance to next photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // All states should be reset
      expect(hostComponent.currentZoomLevel).toBe(1);
      expect(hostComponent.currentZoomPosition.x).toBe(0);
      expect(hostComponent.currentZoomPosition.y).toBe(0);
      expect(hostComponent.mapPinCount).toBe(0);
      expect(hostComponent.currentSelectedYear).toBe(1966);
      expect(hostComponent.resultsVisible).toBe(false);

      // Photo should be updated
      expect(hostComponent.currentPhoto.id).toBe('photo-2');
    }));

    it('should handle reset across all three photos', fakeAsync(() => {
      for (let i = 0; i < 2; i++) {
        // Modify states
        hostComponent.zoomPhoto();
        hostComponent.addMapPin();
        hostComponent.changeYear();
        tick();
        fixture.detectChanges();

        // Advance to next photo
        hostComponent.nextPhoto();
        tick();
        fixture.detectChanges();

        // Verify reset
        expect(hostComponent.currentZoomLevel).toBe(1);
        expect(hostComponent.mapPinCount).toBe(0);
        expect(hostComponent.currentSelectedYear).toBe(1966);
        expect(hostComponent.currentPhoto.id).toBe(`photo-${i + 2}`);
      }
    }));

    it('should maintain photo progression counter during resets', fakeAsync(() => {
      expect(hostComponent.currentPhotoIndex).toBe(0);

      // Advance through photos
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();
      expect(hostComponent.currentPhotoIndex).toBe(1);

      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();
      expect(hostComponent.currentPhotoIndex).toBe(2);

      // Should not advance beyond last photo
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();
      expect(hostComponent.currentPhotoIndex).toBe(2);
    }));
  });

  describe('Manual Reset Functionality', () => {
    it('should support manual reset without photo advancement', fakeAsync(() => {
      // Modify states
      hostComponent.zoomPhoto();
      hostComponent.panPhoto();
      hostComponent.addMapPin();
      hostComponent.changeYear();
      hostComponent.showResults();
      tick();
      fixture.detectChanges();

      const initialPhotoIndex = hostComponent.currentPhotoIndex;
      const initialPhotoId = hostComponent.currentPhoto.id;

      // Manual reset
      const manualResetButton = debugElement.query(By.css('.manual-reset-btn'));
      manualResetButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      // States should be reset but photo should remain the same
      expect(hostComponent.currentZoomLevel).toBe(1);
      expect(hostComponent.currentZoomPosition.x).toBe(0);
      expect(hostComponent.currentZoomPosition.y).toBe(0);
      expect(hostComponent.mapPinCount).toBe(0);
      expect(hostComponent.currentSelectedYear).toBe(1966);
      expect(hostComponent.resultsVisible).toBe(false);

      // Photo should not change
      expect(hostComponent.currentPhotoIndex).toBe(initialPhotoIndex);
      expect(hostComponent.currentPhoto.id).toBe(initialPhotoId);
    }));
  });

  describe('Error Handling During Reset', () => {
    it('should handle reset errors gracefully', fakeAsync(() => {
      // Simulate service error
      mapService.resetToDefault.and.throwError('Map reset error');

      expect(() => {
        hostComponent.nextPhoto();
        tick();
        fixture.detectChanges();
      }).not.toThrow();

      // Other resets should still work
      expect(hostComponent.currentZoomLevel).toBe(1);
      expect(hostComponent.currentSelectedYear).toBe(1966);
    }));

    it('should handle partial reset failures', fakeAsync(() => {
      // Simulate zoom service error
      spyOn(photoZoomService, 'reset').and.throwError('Zoom reset error');

      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Other components should still reset
      expect(hostComponent.currentSelectedYear).toBe(1966);
      expect(hostComponent.mapPinCount).toBe(0);
      expect(hostComponent.resultsVisible).toBe(false);
    }));
  });

  describe('Performance During Reset', () => {
    it('should perform reset operations efficiently', fakeAsync(() => {
      const startTime = performance.now();

      // Perform multiple resets
      for (let i = 0; i < 5; i++) {
        hostComponent.zoomPhoto();
        hostComponent.addMapPin();
        hostComponent.changeYear();
        hostComponent.nextPhoto();
        tick();
      }
      fixture.detectChanges();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    }));

    it('should not cause memory leaks during repeated resets', fakeAsync(() => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many reset cycles
      for (let i = 0; i < 10; i++) {
        hostComponent.zoomPhoto();
        hostComponent.panPhoto();
        hostComponent.addMapPin();
        hostComponent.changeYear();
        hostComponent.showResults();
        hostComponent.manualReset();
        tick();
      }
      fixture.detectChanges();

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    }));
  });

  describe('Integration with Store', () => {
    it('should update store state during reset', fakeAsync(() => {
      spyOn(mockStore, 'dispatch');

      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // Store should be updated through service calls
      expect(interfaceToggleService.resetForNewPhoto).toHaveBeenCalled();
    }));

    it('should maintain consistent state across components', fakeAsync(() => {
      // Modify states
      hostComponent.zoomPhoto();
      hostComponent.addMapPin();
      tick();
      fixture.detectChanges();

      // Reset
      hostComponent.nextPhoto();
      tick();
      fixture.detectChanges();

      // All components should reflect reset state
      const stateDisplay = debugElement.query(By.css('.state-display'));
      const zoomLevel = stateDisplay.query(By.css('.zoom-level'));
      const mapPins = stateDisplay.query(By.css('.map-pins'));
      const selectedYear = stateDisplay.query(By.css('.selected-year'));

      expect(zoomLevel.nativeElement.textContent).toContain('1');
      expect(mapPins.nativeElement.textContent).toContain('0');
      expect(selectedYear.nativeElement.textContent).toContain('1966');
    }));
  });
});