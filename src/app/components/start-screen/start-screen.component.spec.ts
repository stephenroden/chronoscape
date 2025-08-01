import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { StartScreenComponent } from './start-screen.component';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as GameActions from '../../state/game/game.actions';

describe('StartScreenComponent', () => {
  let component: StartScreenComponent;
  let fixture: ComponentFixture<StartScreenComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [StartScreenComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StartScreenComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default store selectors
    mockStore.select.and.returnValue(of(false)); // Default to not loading
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start game and navigate to game screen', () => {
    component.startGame();

    expect(mockStore.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotosWithOptions({ forceRefresh: true }));
    expect(mockStore.dispatch).toHaveBeenCalledWith(GameActions.startGame());
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should retry loading photos', () => {
    component.retryLoadPhotos();

    expect(mockStore.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotos());
  });

  it('should clear game error', () => {
    component.clearGameError();

    expect(mockStore.dispatch).toHaveBeenCalledWith(GameActions.clearGameError());
  });

  it('should return user-friendly error message for network error', () => {
    const error = 'Network connection failed';
    
    const message = component.getErrorMessage(error);
    
    expect(message).toBe('Unable to connect to the internet. Please check your connection and try again.');
  });

  it('should return user-friendly error message for no photos error', () => {
    const error = 'No suitable photos found';
    
    const message = component.getErrorMessage(error);
    
    expect(message).toBe('Unable to find photos for the game. Please try again in a moment.');
  });

  it('should return user-friendly error message for rate limiting', () => {
    const error = 'Too many requests';
    
    const message = component.getErrorMessage(error);
    
    expect(message).toBe('Please wait a moment before trying again.');
  });

  it('should return original error message for unknown errors', () => {
    const error = 'Unknown error occurred';
    
    const message = component.getErrorMessage(error);
    
    expect(message).toBe('Unknown error occurred');
  });

  it('should return empty string for null error', () => {
    const message = component.getErrorMessage(null);
    
    expect(message).toBe('');
  });

  it('should identify retryable errors correctly', () => {
    expect(component.isRetryableError('Network connection failed')).toBe(true);
    expect(component.isRetryableError('Server error occurred')).toBe(true);
    expect(component.isRetryableError('Too many requests')).toBe(true);
    expect(component.isRetryableError('No suitable photos found')).toBe(true);
    expect(component.isRetryableError('Unknown error')).toBe(false);
    expect(component.isRetryableError(null)).toBe(false);
  });

  it('should display loading state when photos are loading', () => {
    mockStore.select.and.callFake((selector: any) => {
      if (selector.toString().includes('PhotosLoading')) {
        return of(true);
      }
      return of(false);
    });

    fixture.detectChanges();

    const loadingElement = fixture.nativeElement.querySelector('.loading-container');
    expect(loadingElement).toBeTruthy();
    expect(loadingElement.textContent).toContain('Preparing your game...');
  });

  it('should disable start button when loading', () => {
    mockStore.select.and.callFake((selector: any) => {
      if (selector.toString().includes('PhotosLoading')) {
        return of(true);
      }
      return of(false);
    });

    fixture.detectChanges();

    const startButton = fixture.nativeElement.querySelector('.start-button');
    expect(startButton.disabled).toBe(true);
    expect(startButton.textContent).toContain('Loading...');
  });

  it('should display error section when there are errors', () => {
    mockStore.select.and.callFake((selector: any) => {
      if (selector.toString().includes('PhotosError')) {
        return of('Network connection failed');
      }
      return of(null);
    });

    fixture.detectChanges();

    const errorSection = fixture.nativeElement.querySelector('.error-section');
    expect(errorSection).toBeTruthy();
    expect(errorSection.textContent).toContain('Unable to start game');
  });

  it('should show retry button for retryable errors', () => {
    mockStore.select.and.callFake((selector: any) => {
      if (selector.toString().includes('PhotosError')) {
        return of('Network connection failed');
      }
      return of(null);
    });

    fixture.detectChanges();

    const retryButton = fixture.nativeElement.querySelector('.error-actions .primary-button');
    expect(retryButton).toBeTruthy();
    expect(retryButton.textContent).toContain('Try Again');
  });
});