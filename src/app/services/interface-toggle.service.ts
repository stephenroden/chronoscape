import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, timer } from 'rxjs';
import { map, take, filter, switchMap } from 'rxjs/operators';

import { AppState } from '../state/app.state';
import { ActiveView, PhotoZoomState, MapState } from '../models/interface-state.model';
import * as InterfaceActions from '../state/interface/interface.actions';
import * as InterfaceSelectors from '../state/interface/interface.selectors';
import { Coordinates } from '../models/coordinates.model';

/**
 * Service for managing interface toggle state and transitions
 */
@Injectable({
  providedIn: 'root'
})
export class InterfaceToggleService {
  // Observable streams for component consumption
  public readonly activeView$: Observable<ActiveView>;
  public readonly isPhotoActive$: Observable<boolean>;
  public readonly isMapActive$: Observable<boolean>;
  public readonly inactiveView$: Observable<ActiveView>;
  public readonly transitionInProgress$: Observable<boolean>;
  public readonly canToggle$: Observable<boolean>;
  
  // Photo zoom observables
  public readonly photoZoomState$: Observable<PhotoZoomState>;
  public readonly photoZoomLevel$: Observable<number>;
  public readonly photoPosition$: Observable<{ x: number; y: number }>;
  public readonly isPhotoZoomed$: Observable<boolean>;
  public readonly canZoomIn$: Observable<boolean>;
  public readonly canZoomOut$: Observable<boolean>;
  
  // Map state observables
  public readonly mapState$: Observable<MapState>;
  public readonly mapZoomLevel$: Observable<number>;
  public readonly mapCenter$: Observable<Coordinates>;
  public readonly isMapAtDefault$: Observable<boolean>;
  
  // Combined state observables
  public readonly toggleState$: Observable<any>;
  public readonly currentViewState$: Observable<any>;

  constructor(private store: Store<AppState>) {
    // Initialize observables in constructor
    this.activeView$ = this.store.select(InterfaceSelectors.selectActiveView);
    this.isPhotoActive$ = this.store.select(InterfaceSelectors.selectIsPhotoActive);
    this.isMapActive$ = this.store.select(InterfaceSelectors.selectIsMapActive);
    this.inactiveView$ = this.store.select(InterfaceSelectors.selectInactiveView);
    this.transitionInProgress$ = this.store.select(InterfaceSelectors.selectTransitionInProgress);
    this.canToggle$ = this.store.select(InterfaceSelectors.selectCanToggle);
    
    this.photoZoomState$ = this.store.select(InterfaceSelectors.selectPhotoZoomState);
    this.photoZoomLevel$ = this.store.select(InterfaceSelectors.selectPhotoZoomLevel);
    this.photoPosition$ = this.store.select(InterfaceSelectors.selectPhotoPosition);
    this.isPhotoZoomed$ = this.store.select(InterfaceSelectors.selectIsPhotoZoomed);
    this.canZoomIn$ = this.store.select(InterfaceSelectors.selectCanZoomIn);
    this.canZoomOut$ = this.store.select(InterfaceSelectors.selectCanZoomOut);
    
    this.mapState$ = this.store.select(InterfaceSelectors.selectMapState);
    this.mapZoomLevel$ = this.store.select(InterfaceSelectors.selectMapZoomLevel);
    this.mapCenter$ = this.store.select(InterfaceSelectors.selectMapCenter);
    this.isMapAtDefault$ = this.store.select(InterfaceSelectors.selectIsMapAtDefault);
    
    this.toggleState$ = this.store.select(InterfaceSelectors.selectToggleState);
    this.currentViewState$ = this.store.select(InterfaceSelectors.selectCurrentViewState);
  }

  /**
   * Toggle between photo and map views
   * @param transitionDuration - Duration of transition animation in ms (default: 300)
   */
  toggleView(transitionDuration: number = 300): Observable<ActiveView> {
    return this.canToggle$.pipe(
      take(1),
      filter(canToggle => canToggle),
      switchMap(() => {
        // Start the toggle
        this.store.dispatch(InterfaceActions.toggleView());
        
        // Complete transition after animation duration
        return timer(transitionDuration).pipe(
          map(() => {
            this.store.dispatch(InterfaceActions.completeTransition());
            // Return the new active view
            return this.getCurrentActiveView();
          })
        );
      })
    );
  }

  /**
   * Set active view directly
   * @param activeView - The view to activate
   * @param transitionDuration - Duration of transition animation in ms (default: 300)
   */
  setActiveView(activeView: ActiveView, transitionDuration: number = 300): Observable<ActiveView> {
    return this.activeView$.pipe(
      take(1),
      switchMap(currentView => {
        if (currentView === activeView) {
          return [activeView]; // No change needed
        }

        return this.canToggle$.pipe(
          take(1),
          filter(canToggle => canToggle),
          switchMap(() => {
            this.store.dispatch(InterfaceActions.setActiveView({ activeView }));
            
            return timer(transitionDuration).pipe(
              map(() => {
                this.store.dispatch(InterfaceActions.completeTransition());
                return activeView;
              })
            );
          })
        );
      })
    );
  }

  /**
   * Get current active view synchronously (for immediate access)
   */
  getCurrentActiveView(): ActiveView {
    let currentView: ActiveView = 'photo';
    this.activeView$.pipe(take(1)).subscribe(view => currentView = view);
    return currentView;
  }

  /**
   * Check if transition is currently in progress
   */
  isTransitionInProgress(): boolean {
    let inProgress = false;
    this.transitionInProgress$.pipe(take(1)).subscribe(status => inProgress = status);
    return inProgress;
  }

  // Photo zoom methods
  /**
   * Set photo zoom level
   * @param zoomLevel - The zoom level to set
   */
  setPhotoZoom(zoomLevel: number): void {
    this.store.dispatch(InterfaceActions.setPhotoZoom({ zoomLevel }));
  }

  /**
   * Set photo position
   * @param position - The position to set
   */
  setPhotoPosition(position: { x: number; y: number }): void {
    this.store.dispatch(InterfaceActions.setPhotoPosition({ position }));
  }

  /**
   * Set complete photo zoom state
   * @param photoZoom - The photo zoom state to set
   */
  setPhotoZoomState(photoZoom: PhotoZoomState): void {
    this.store.dispatch(InterfaceActions.setPhotoZoomState({ photoZoom }));
  }

  /**
   * Reset photo zoom to default
   */
  resetPhotoZoom(): void {
    this.store.dispatch(InterfaceActions.resetPhotoZoom());
  }

  // Map state methods
  /**
   * Set map zoom level
   * @param zoomLevel - The zoom level to set
   */
  setMapZoom(zoomLevel: number): void {
    this.store.dispatch(InterfaceActions.setMapZoom({ zoomLevel }));
  }

  /**
   * Set map center
   * @param center - The center coordinates to set
   */
  setMapCenter(center: Coordinates): void {
    this.store.dispatch(InterfaceActions.setMapCenter({ center }));
  }

  /**
   * Set complete map state
   * @param mapState - The map state to set
   */
  setMapState(mapState: MapState): void {
    this.store.dispatch(InterfaceActions.setMapState({ mapState }));
  }

  /**
   * Reset map to default state
   */
  resetMapState(): void {
    this.store.dispatch(InterfaceActions.resetMapState());
  }

  // Combined operations
  /**
   * Reset entire interface state to defaults
   */
  resetInterfaceState(): void {
    this.store.dispatch(InterfaceActions.resetInterfaceState());
  }

  /**
   * Reset interface for new photo (preserves some state, resets others)
   */
  resetForNewPhoto(): void {
    this.store.dispatch(InterfaceActions.resetForNewPhoto());
  }

  /**
   * Preserve current state and return it for restoration later
   */
  preserveCurrentState(): Observable<{ photoZoom: PhotoZoomState; mapState: MapState }> {
    return this.store.select(InterfaceSelectors.selectStateForPreservation).pipe(take(1));
  }

  /**
   * Restore previously preserved state
   * @param preservedState - The state to restore
   */
  restoreState(preservedState: { photoZoom: PhotoZoomState; mapState: MapState }): void {
    this.store.dispatch(InterfaceActions.setPhotoZoomState({ photoZoom: preservedState.photoZoom }));
    this.store.dispatch(InterfaceActions.setMapState({ mapState: preservedState.mapState }));
  }

  /**
   * Check if interface needs reset (has non-default values)
   */
  needsReset(): Observable<boolean> {
    return this.store.select(InterfaceSelectors.selectNeedsReset);
  }

  /**
   * Get thumbnail data for inactive view
   */
  getThumbnailData(): Observable<{ view: ActiveView; isActive: boolean }> {
    return combineLatest([
      this.activeView$,
      this.inactiveView$
    ]).pipe(
      map(([activeView, inactiveView]) => ({
        view: inactiveView,
        isActive: false
      }))
    );
  }

  /**
   * Handle keyboard shortcuts for toggle operations
   * @param key - The key that was pressed
   */
  handleKeyboardShortcut(key: string): boolean {
    switch (key.toLowerCase()) {
      case 't':
      case 'tab':
        this.toggleView();
        return true;
      case 'p':
        this.setActiveView('photo');
        return true;
      case 'm':
        this.setActiveView('map');
        return true;
      case 'r':
        this.resetInterfaceState();
        return true;
      default:
        return false;
    }
  }
}