import { Injectable } from '@angular/core';
import { CanActivate, CanDeactivate, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map, take } from 'rxjs';
import { AppState } from '../state/app.state';
import { GameStatus } from '../models/game-state.model';
import * as GameSelectors from '../state/game/game.selectors';

/**
 * Interface for components that can be deactivated
 */
export interface CanComponentDeactivate {
  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean;
}

/**
 * Guard to protect game routes and prevent navigation during active games.
 * Implements route protection to ensure users don't accidentally leave active games.
 */
@Injectable({
  providedIn: 'root'
})
export class GameGuard implements CanActivate, CanDeactivate<CanComponentDeactivate> {
  
  constructor(
    private store: Store<AppState>,
    private router: Router
  ) {}

  /**
   * Determines if the game route can be activated.
   * Allows access if game is in progress or starting.
   */
  canActivate(): Observable<boolean> {
    return this.store.select(GameSelectors.selectGameStatus).pipe(
      take(1),
      map(status => {
        // Allow access to game route if game is in progress or starting
        if (status === GameStatus.IN_PROGRESS || status === GameStatus.NOT_STARTED) {
          return true;
        }
        
        // If game is completed, redirect to results
        if (status === GameStatus.COMPLETED) {
          this.router.navigate(['/results']);
          return false;
        }
        
        // For error states, allow access so user can see error and restart
        return true;
      })
    );
  }

  /**
   * Determines if the user can leave the current route.
   * Prevents accidental navigation away from active games.
   */
  canDeactivate(component: CanComponentDeactivate): Observable<boolean> | Promise<boolean> | boolean {
    // If component has its own deactivation logic, use it
    if (component && component.canDeactivate) {
      return component.canDeactivate();
    }

    // Check if game is in progress
    return this.store.select(GameSelectors.selectGameStatus).pipe(
      take(1),
      map(status => {
        // Allow navigation if game is not in progress
        if (status !== GameStatus.IN_PROGRESS) {
          return true;
        }

        // For active games, show confirmation dialog
        return this.confirmNavigation();
      })
    );
  }

  /**
   * Shows confirmation dialog for navigation away from active game
   */
  private confirmNavigation(): boolean {
    return confirm(
      'You have an active game in progress. Are you sure you want to leave? Your progress will be lost.'
    );
  }
}

/**
 * Guard specifically for the results route.
 * Ensures users can only access results after completing a game.
 */
@Injectable({
  providedIn: 'root'
})
export class ResultsGuard implements CanActivate {
  
  constructor(
    private store: Store<AppState>,
    private router: Router
  ) {}

  /**
   * Determines if the results route can be activated.
   * Only allows access if game is completed.
   */
  canActivate(): Observable<boolean> {
    return this.store.select(GameSelectors.selectGameStatus).pipe(
      take(1),
      map(status => {
        // Allow access only if game is completed
        if (status === GameStatus.COMPLETED) {
          return true;
        }
        
        // If game is in progress, redirect to game
        if (status === GameStatus.IN_PROGRESS) {
          this.router.navigate(['/game']);
          return false;
        }
        
        // For other states, redirect to start
        this.router.navigate(['/']);
        return false;
      })
    );
  }
}

/**
 * Guard for the start screen route.
 * Redirects to appropriate screen based on game state.
 */
@Injectable({
  providedIn: 'root'
})
export class StartGuard implements CanActivate {
  
  constructor(
    private store: Store<AppState>,
    private router: Router
  ) {}

  /**
   * Determines if the start route can be activated.
   * Redirects to game or results if appropriate.
   */
  canActivate(): Observable<boolean> {
    return this.store.select(GameSelectors.selectGameStatus).pipe(
      take(1),
      map(status => {
        // If game is in progress, redirect to game
        if (status === GameStatus.IN_PROGRESS) {
          this.router.navigate(['/game']);
          return false;
        }
        
        // If game is completed, redirect to results
        if (status === GameStatus.COMPLETED) {
          this.router.navigate(['/results']);
          return false;
        }
        
        // Allow access to start screen for not started or error states
        return true;
      })
    );
  }
}