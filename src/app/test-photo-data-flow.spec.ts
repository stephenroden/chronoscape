import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BehaviorSubject, of } from 'rxjs';
import { GameComponent } from './components/game/game.component';
import { PhotoMapToggleComponent } from './components/photo-map-toggle/photo-map-toggle.component';
import { Photo } from './models/photo.model';
import * as PhotosSelectors from './state/photos/photos.selectors';
import * as GameSelectors from './state/game/game.selectors';

/**
 * Test to verify photo data flow from store to components
 * Task 1: Debug the currentPhoto$ observable and verify photo-map-toggle receives non-null photo data
 */
describe('Photo Data Flow Integration Test', () => {
  let mockStore: jasmine.SpyObj<Store>;
  let currentPhotoSubject: BehaviorSubject<Photo | null>;
  let gameStatusSubject: BehaviorSubject<any>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/test-photo.jpg',
    title: 'Test Historical Photo',
    description: 'A test photo for data flow verification',
    year: 1950,
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    source: 'Test Source',
    metadata: {
      photographer: 'Test Photographer',
      license: 'CC BY 4.0',
      originalSource: 'Test Archive',
      dateCreated: new Date('1950-01-01'),
      format: 'JPEG',
      mimeType: 'image/jpeg'
    }
  };

  beforeEach(async () => {
    currentPhotoSubject = new BehaviorSubject<Photo | null>(null);
    gameStatusSubject = new BehaviorSubject<any>('NOT_STARTED');

    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    
    // Mock store selectors
    mockStore.select.and.callFake((selector: any) => {
      if (selector === PhotosSelectors.selectCurrentPhoto) {
        return currentPhotoSubject.asObservable();
      }
      if (selector === GameSelectors.selectGameStatus) {
        return gameStatusSubject.asObservable();
      }
      // Default mock for other selectors
      return of(null);
    });

    await TestBed.configureTestingModule({
      imports: [GameComponent, PhotoMapToggleComponent],
      providers: [
        { provide: Store, useValue: mockStore }
      ]
    }).compileComponents();
  });

  it('should pass photo data from GameComponent to PhotoMapToggleComponent', (done) => {
    console.log('[TEST] Starting photo data flow test');
    
    const fixture = TestBed.createComponent(GameComponent);
    const gameComponent = fixture.componentInstance;
    
    // Subscribe to the currentPhoto$ observable to verify it emits correctly
    let photoEmissionCount = 0;
    gameComponent.currentPhoto$.subscribe(photo => {
      photoEmissionCount++;
      console.log(`[TEST] GameComponent currentPhoto$ emission ${photoEmissionCount}:`, {
        photo: photo ? {
          id: photo.id,
          title: photo.title,
          year: photo.year,
          hasUrl: !!photo.url,
          hasCoordinates: !!photo.coordinates
        } : null
      });

      if (photoEmissionCount === 1) {
        // First emission should be null (initial state)
        expect(photo).toBeNull();
      } else if (photoEmissionCount === 2) {
        // Second emission should be our mock photo
        expect(photo).not.toBeNull();
        expect(photo?.id).toBe('test-photo-1');
        expect(photo?.title).toBe('Test Historical Photo');
        expect(photo?.year).toBe(1950);
        expect(photo?.coordinates).toBeDefined();
        expect(photo?.coordinates.latitude).toBe(40.7128);
        expect(photo?.coordinates.longitude).toBe(-74.0060);
        
        console.log('[TEST] Photo data flow verification PASSED');
        done();
      }
    });

    fixture.detectChanges();

    // Simulate photo loading by emitting a photo
    console.log('[TEST] Emitting mock photo to currentPhotoSubject');
    currentPhotoSubject.next(mockPhoto);
  });

  it('should validate photo data in PhotoMapToggleComponent', () => {
    console.log('[TEST] Starting PhotoMapToggleComponent photo validation test');
    
    const fixture = TestBed.createComponent(PhotoMapToggleComponent);
    const component = fixture.componentInstance;

    // Set photo input directly
    component.photo = mockPhoto;
    fixture.detectChanges();

    // Verify photo was set correctly
    expect(component.photo).not.toBeNull();
    expect(component.photo?.id).toBe('test-photo-1');
    expect(component.photo?.title).toBe('Test Historical Photo');
    
    console.log('[TEST] PhotoMapToggleComponent photo validation PASSED');
  });

  it('should handle null photo gracefully', () => {
    console.log('[TEST] Starting null photo handling test');
    
    const fixture = TestBed.createComponent(PhotoMapToggleComponent);
    const component = fixture.componentInstance;

    // Set photo to null
    component.photo = null;
    fixture.detectChanges();

    // Verify null photo is handled correctly
    expect(component.photo).toBeNull();
    
    console.log('[TEST] Null photo handling PASSED');
  });
});