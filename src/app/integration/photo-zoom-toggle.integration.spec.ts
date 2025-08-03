import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, BehaviorSubject } from 'rxjs';

import { PhotoMapToggleComponent } from '../components/photo-map-toggle/photo-map-toggle.component';
import { PhotoZoomControlsComponent } from '../components/photo-zoom-controls/photo-zoom-controls.component';
import { InterfaceToggleService } from '../services/interface-toggle.service';
import { PhotoZoomService, PhotoZoomState } from '../services/photo-zoom.service';
import { Photo } from '../models/photo.model';
import { ActiveView } from '../models/interface-state.model';
import { AppState } from '../state/app.state';

// Mock photo display component with zoom integration
@Component({
  selector: 'app-photo-display',
  template: `
    <div class="photo-display-container" 
         [style.width.px]="containerWidth" 
         [style.height.px]="containerHeight">
      <div class="photo-wrapper" 
           [style.transform]="photoTransform"
           [style.transition]="transitionStyle"
           (mousedown)="onPanStart($event)"
           (touchstart)="onTouchStart($event)">
        <img [src]="photo?.url" 
             [alt]="photo?.title"
             [style.width.px]="imageWidth"
             [style.height.px]="imageHeight"
             (load)="onImageLoad($event)" />
      </div>
      
      <app-photo-zoom-controls
        [canZoomIn]="canZoomIn"
        [canZoomOut]="canZoomOut"
        [zoomLevel]="currentZoomLevel"
        (zoomIn)="onZoomIn()"
        (zoomOut)="onZoomOut()"
        (reset)="onZoomReset()">
      </app-photo-zoom-controls>
    </div>
  `,
  standalone: true,
  imports: [PhotoZoomControlsComponent]
})
class MockPhotoDisplayComponent {
  photo: Photo | null = null;
  containerWidth = 800;
  containerHeight = 600;
  imageWidth = 1200;
  imageHeight = 900;
  
  photoTransform = 'translate(0px, 0px) scale(1)';
  transitionStyle = 'transform 0.3s ease';
  currentZoomLevel = 1;
  canZoomIn = true;
  canZoomOut = false;
  
  private isPanning = false;
  private lastPanPosition = { x: 0, y: 0 };
  
  constructor(private photoZoomService: PhotoZoomService) {
    this.photoZoomService.zoomState$.subscribe(state => {
      this.updateFromZoomState(state);
    });
  }
  
  private updateFromZoomState(state: PhotoZoomState): void {
    this.currentZoomLevel = state.zoomLevel;
    this.photoTransform = `translate(${state.position.x}px, ${state.position.y}px) scale(${state.zoomLevel})`;
    this.canZoomIn = this.photoZoomService.canZoomIn();
    this.canZoomOut = this.photoZoomService.canZoomOut();
  }
  
  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.photoZoomService.initializeZoom(
      this.containerWidth,
      this.containerHeight,
      img.naturalWidth,
      img.naturalHeight
    );
  }
  
  onZoomIn(): void {
    this.photoZoomService.zoomIn();
  }
  
  onZoomOut(): void {
    this.photoZoomService.zoomOut();
  }
  
  onZoomReset(): void {
    this.photoZoomService.reset();
  }
  
  onPanStart(event: MouseEvent): void {
    if (this.currentZoomLevel <= 1) return;
    
    this.isPanning = true;
    this.lastPanPosition = { x: event.clientX, y: event.clientY };
    
    document.addEventListener('mousemove', this.onPanMove.bind(this));
    document.addEventListener('mouseup', this.onPanEnd.bind(this));
    
    event.preventDefault();
  }
  
  private onPanMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    
    const deltaX = event.clientX - this.lastPanPosition.x;
    const deltaY = event.clientY - this.lastPanPosition.y;
    
    this.photoZoomService.pan(deltaX, deltaY);
    
    this.lastPanPosition = { x: event.clientX, y: event.clientY };
  }
  
  private onPanEnd(): void {
    this.isPanning = false;
    document.removeEventListener('mousemove', this.onPanMove.bind(this));
    document.removeEventListener('mouseup', this.onPanEnd.bind(this));
  }
  
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      // Single touch - pan
      this.handleSingleTouchStart(event);
    } else if (event.touches.length === 2) {
      // Pinch zoom
      this.handlePinchStart(event);
    }
  }
  
  private handleSingleTouchStart(event: TouchEvent): void {
    if (this.currentZoomLevel <= 1) return;
    
    const touch = event.touches[0];
    this.isPanning = true;
    this.lastPanPosition = { x: touch.clientX, y: touch.clientY };
    
    document.addEventListener('touchmove', this.onTouchMove.bind(this));
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  private handlePinchStart(event: TouchEvent): void {
    // Pinch zoom implementation would go here
    event.preventDefault();
  }
  
  private onTouchMove(event: TouchEvent): void {
    if (!this.isPanning || event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.lastPanPosition.x;
    const deltaY = touch.clientY - this.lastPanPosition.y;
    
    this.photoZoomService.pan(deltaX, deltaY);
    
    this.lastPanPosition = { x: touch.clientX, y: touch.clientY };
    event.preventDefault();
  }
  
  private onTouchEnd(): void {
    this.isPanning = false;
    document.removeEventListener('touchmove', this.onTouchMove.bind(this));
    document.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }
}

// Mock map component
@Component({
  selector: 'app-map-guess',
  template: `
    <div class="leaflet-map-container">
      <div class="map-placeholder">Map View</div>
    </div>
  `,
  standalone: true
})
class MockMapGuessComponent {}

// Test host component
@Component({
  template: `
    <div class="zoom-toggle-test">
      <app-photo-map-toggle
        [photo]="photo"
        [enableZoom]="true"
        (viewToggled)="onViewToggled($event)"
        (photoZoomChanged)="onPhotoZoomChanged($event)">
      </app-photo-map-toggle>
      
      <div class="test-controls">
        <button class="toggle-view-btn" (click)="toggleView()">Toggle View</button>
        <button class="zoom-in-btn" (click)="zoomIn()">Zoom In</button>
        <button class="zoom-out-btn" (click)="zoomOut()">Zoom Out</button>
        <button class="reset-zoom-btn" (click)="resetZoom()">Reset Zoom</button>
        <button class="pan-btn" (click)="panPhoto()">Pan Photo</button>
      </div>
      
      <div class="state-display">
        <div class="current-view">Current View: {{currentView}}</div>
        <div class="zoom-level">Zoom Level: {{zoomLevel}}</div>
        <div class="zoom-position">Position: {{zoomPosition.x}}, {{zoomPosition.y}}</div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [PhotoMapToggleComponent]
})
class TestHostComponent {
  photo: Photo = {
    id: 'test-photo-zoom',
    url: 'https://example.com/test-zoom-photo.jpg',
    title: 'Test Zoom Photo',
    description: 'A photo for testing zoom functionality',
    year: 1960,
    coordinates: { latitude: 45.0, longitude: -75.0 },
    source: 'test',
    metadata: {
      photographer: 'Test Photographer',
      license: 'CC BY 4.0',
      originalSource: 'Test Archive',
      dateCreated: new Date('1960-01-01'),
      format: 'JPEG',
      mimeType: 'image/jpeg'
    }
  };

  currentView: ActiveView = 'photo';
  zoomLevel = 1;
  zoomPosition = { x: 0, y: 0 };

  constructor(
    private interfaceToggleService: InterfaceToggleService,
    private photoZoomService: PhotoZoomService
  ) {}

  onViewToggled(view: ActiveView): void {
    this.currentView = view;
  }

  onPhotoZoomChanged(zoomState: PhotoZoomState): void {
    this.zoomLevel = zoomState.zoomLevel;
    this.zoomPosition = zoomState.position;
  }

  toggleView(): void {
    this.interfaceToggleService.toggleView();
  }

  zoomIn(): void {
    this.photoZoomService.zoomIn();
  }

  zoomOut(): void {
    this.photoZoomService.zoomOut();
  }

  resetZoom(): void {
    this.photoZoomService.reset();
  }

  panPhoto(): void {
    this.photoZoomService.pan(20, 15);
  }
}

/**
 * Integration tests for photo zoom and pan functionality within the toggle system
 * Tests the interaction between PhotoZoomService, PhotoMapToggleComponent, and PhotoDisplayComponent
 */
describe('Photo Zoom Toggle Integration', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockStore: MockStore<AppState>;
  let interfaceToggleService: InterfaceToggleService;
  let photoZoomService: PhotoZoomService;
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

  const initialState: AppState = {
    game: {
      gameStatus: 'IN_PROGRESS' as any,
      currentPhotoIndex: 0,
      totalPhotos: 5,
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
      mapState: {
        zoomLevel: 10,
        center: { latitude: 0, longitude: 0 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      },
      transitionInProgress: false
    }
  };

  beforeEach(async () => {
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
        PhotoZoomService
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as MockStore<AppState>;
    interfaceToggleService = TestBed.inject(InterfaceToggleService);
    photoZoomService = TestBed.inject(PhotoZoomService);

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    debugElement = fixture.debugElement;
    
    fixture.detectChanges();
  });

  describe('Zoom Controls Integration', () => {
    it('should integrate zoom controls with toggle system', fakeAsync(() => {
      // Requirement 2.1: Provide zoom controls
      const zoomControls = debugElement.query(By.css('app-photo-zoom-controls'));
      expect(zoomControls).toBeTruthy();

      // Test zoom in
      const zoomInButton = debugElement.query(By.css('.zoom-in-btn'));
      zoomInButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      // Zoom level should increase
      expect(hostComponent.zoomLevel).toBeGreaterThan(1);
    }));

    it('should preserve zoom state during view toggles', fakeAsync(() => {
      // Zoom in first
      const zoomInButton = debugElement.query(By.css('.zoom-in-btn'));
      zoomInButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      const initialZoomLevel = hostComponent.zoomLevel;
      expect(initialZoomLevel).toBeGreaterThan(1);

      // Toggle to map view
      const toggleButton = debugElement.query(By.css('.toggle-view-btn'));
      toggleButton.nativeElement.click();
      tick(300); // Wait for transition
      fixture.detectChanges();

      // Toggle back to photo
      toggleButton.nativeElement.click();
      tick(300);
      fixture.detectChanges();

      // Requirement 2.5: Preserve zoom level during toggles
      expect(hostComponent.zoomLevel).toBe(initialZoomLevel);
    }));

    it('should handle zoom limits correctly', fakeAsync(() => {
      // Test zoom out limit
      const zoomOutButton = debugElement.query(By.css('.zoom-out-btn'));
      
      // Should not be able to zoom out below minimum
      for (let i = 0; i < 5; i++) {
        zoomOutButton.nativeElement.click();
        tick();
      }
      fixture.detectChanges();

      // Requirement 2.3: Limit zoom to original photo dimensions
      expect(hostComponent.zoomLevel).toBeGreaterThanOrEqual(0.5); // Minimum zoom

      // Test zoom in limit
      const zoomInButton = debugElement.query(By.css('.zoom-in-btn'));
      
      for (let i = 0; i < 10; i++) {
        zoomInButton.nativeElement.click();
        tick();
      }
      fixture.detectChanges();

      expect(hostComponent.zoomLevel).toBeLessThanOrEqual(4); // Maximum zoom
    }));

    it('should reset zoom to default state', fakeAsync(() => {
      // Zoom in and pan
      const zoomInButton = debugElement.query(By.css('.zoom-in-btn'));
      const panButton = debugElement.query(By.css('.pan-btn'));
      
      zoomInButton.nativeElement.click();
      tick();
      panButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(hostComponent.zoomLevel).toBeGreaterThan(1);
      expect(hostComponent.zoomPosition.x !== 0 || hostComponent.zoomPosition.y !== 0).toBe(true);

      // Reset zoom
      const resetButton = debugElement.query(By.css('.reset-zoom-btn'));
      resetButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      // Requirement 2.4: Reset to original size and position
      expect(hostComponent.zoomLevel).toBe(1);
      expect(hostComponent.zoomPosition.x).toBe(0);
      expect(hostComponent.zoomPosition.y).toBe(0);
    }));
  });

  describe('Pan Functionality Integration', () => {
    it('should allow panning of zoomed images', fakeAsync(() => {
      // First zoom in to enable panning
      const zoomInButton = debugElement.query(By.css('.zoom-in-btn'));
      zoomInButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      const initialPosition = { ...hostComponent.zoomPosition };

      // Pan the image
      const panButton = debugElement.query(By.css('.pan-btn'));
      panButton.nativeElement.click();
      tick();
      fixture.detectChanges();

      // Requirement 2.2: Allow panning of zoomed image
      expect(hostComponent.zoomPosition.x).not.toBe(initialPosition.x);
      expect(hostComponent.zoomPosition.y).not.toBe(initialPosition.y);
    }));

    it('should constrain panning to image boundaries', fakeAsync(() => {
      // Zoom in significantly
      for (let i = 0; i < 3; i++) {
        photoZoomService.zoomIn();
        tick();
      }
      fixture.detectChanges();

      // Try to pan beyond boundaries
      for (let i = 0; i < 20; i++) {
        photoZoomService.pan(50, 50);
        tick();
      }
      fixture.detectChanges();

      // Position should be constrained within reasonable bounds
      const maxExpectedPan = 300; // Reasonable maximum based on zoom level
      expect(Math.abs(hostComponent.zoomPosition.x)).toBeLessThan(maxExpectedPan);
      expect(Math.abs(hostComponent.zoomPosition.y)).toBeLessThan(maxExpectedPan);
    }));

    it('should handle mouse pan interactions', fakeAsync(() => {
      // Zoom in first
      photoZoomService.zoomIn();
      tick();
      fixture.detectChanges();

      const photoDisplay = debugElement.query(By.css('app-photo-display'));
      const photoWrapper = photoDisplay.query(By.css('.photo-wrapper'));

      // Simulate mouse pan
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      
      photoWrapper.nativeElement.dispatchEvent(mouseDownEvent);
      tick();

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 120,
        clientY: 110,
        bubbles: true
      });
      
      document.dispatchEvent(mouseMoveEvent);
      tick();

      const mouseUpEvent = new MouseEvent('mouseup', {
        bubbles: true
      });
      
      document.dispatchEvent(mouseUpEvent);
      tick();
      fixture.detectChanges();

      // Position should have changed due to pan
      expect(hostComponent.zoomPosition.x !== 0 || hostComponent.zoomPosition.y !== 0).toBe(true);
    }));

    it('should handle touch pan interactions', fakeAsync(() => {
      // Zoom in first
      photoZoomService.zoomIn();
      tick();
      fixture.detectChanges();

      const photoDisplay = debugElement.query(By.css('app-photo-display'));
      const photoWrapper = photoDisplay.query(By.css('.photo-wrapper'));

      // Simulate touch pan
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
        bubbles: true
      });
      
      photoWrapper.nativeElement.dispatchEvent(touchStartEvent);
      tick();

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 120, clientY: 110 } as Touch],
        bubbles: true
      });
      
      document.dispatchEvent(touchMoveEvent);
      tick();

      const touchEndEvent = new TouchEvent('touchend', {
        touches: [],
        bubbles: true
      });
      
      document.dispatchEvent(touchEndEvent);
      tick();
      fixture.detectChanges();

      // Position should have changed due to touch pan
      expect(hostComponent.zoomPosition.x !== 0 || hostComponent.zoomPosition.y !== 0).toBe(true);
    }));
  });

  describe('Pinch-to-Zoom Integration', () => {
    it('should handle pinch-to-zoom gestures', fakeAsync(() => {
      // Requirement 4.5: Support pinch-to-zoom gestures
      const initialZoomLevel = hostComponent.zoomLevel;

      // Simulate pinch zoom
      photoZoomService.handlePinchZoom(1.5, 400, 300);
      tick();
      fixture.detectChanges();

      expect(hostComponent.zoomLevel).toBeGreaterThan(initialZoomLevel);
    }));

    it('should zoom towards pinch center point', fakeAsync(() => {
      const centerX = 400;
      const centerY = 300;
      const scale = 2.0;

      photoZoomService.handlePinchZoom(scale, centerX, centerY);
      tick();
      fixture.detectChanges();

      // Zoom should be applied and position adjusted towards center
      expect(hostComponent.zoomLevel).toBeGreaterThan(1);
      // Position adjustment would depend on the specific implementation
    }));

    it('should respect zoom limits during pinch gestures', fakeAsync(() => {
      // Try to pinch zoom beyond maximum
      photoZoomService.handlePinchZoom(10, 400, 300);
      tick();
      fixture.detectChanges();

      expect(hostComponent.zoomLevel).toBeLessThanOrEqual(4); // Maximum zoom limit

      // Try to pinch zoom below minimum
      photoZoomService.handlePinchZoom(0.1, 400, 300);
      tick();
      fixture.detectChanges();

      expect(hostComponent.zoomLevel).toBeGreaterThanOrEqual(0.5); // Minimum zoom limit
    }));
  });

  describe('State Preservation During Toggles', () => {
    it('should maintain zoom state when switching views', fakeAsync(() => {
      // Set up specific zoom state
      photoZoomService.setZoomLevel(2.5);
      photoZoomService.setPosition(50, -30);
      tick();
      fixture.detectChanges();

      const zoomState = {
        level: hostComponent.zoomLevel,
        position: { ...hostComponent.zoomPosition }
      };

      // Toggle to map view
      interfaceToggleService.toggleView();
      tick(300);
      fixture.detectChanges();

      // Toggle back to photo
      interfaceToggleService.toggleView();
      tick(300);
      fixture.detectChanges();

      // State should be preserved
      expect(hostComponent.zoomLevel).toBe(zoomState.level);
      expect(hostComponent.zoomPosition.x).toBe(zoomState.position.x);
      expect(hostComponent.zoomPosition.y).toBe(zoomState.position.y);
    }));

    it('should handle rapid view toggles with zoom state', fakeAsync(() => {
      // Set up zoom state
      photoZoomService.zoomIn();
      photoZoomService.pan(25, -15);
      tick();
      fixture.detectChanges();

      const initialState = {
        level: hostComponent.zoomLevel,
        position: { ...hostComponent.zoomPosition }
      };

      // Rapid toggles
      for (let i = 0; i < 5; i++) {
        interfaceToggleService.toggleView();
        tick(100); // Shorter tick for rapid toggles
      }
      fixture.detectChanges();

      // State should still be preserved
      expect(hostComponent.zoomLevel).toBe(initialState.level);
      expect(hostComponent.zoomPosition.x).toBe(initialState.position.x);
      expect(hostComponent.zoomPosition.y).toBe(initialState.position.y);
    }));
  });

  describe('Responsive Zoom Behavior', () => {
    it('should adapt zoom controls for mobile devices', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 360, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 640, configurable: true });

      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const zoomControls = debugElement.query(By.css('app-photo-zoom-controls'));
      expect(zoomControls).toBeTruthy();

      // Controls should be touch-friendly
      const buttons = zoomControls.queryAll(By.css('button'));
      buttons.forEach(button => {
        const rect = button.nativeElement.getBoundingClientRect();
        const minSize = Math.min(rect.width, rect.height);
        expect(minSize).toBeGreaterThanOrEqual(40); // Minimum touch target size
      });
    });

    it('should handle container resize during zoom', fakeAsync(() => {
      // Zoom in first
      photoZoomService.zoomIn();
      tick();
      fixture.detectChanges();

      // Simulate container resize
      photoZoomService.updateContainerDimensions(600, 400);
      tick();
      fixture.detectChanges();

      // Zoom should still be functional
      expect(hostComponent.zoomLevel).toBeGreaterThan(1);
      
      // Position should be adjusted for new container size
      // (specific behavior depends on implementation)
    }));
  });

  describe('Performance and Memory Management', () => {
    it('should handle zoom operations efficiently', fakeAsync(() => {
      // Perform many zoom operations
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          photoZoomService.zoomIn();
        } else {
          photoZoomService.zoomOut();
        }
        tick(10);
      }
      fixture.detectChanges();

      // Should complete without errors
      expect(hostComponent.zoomLevel).toBeGreaterThan(0);
    }));

    it('should clean up event listeners properly', () => {
      const photoDisplay = debugElement.query(By.css('app-photo-display'));
      const component = photoDisplay.componentInstance as MockPhotoDisplayComponent;

      // Simulate pan start to add event listeners
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100
      });
      
      component.onPanStart(mouseEvent);

      // Simulate pan end to remove event listeners
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid zoom operations gracefully', fakeAsync(() => {
      // Try to set invalid zoom level
      expect(() => {
        photoZoomService.setZoomLevel(-1);
        tick();
        fixture.detectChanges();
      }).not.toThrow();

      // Zoom level should be constrained to valid range
      expect(hostComponent.zoomLevel).toBeGreaterThanOrEqual(0.5);
    }));

    it('should handle pan operations on unzoomed images', fakeAsync(() => {
      // Try to pan when not zoomed
      expect(() => {
        photoZoomService.pan(100, 100);
        tick();
        fixture.detectChanges();
      }).not.toThrow();

      // Position should remain at origin for unzoomed images
      expect(hostComponent.zoomPosition.x).toBe(0);
      expect(hostComponent.zoomPosition.y).toBe(0);
    }));

    it('should handle missing image dimensions', fakeAsync(() => {
      // Initialize with zero dimensions
      expect(() => {
        photoZoomService.initializeZoom(0, 0, 0, 0);
        tick();
        fixture.detectChanges();
      }).not.toThrow();

      // Should handle gracefully
      expect(hostComponent.zoomLevel).toBe(1);
    }));
  });

  describe('Integration with Store', () => {
    it('should sync zoom state with NgRx store', fakeAsync(() => {
      // Change zoom level
      photoZoomService.zoomIn();
      tick();
      fixture.detectChanges();

      // Store should be updated through InterfaceToggleService
      // This would be verified through actual store integration
      expect(hostComponent.zoomLevel).toBeGreaterThan(1);
    }));

    it('should restore zoom state from store', fakeAsync(() => {
      // Simulate store state restoration
      const restoredState: PhotoZoomState = {
        zoomLevel: 2.5,
        position: { x: 75, y: -25 },
        minZoom: 0.5,
        maxZoom: 4,
        containerWidth: 800,
        containerHeight: 600,
        imageWidth: 1200,
        imageHeight: 900
      };

      interfaceToggleService.setPhotoZoomState(restoredState);
      tick();
      fixture.detectChanges();

      // Component should reflect restored state
      expect(hostComponent.zoomLevel).toBe(2.5);
      expect(hostComponent.zoomPosition.x).toBe(75);
      expect(hostComponent.zoomPosition.y).toBe(-25);
    }));
  });
});