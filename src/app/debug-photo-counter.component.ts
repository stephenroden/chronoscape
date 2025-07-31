import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from './state/app.state';
import * as GameActions from './state/game/game.actions';
import * as GameSelectors from './state/game/game.selectors';
import { GameStatus } from './models/game-state.model';

@Component({
  selector: 'app-debug-photo-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="debug-container">
      <h2>Photo Counter Debug</h2>
      
      <div class="current-state">
        <h3>Current State:</h3>
        <p>Photo Index: {{ (currentPhotoIndex$ | async) }}</p>
        <p>Total Photos: {{ (totalPhotos$ | async) }}</p>
        <p>Game Status: {{ (gameStatus$ | async) }}</p>
        <p>Progress: {{ (gameProgress$ | async)?.current }} of {{ (gameProgress$ | async)?.total }}</p>
        <p>Display: Photo {{ (gameProgress$ | async)?.current }} of {{ (gameProgress$ | async)?.total }}</p>
        <p>Percentage: {{ (gameProgress$ | async)?.percentage }}%</p>
      </div>
      
      <div class="controls">
        <button (click)="startGame()" [disabled]="(gameStatus$ | async) === GameStatus.IN_PROGRESS">Start Game</button>
        <button (click)="nextPhoto()" [disabled]="(gameStatus$ | async) !== GameStatus.IN_PROGRESS">Next Photo</button>
        <button (click)="resetGame()">Reset Game</button>
      </div>
      
      <div class="test-scenarios">
        <h3>Test Scenarios:</h3>
        <button (click)="testScenario(0)">Test Photo 1 (index 0)</button>
        <button (click)="testScenario(1)">Test Photo 2 (index 1)</button>
        <button (click)="testScenario(2)">Test Photo 3 (index 2)</button>
        <button (click)="testScenario(3)">Test Photo 4 (index 3)</button>
        <button (click)="testScenario(4)">Test Photo 5 (index 4)</button>
      </div>
    </div>
  `,
  styles: [`
    .debug-container {
      padding: 20px;
      font-family: monospace;
    }
    .current-state {
      background: #f0f0f0;
      padding: 10px;
      margin: 10px 0;
    }
    .controls, .test-scenarios {
      margin: 10px 0;
    }
    button {
      margin: 5px;
      padding: 5px 10px;
    }
  `]
})
export class DebugPhotoCounterComponent implements OnInit {
  currentPhotoIndex$: Observable<number>;
  totalPhotos$: Observable<number>;
  gameStatus$: Observable<GameStatus>;
  gameProgress$: Observable<{ current: number; total: number; percentage: number }>;
  
  // Make GameStatus enum available in template
  GameStatus = GameStatus;

  constructor(private store: Store<AppState>) {
    this.currentPhotoIndex$ = this.store.select(GameSelectors.selectCurrentPhotoIndex);
    this.totalPhotos$ = this.store.select(GameSelectors.selectTotalPhotos);
    this.gameStatus$ = this.store.select(GameSelectors.selectGameStatus);
    this.gameProgress$ = this.store.select(GameSelectors.selectGameProgress);
  }

  ngOnInit(): void {
    // Subscribe to changes for debugging
    this.gameProgress$.subscribe(progress => {
      console.log('[DebugComponent] Game progress changed:', progress);
    });
  }

  startGame(): void {
    this.store.dispatch(GameActions.startGame());
  }

  nextPhoto(): void {
    this.store.dispatch(GameActions.nextPhoto());
  }

  resetGame(): void {
    this.store.dispatch(GameActions.resetGame());
  }

  testScenario(photoIndex: number): void {
    console.log(`[DebugComponent] Testing scenario with photo index ${photoIndex}`);
    // Reset game first
    this.store.dispatch(GameActions.resetGame());
    // Start game
    this.store.dispatch(GameActions.startGame());
    // Advance to the desired photo index
    for (let i = 0; i < photoIndex; i++) {
      this.store.dispatch(GameActions.nextPhoto());
    }
  }
}