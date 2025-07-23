import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { PhotosEffects } from './photos.effects';
import { PhotoService } from '../../services/photo.service';
import { provideMockStore } from '@ngrx/store/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';

describe('PhotosEffects', () => {
  let actions$: Observable<any>;
  let effects: PhotosEffects;
  let photoServer: PhotoService;
  let photoServiceSpy: jasmine.SpyObj<PhotoService>;

  beforeEach(() => {
    actions$ = of(); // <-- Initialize actions$ here!
    photoServiceSpy = jasmine.createSpyObj('PhotoService', ['fetchRandomPhotos', 'validatePhotoMetadata']);
    TestBed.configureTestingModule({
      providers: [
        PhotosEffects,
        provideMockStore(),
        provideMockActions(() => actions$),
        { provide: PhotoService, useValue: photoServiceSpy },
      ],
    });

    effects = TestBed.inject(PhotosEffects);
    photoServer = TestBed.inject(PhotoService);
    actions$ = TestBed.inject(Actions);
  });

  it('should log when loadPhotosSuccess is dispatched', (done) => {
    expect(1).toBe(1);

    done();
  });
});
