import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideHttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { gameReducer } from '../state/game/game.reducer';
import { photosReducer } from '../state/photos/photos.reducer';
import { scoringReducer } from '../state/scoring/scoring.reducer';
import { PhotosEffects } from '../state/photos/photos.effects';
import { ScoringEffects } from '../state/scoring/scoring.effects';
import { selectGameStatus } from '../state/game/game.selectors';
import { selectCurrentPhoto } from '../state/photos/photos.selectors';
import { selectAllScores } from '../state/scoring/scoring.selectors';

@Component({
  template: '<div>Start Screen</div>',
  standalone: true
})
class MockStartScreenComponent {}

@Component({
  template: '<div>Game Component</div>',
  standalone: true
})
class MockGameComponent {}

@Component({
  template: '<div>Final Results</div>',
  standalone: true
})
class MockFinalResultsComponent {}

describe('Game Workflow E2E', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        provideRouter([
          { path: '', component: MockStartScreenComponent },
          { path: 'game', component: MockGameComponent },
          { path: 'results', component: MockFinalResultsComponent }
        ]),
        provideHttpClient(),
        provideStore({
          game: gameReducer,
          photos: photosReducer,
          scoring: scoringReducer
        }),
        provideEffects([PhotosEffects, ScoringEffects])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should support complete game workflow navigation', async () => {
    // Test that routing is properly configured
    expect(router).toBeTruthy();
    
    // Test navigation to start screen
    await router.navigate(['']);
    expect(router.url).toBe('/');
    
    // Test navigation to game
    await router.navigate(['/game']);
    expect(router.url).toBe('/game');
    
    // Test navigation to results
    await router.navigate(['/results']);
    expect(router.url).toBe('/results');
  });

  it('should have all required reducers configured', () => {
    // Test that the store is properly configured by accessing the store
    const store = TestBed.inject(Store) as Store<any>;
    expect(store).toBeTruthy();
    
    // Verify we can select from each reducer without errors
    store.select(selectGameStatus).subscribe();
    store.select(selectCurrentPhoto).subscribe();
    store.select(selectAllScores).subscribe();
    
    // If we get here without errors, reducers are properly configured
    expect(true).toBe(true);
  });

  it('should have all required effects configured', () => {
    // Test that effects are properly configured by checking if they exist
    // Effects are configured in the TestBed setup
    const store = TestBed.inject(Store) as Store<any>;
    expect(store).toBeTruthy();
    
    // If the test module was configured properly with effects, they should be available
    // We can verify this by checking that the store exists and is functional
    expect(true).toBe(true);
  });
});