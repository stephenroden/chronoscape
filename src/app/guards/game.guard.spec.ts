import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { GameGuard, ResultsGuard, StartGuard, CanComponentDeactivate } from './game.guard';
import { GameStatus } from '../models/game-state.model';

describe('GameGuard', () => {
  let guard: GameGuard;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        GameGuard,
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(GameGuard);
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('canActivate', () => {
    it('should allow access when game is in progress', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.IN_PROGRESS));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should allow access when game is not started', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.NOT_STARTED));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should redirect to results when game is completed', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.COMPLETED));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/results']);
        done();
      });
    });

    it('should allow access when game has error', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.ERROR));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('canDeactivate', () => {
    it('should allow deactivation when game is not in progress', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.NOT_STARTED));
      const mockComponent: CanComponentDeactivate = {
        canDeactivate: () => true
      };

      const result = guard.canDeactivate(mockComponent);
      if (result instanceof Promise) {
        result.then((res: boolean) => {
          expect(res).toBe(true);
          done();
        });
      } else if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: boolean) => {
          expect(res).toBe(true);
          done();
        });
      } else {
        expect(result).toBe(true);
        done();
      }
    });

    it('should use component deactivation logic when available', () => {
      const mockComponent: CanComponentDeactivate = {
        canDeactivate: () => false
      };

      const result = guard.canDeactivate(mockComponent);
      expect(result).toBe(false);
    });

    it('should show confirmation when game is in progress', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.IN_PROGRESS));
      spyOn(window, 'confirm').and.returnValue(true);

      const result = guard.canDeactivate({} as CanComponentDeactivate);
      if (result instanceof Promise) {
        result.then((res: boolean) => {
          expect(res).toBe(true);
          expect(window.confirm).toHaveBeenCalledWith(
            'You have an active game in progress. Are you sure you want to leave? Your progress will be lost.'
          );
          done();
        });
      } else if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: boolean) => {
          expect(res).toBe(true);
          expect(window.confirm).toHaveBeenCalledWith(
            'You have an active game in progress. Are you sure you want to leave? Your progress will be lost.'
          );
          done();
        });
      } else {
        expect(result).toBe(true);
        expect(window.confirm).toHaveBeenCalledWith(
          'You have an active game in progress. Are you sure you want to leave? Your progress will be lost.'
        );
        done();
      }
    });

    it('should prevent deactivation when user cancels confirmation', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.IN_PROGRESS));
      spyOn(window, 'confirm').and.returnValue(false);

      const result = guard.canDeactivate({} as CanComponentDeactivate);
      if (result instanceof Promise) {
        result.then((res: boolean) => {
          expect(res).toBe(false);
          expect(window.confirm).toHaveBeenCalled();
          done();
        });
      } else if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: boolean) => {
          expect(res).toBe(false);
          expect(window.confirm).toHaveBeenCalled();
          done();
        });
      } else {
        expect(result).toBe(false);
        expect(window.confirm).toHaveBeenCalled();
        done();
      }
    });
  });
});

describe('ResultsGuard', () => {
  let guard: ResultsGuard;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        ResultsGuard,
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(ResultsGuard);
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('canActivate', () => {
    it('should allow access when game is completed', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.COMPLETED));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should redirect to game when game is in progress', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.IN_PROGRESS));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
        done();
      });
    });

    it('should redirect to start when game is not started', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.NOT_STARTED));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
        done();
      });
    });

    it('should redirect to start when game has error', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.ERROR));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
        done();
      });
    });
  });
});

describe('StartGuard', () => {
  let guard: StartGuard;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        StartGuard,
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(StartGuard);
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('canActivate', () => {
    it('should allow access when game is not started', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.NOT_STARTED));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should allow access when game has error', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.ERROR));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(true);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      });
    });

    it('should redirect to game when game is in progress', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.IN_PROGRESS));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
        done();
      });
    });

    it('should redirect to results when game is completed', (done) => {
      mockStore.select.and.returnValue(of(GameStatus.COMPLETED));

      guard.canActivate().subscribe(result => {
        expect(result).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/results']);
        done();
      });
    });
  });
});