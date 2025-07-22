import { Photo, PhotoMetadata, validatePhotoMetadata } from './photo.model';

describe('Photo Model', () => {
  let validPhoto: Photo;
  let validMetadata: PhotoMetadata;

  beforeEach(() => {
    validMetadata = {
      photographer: 'John Doe',
      license: 'CC BY-SA 4.0',
      originalSource: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
      dateCreated: new Date('2020-01-01')
    };

    validPhoto = {
      id: 'photo-123',
      url: 'https://example.com/photo.jpg',
      title: 'Historic Building',
      description: 'A beautiful historic building from 1920',
      year: 1920,
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      source: 'Wikimedia Commons',
      metadata: validMetadata
    };
  });

  describe('validatePhotoMetadata', () => {
    it('should return true for valid photo metadata', () => {
      expect(validatePhotoMetadata(validPhoto)).toBe(true);
    });

    it('should return true for valid photo without optional fields', () => {
      const photoWithoutOptionals: Photo = {
        ...validPhoto,
        description: undefined,
        metadata: {
          ...validMetadata,
          photographer: undefined
        }
      };

      expect(validatePhotoMetadata(photoWithoutOptionals)).toBe(true);
    });

    it('should return false for null or undefined input', () => {
      expect(validatePhotoMetadata(null as any)).toBe(false);
      expect(validatePhotoMetadata(undefined as any)).toBe(false);
    });

    it('should return false for non-object input', () => {
      const invalidInputs = ['string', 123, true, []];
      
      invalidInputs.forEach(input => {
        expect(validatePhotoMetadata(input as any)).toBe(false);
      });
    });

    describe('required string field validation', () => {
      it('should return false for missing or invalid id', () => {
        const invalidIds = [undefined, null, '', '   ', 123, true];
        
        invalidIds.forEach(id => {
          const photo = { ...validPhoto, id };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return false for missing or invalid url', () => {
        const invalidUrls = [undefined, null, '', '   ', 123, true];
        
        invalidUrls.forEach(url => {
          const photo = { ...validPhoto, url };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return false for missing or invalid title', () => {
        const invalidTitles = [undefined, null, '', '   ', 123, true];
        
        invalidTitles.forEach(title => {
          const photo = { ...validPhoto, title };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return false for missing or invalid source', () => {
        const invalidSources = [undefined, null, '', '   ', 123, true];
        
        invalidSources.forEach(source => {
          const photo = { ...validPhoto, source };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });
    });

    describe('year validation', () => {
      it('should return false for years before 1900', () => {
        const invalidYears = [1899, 1800, 1000, 0];
        
        invalidYears.forEach(year => {
          const photo = { ...validPhoto, year };
          expect(validatePhotoMetadata(photo)).toBe(false);
        });
      });

      it('should return false for future years', () => {
        const futureYear = new Date().getFullYear() + 1;
        const photo = { ...validPhoto, year: futureYear };
        expect(validatePhotoMetadata(photo)).toBe(false);
      });

      it('should return false for non-numeric years', () => {
        const invalidYears = ['1920', null, undefined, true, {}];
        
        invalidYears.forEach(year => {
          const photo = { ...validPhoto, year };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return true for valid years', () => {
        const currentYear = new Date().getFullYear();
        const validYears = [1900, 1950, 2000, currentYear];
        
        validYears.forEach(year => {
          const photo = { ...validPhoto, year };
          expect(validatePhotoMetadata(photo)).toBe(true);
        });
      });
    });

    describe('coordinates validation', () => {
      it('should return false for invalid coordinates', () => {
        const invalidCoordinates = [
          null,
          undefined,
          { latitude: 91, longitude: 0 },
          { latitude: 0, longitude: 181 },
          { latitude: 'invalid', longitude: 0 },
          {}
        ];
        
        invalidCoordinates.forEach(coordinates => {
          const photo = { ...validPhoto, coordinates };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });
    });

    describe('metadata validation', () => {
      it('should return false for missing metadata', () => {
        const photo = { ...validPhoto, metadata: undefined };
        expect(validatePhotoMetadata(photo as any)).toBe(false);
      });

      it('should return false for non-object metadata', () => {
        const invalidMetadata = ['string', 123, true, null];
        
        invalidMetadata.forEach(metadata => {
          const photo = { ...validPhoto, metadata };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return false for missing required metadata fields', () => {
        const requiredFields = ['license', 'originalSource', 'dateCreated'];
        
        requiredFields.forEach(field => {
          const metadata = { ...validMetadata };
          delete (metadata as any)[field];
          const photo = { ...validPhoto, metadata };
          expect(validatePhotoMetadata(photo)).toBe(false);
        });
      });

      it('should return false for invalid license type', () => {
        const invalidLicenses = [null, undefined, 123, true, {}];
        
        invalidLicenses.forEach(license => {
          const metadata = { ...validMetadata, license };
          const photo = { ...validPhoto, metadata };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return false for invalid originalSource type', () => {
        const invalidSources = [null, undefined, 123, true, {}];
        
        invalidSources.forEach(originalSource => {
          const metadata = { ...validMetadata, originalSource };
          const photo = { ...validPhoto, metadata };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return false for invalid dateCreated', () => {
        const invalidDates = [null, undefined, 'string', 123, true, {}];
        
        invalidDates.forEach(dateCreated => {
          const metadata = { ...validMetadata, dateCreated };
          const photo = { ...validPhoto, metadata };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });
    });

    describe('optional field validation', () => {
      it('should return false for invalid description type', () => {
        const invalidDescriptions = [123, true, {}, []];
        
        invalidDescriptions.forEach(description => {
          const photo = { ...validPhoto, description };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });

      it('should return false for invalid photographer type', () => {
        const invalidPhotographers = [123, true, {}, []];
        
        invalidPhotographers.forEach(photographer => {
          const metadata = { ...validMetadata, photographer };
          const photo = { ...validPhoto, metadata };
          expect(validatePhotoMetadata(photo as any)).toBe(false);
        });
      });
    });
  });
});