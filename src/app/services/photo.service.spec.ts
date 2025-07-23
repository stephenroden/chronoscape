import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PhotoService } from './photo.service';
import { Photo } from '../models/photo.model';

describe('PhotoService', () => {
  let service: PhotoService;
  let httpMock: HttpTestingController;
  const API_BASE_URL = 'https://commons.wikimedia.org/w/api.php';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PhotoService]
    });
    service = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('fetchRandomPhotos', () => {
    it('should fetch and process photos successfully', () => {
      const mockGeosearchResponse = {
        query: {
          geosearch: [
            { title: 'File:Historical_Photo_1.jpg', pageid: 1, lat: 40.7128, lon: -74.0060, dist: 100 },
            { title: 'File:Historical_Photo_2.jpg', pageid: 2, lat: 51.5074, lon: -0.1278, dist: 200 }
          ]
        }
      };

      const mockImageInfoResponse = {
        query: {
          pages: {
            '1': {
              title: 'File:Historical_Photo_1.jpg',
              imageinfo: [{
                url: 'https://example.com/photo1.jpg',
                extmetadata: {
                  DateTimeOriginal: { value: '1950:01:01 00:00:00' },
                  GPSLatitude: { value: '40.7128' },
                  GPSLongitude: { value: '-74.0060' },
                  Artist: { value: 'Test Photographer' },
                  LicenseShortName: { value: 'CC BY-SA 4.0' }
                }
              }]
            },
            '2': {
              title: 'File:Historical_Photo_2.jpg',
              imageinfo: [{
                url: 'https://example.com/photo2.jpg',
                extmetadata: {
                  DateTime: { value: '1960-05-15' },
                  GPSLatitude: { value: '51.5074' },
                  GPSLongitude: { value: '-0.1278' },
                  LicenseShortName: { value: 'Public Domain' }
                }
              }]
            }
          }
        }
      };

      service.fetchRandomPhotos(2).subscribe(photos => {
        expect(photos.length).toBe(2);
        expect(photos[0].year).toBe(1950);
        expect(photos[0].coordinates.latitude).toBe(40.7128);
        expect(photos[0].coordinates.longitude).toBe(-74.0060);
        expect(photos[1].year).toBe(1960);
      });

      // Handle geosearch requests (there will be 2 for 2 locations)
      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('action') === 'query' && req.params.get('list') === 'geosearch'
      );
      expect(geosearchReqs.length).toBe(2);
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      // Handle image info request
      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('action') === 'query' && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);
    });

    it('should handle empty search results', () => {
      const mockEmptyResponse = { query: { geosearch: [] } };

      service.fetchRandomPhotos(5).subscribe(photos => {
        expect(photos.length).toBe(0);
      });

      // Handle all geosearch requests (there will be 5 for 5 locations)
      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      expect(geosearchReqs.length).toBe(5);
      geosearchReqs.forEach(req => {
        if (!req.cancelled) {
          req.flush(mockEmptyResponse);
        }
      });
    });

    it('should handle API errors gracefully', () => {
      service.fetchRandomPhotos(2).subscribe(photos => {
        expect(photos.length).toBe(0);
      });

      // Handle geosearch requests (there will be 2 for 2 locations)
      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('list') === 'geosearch'
      );
      expect(geosearchReqs.length).toBe(2);
      geosearchReqs.forEach(req => req.error(new ErrorEvent('Network error')));
    });
  });

  describe('processPhotoData', () => {
    it('should process valid photo data correctly', () => {
      const rawData = {
        title: 'File:Test_Photo.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1945:06:15 12:00:00' },
            GPSLatitude: { value: '48.8566' },
            GPSLongitude: { value: '2.3522' },
            Artist: { value: 'John Doe' },
            LicenseShortName: { value: 'CC BY 4.0' },
            ImageDescription: { value: 'A historical photograph' }
          }
        }]
      };

      const result = service.processPhotoData(rawData);

      expect(result).toBeTruthy();
      expect(result!.id).toBe('Test_Photo.jpg');
      expect(result!.url).toBe('https://example.com/test.jpg');
      expect(result!.title).toBe('Test_Photo');
      expect(result!.year).toBe(1945);
      expect(result!.coordinates.latitude).toBe(48.8566);
      expect(result!.coordinates.longitude).toBe(2.3522);
      expect(result!.metadata.photographer).toBe('John Doe');
      expect(result!.metadata.license).toBe('CC BY 4.0');
      expect(result!.description).toBe('A historical photograph');
    });

    it('should return null for invalid year', () => {
      const rawData = {
        title: 'File:Invalid_Year.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1850:01:01 00:00:00' }, // Before 1900
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' }
          }
        }]
      };

      const result = service.processPhotoData(rawData);
      expect(result).toBeNull();
    });

    it('should return null for missing coordinates', () => {
      const rawData = {
        title: 'File:No_Coords.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' }
            // Missing GPS coordinates
          }
        }]
      };

      const result = service.processPhotoData(rawData);
      expect(result).toBeNull();
    });

    it('should handle DMS coordinate format', () => {
      const rawData = {
        title: 'File:DMS_Coords.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1955:03:20 15:30:00' },
            GPSLatitude: { value: '40°42\'46"N' },
            GPSLongitude: { value: '74°0\'21"W' },
            LicenseShortName: { value: 'Public Domain' }
          }
        }]
      };

      const result = service.processPhotoData(rawData);

      expect(result).toBeTruthy();
      // 40°42'46"N = 40 + 42/60 + 46/3600 = 40.71278
      // 74°0'21"W = -(74 + 0/60 + 21/3600) = -74.00583
      expect(result!.coordinates.latitude).toBeCloseTo(40.71278, 4);
      expect(result!.coordinates.longitude).toBeCloseTo(-74.00583, 4);
    });

    it('should handle missing imageinfo', () => {
      const rawData = {
        title: 'File:No_ImageInfo.jpg'
        // Missing imageinfo
      };

      const result = service.processPhotoData(rawData);
      expect(result).toBeNull();
    });

    it('should handle malformed data gracefully', () => {
      const rawData = null;

      const result = service.processPhotoData(rawData);
      expect(result).toBeNull();
    });
  });

  describe('validatePhotoMetadata', () => {
    it('should validate correct photo metadata', () => {
      const validPhoto: Photo = {
        id: 'test-photo',
        url: 'https://example.com/photo.jpg',
        title: 'Test Photo',
        description: 'A test photograph',
        year: 1950,
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        source: 'Wikimedia Commons',
        metadata: {
          photographer: 'Test Photographer',
          license: 'CC BY 4.0',
          originalSource: 'https://example.com/photo.jpg',
          dateCreated: new Date(1950, 0, 1)
        }
      };

      expect(service.validatePhotoMetadata(validPhoto)).toBe(true);
    });

    it('should reject photo with invalid year', () => {
      const invalidPhoto: Photo = {
        id: 'test-photo',
        url: 'https://example.com/photo.jpg',
        title: 'Test Photo',
        year: 1850, // Before 1900
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        source: 'Wikimedia Commons',
        metadata: {
          license: 'CC BY 4.0',
          originalSource: 'https://example.com/photo.jpg',
          dateCreated: new Date(1850, 0, 1)
        }
      };

      expect(service.validatePhotoMetadata(invalidPhoto)).toBe(false);
    });

    it('should reject photo with invalid coordinates', () => {
      const invalidPhoto: Photo = {
        id: 'test-photo',
        url: 'https://example.com/photo.jpg',
        title: 'Test Photo',
        year: 1950,
        coordinates: { latitude: 91, longitude: -74.0060 }, // Invalid latitude
        source: 'Wikimedia Commons',
        metadata: {
          license: 'CC BY 4.0',
          originalSource: 'https://example.com/photo.jpg',
          dateCreated: new Date(1950, 0, 1)
        }
      };

      expect(service.validatePhotoMetadata(invalidPhoto)).toBe(false);
    });
  });

  describe('private method testing through public interface', () => {
    it('should parse various date formats correctly', () => {
      const testCases = [
        {
          rawData: {
            title: 'File:Date_Format_1.jpg',
            imageinfo: [{
              url: 'https://example.com/test.jpg',
              extmetadata: {
                DateTimeOriginal: { value: '1945-06-15 12:00:00' },
                GPSLatitude: { value: '40.7128' },
                GPSLongitude: { value: '-74.0060' },
                LicenseShortName: { value: 'Public Domain' }
              }
            }]
          },
          expectedYear: 1945
        },
        {
          rawData: {
            title: 'File:Date_Format_2.jpg',
            imageinfo: [{
              url: 'https://example.com/test.jpg',
              extmetadata: {
                DateTime: { value: '1960:03:20 15:30:00' },
                GPSLatitude: { value: '40.7128' },
                GPSLongitude: { value: '-74.0060' },
                LicenseShortName: { value: 'Public Domain' }
              }
            }]
          },
          expectedYear: 1960
        }
      ];

      testCases.forEach(testCase => {
        const result = service.processPhotoData(testCase.rawData);
        expect(result).toBeTruthy();
        expect(result!.year).toBe(testCase.expectedYear);
      });
    });

    it('should handle coordinate parsing edge cases', () => {
      const testCases: Array<{
        rawData: any;
        expectedLat?: number;
        expectedLon?: number;
        shouldBeNull?: boolean;
      }> = [
        {
          rawData: {
            title: 'File:Numeric_Coords.jpg',
            imageinfo: [{
              url: 'https://example.com/test.jpg',
              extmetadata: {
                DateTimeOriginal: { value: '1950:01:01 00:00:00' },
                GPSLatitude: { value: '40.7128' },
                GPSLongitude: { value: '-74.0060' },
                LicenseShortName: { value: 'Public Domain' }
              }
            }]
          },
          expectedLat: 40.7128,
          expectedLon: -74.0060
        },
        {
          rawData: {
            title: 'File:Zero_Coords.jpg',
            imageinfo: [{
              url: 'https://example.com/test.jpg',
              extmetadata: {
                DateTimeOriginal: { value: '1950:01:01 00:00:00' },
                GPSLatitude: { value: '0' },
                GPSLongitude: { value: '0' },
                LicenseShortName: { value: 'Public Domain' }
              }
            }]
          },
          shouldBeNull: true // Zero coordinates should be filtered out
        }
      ];

      testCases.forEach(testCase => {
        const result = service.processPhotoData(testCase.rawData);
        if (testCase.shouldBeNull) {
          expect(result).toBeNull();
        } else {
          expect(result).toBeTruthy();
          expect(result!.coordinates.latitude).toBe(testCase.expectedLat!);
          expect(result!.coordinates.longitude).toBe(testCase.expectedLon!);
        }
      });
    });

    it('should extract license information correctly', () => {
      const testCases = [
        {
          extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' } },
          expected: 'CC BY-SA 4.0'
        },
        {
          extmetadata: { UsageTerms: { value: 'Public Domain' } },
          expected: 'Public Domain'
        },
        {
          extmetadata: {},
          expected: 'Unknown License'
        }
      ];

      testCases.forEach(testCase => {
        const rawData = {
          title: 'File:License_Test.jpg',
          imageinfo: [{
            url: 'https://example.com/test.jpg',
            extmetadata: {
              ...testCase.extmetadata,
              DateTimeOriginal: { value: '1950:01:01 00:00:00' },
              GPSLatitude: { value: '40.7128' },
              GPSLongitude: { value: '-74.0060' }
            }
          }]
        };

        const result = service.processPhotoData(rawData);
        expect(result).toBeTruthy();
        expect(result!.metadata.license).toBe(testCase.expected);
      });
    });
  });

  describe('filtering logic', () => {
    it('should filter out photos with invalid years through fetchRandomPhotos', () => {
      const mockGeosearchResponse = {
        query: {
          geosearch: [
            { title: 'File:Old_Photo.jpg', pageid: 1, lat: 40.7128, lon: -74.0060, dist: 100 },
            { title: 'File:Valid_Photo.jpg', pageid: 2, lat: 51.5074, lon: -0.1278, dist: 200 }
          ]
        }
      };

      const mockImageInfoResponse = {
        query: {
          pages: {
            '1': {
              title: 'File:Old_Photo.jpg',
              imageinfo: [{
                url: 'https://example.com/old.jpg',
                extmetadata: {
                  DateTimeOriginal: { value: '1850:01:01 00:00:00' }, // Too old
                  GPSLatitude: { value: '40.7128' },
                  GPSLongitude: { value: '-74.0060' },
                  LicenseShortName: { value: 'Public Domain' }
                }
              }]
            },
            '2': {
              title: 'File:Valid_Photo.jpg',
              imageinfo: [{
                url: 'https://example.com/valid.jpg',
                extmetadata: {
                  DateTimeOriginal: { value: '1950:01:01 00:00:00' },
                  GPSLatitude: { value: '51.5074' },
                  GPSLongitude: { value: '-0.1278' },
                  LicenseShortName: { value: 'Public Domain' }
                }
              }]
            }
          }
        }
      };

      service.fetchRandomPhotos(2).subscribe(photos => {
        expect(photos.length).toBe(1); // Only valid photo should remain
        expect(photos[0].year).toBe(1950);
      });

      // Handle geosearch requests (there will be 2 for 2 locations)
      const geosearchReqs = httpMock.match(req => 
        req.url === API_BASE_URL && req.params.get('action') === 'query' && req.params.get('list') === 'geosearch'
      );
      expect(geosearchReqs.length).toBe(2);
      geosearchReqs.forEach(req => req.flush(mockGeosearchResponse));

      // Handle image info request
      const imageInfoReq = httpMock.expectOne(req => 
        req.url === API_BASE_URL && req.params.get('action') === 'query' && req.params.get('prop') === 'imageinfo'
      );
      imageInfoReq.flush(mockImageInfoResponse);
    });
  });
});