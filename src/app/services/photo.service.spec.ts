import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PhotoService } from './photo.service';
import { Photo } from '../models/photo.model';
import { FormatValidationService, FormatValidationResult } from './format-validation.service';

describe('PhotoService', () => {
  let service: PhotoService;
  let httpMock: HttpTestingController;
  let formatValidationService: jasmine.SpyObj<FormatValidationService>;
  const API_BASE_URL = 'https://commons.wikimedia.org/w/api.php';

  beforeEach(() => {
    const formatValidationSpy = jasmine.createSpyObj('FormatValidationService', ['validateImageFormat', 'isFormatSupported', 'getSupportedFormats']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PhotoService,
        { provide: FormatValidationService, useValue: formatValidationSpy }
      ]
    });
    service = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
    formatValidationService = TestBed.inject(FormatValidationService) as jasmine.SpyObj<FormatValidationService>;
    
    // Set up default behavior for format validation methods
    formatValidationService.isFormatSupported.and.returnValue(true);
    formatValidationService.getSupportedFormats.and.returnValue(['jpeg', 'png', 'webp']);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('fetchRandomPhotos', () => {
    it('should fetch and process photos successfully', () => {
      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

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
    it('should process valid photo data correctly with format validation', async () => {
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
            ImageDescription: { value: 'A historical photograph' },
            MimeType: { value: 'image/jpeg' }
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        detectedMimeType: 'image/jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);

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
      expect(result!.metadata.format).toBe('jpeg');
      expect(result!.metadata.mimeType).toBe('image/jpeg');

      expect(formatValidationService.validateImageFormat).toHaveBeenCalledWith(
        'https://example.com/test.jpg',
        'image/jpeg',
        { extmetadata: rawData.imageinfo[0].extmetadata }
      );
    });

    it('should return null for invalid year', async () => {
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

      const result = await service.processPhotoData(rawData);
      expect(result).toBeNull();
      expect(formatValidationService.validateImageFormat).not.toHaveBeenCalled();
    });

    it('should return null when format validation fails', async () => {
      const rawData = {
        title: 'File:Unsupported_Format.tiff',
        imageinfo: [{
          url: 'https://example.com/test.tiff',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' },
            MimeType: { value: 'image/tiff' }
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: false,
        detectedFormat: 'tiff',
        detectedMimeType: 'image/tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);
      expect(result).toBeNull();

      expect(formatValidationService.validateImageFormat).toHaveBeenCalledWith(
        'https://example.com/test.tiff',
        'image/tiff',
        { extmetadata: rawData.imageinfo[0].extmetadata }
      );
    });

    it('should return null when format validation throws error', async () => {
      const rawData = {
        title: 'File:Error_Photo.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' }
          }
        }]
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.reject(new Error('Network error')));

      const result = await service.processPhotoData(rawData);
      expect(result).toBeNull();
    });

    it('should handle missing MIME type in metadata', async () => {
      const rawData = {
        title: 'File:No_MimeType.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' }
            // No MimeType field
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);
      expect(result).toBeTruthy();

      expect(formatValidationService.validateImageFormat).toHaveBeenCalledWith(
        'https://example.com/test.jpg',
        undefined,
        { extmetadata: rawData.imageinfo[0].extmetadata }
      );
    });

    it('should return null for missing coordinates', async () => {
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

      const result = await service.processPhotoData(rawData);
      expect(result).toBeNull();
      expect(formatValidationService.validateImageFormat).not.toHaveBeenCalled();
    });

    it('should handle DMS coordinate format', async () => {
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

      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);

      expect(result).toBeTruthy();
      // 40°42'46"N = 40 + 42/60 + 46/3600 = 40.71278
      // 74°0'21"W = -(74 + 0/60 + 21/3600) = -74.00583
      expect(result!.coordinates.latitude).toBeCloseTo(40.71278, 4);
      expect(result!.coordinates.longitude).toBeCloseTo(-74.00583, 4);
    });

    it('should handle missing imageinfo', async () => {
      const rawData = {
        title: 'File:No_ImageInfo.jpg'
        // Missing imageinfo
      };

      const result = await service.processPhotoData(rawData);
      expect(result).toBeNull();
      expect(formatValidationService.validateImageFormat).not.toHaveBeenCalled();
    });

    it('should handle malformed data gracefully', async () => {
      const rawData = null;

      const result = await service.processPhotoData(rawData);
      expect(result).toBeNull();
      expect(formatValidationService.validateImageFormat).not.toHaveBeenCalled();
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
    it('should parse various date formats correctly', async () => {
      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

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

      for (const testCase of testCases) {
        const result = await service.processPhotoData(testCase.rawData);
        expect(result).toBeTruthy();
        expect(result!.year).toBe(testCase.expectedYear);
      }
    });

    it('should handle coordinate parsing edge cases', async () => {
      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      // Test valid coordinates first
      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));
      
      const validRawData = {
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
      };

      const validResult = await service.processPhotoData(validRawData);
      expect(validResult).toBeTruthy();
      expect(validResult!.coordinates.latitude).toBe(40.7128);
      expect(validResult!.coordinates.longitude).toBe(-74.0060);

      // Reset spy for zero coordinates test
      formatValidationService.validateImageFormat.calls.reset();

      // Test zero coordinates - should be filtered out before format validation
      const zeroRawData = {
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
      };

      const zeroResult = await service.processPhotoData(zeroRawData);
      expect(zeroResult).toBeNull();
      expect(formatValidationService.validateImageFormat).not.toHaveBeenCalled();
    });

    it('should extract license information correctly', async () => {
      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

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

      for (const testCase of testCases) {
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

        const result = await service.processPhotoData(rawData);
        expect(result).toBeTruthy();
        expect(result!.metadata.license).toBe(testCase.expected);
      }
    });
  });

  describe('format validation integration', () => {
    it('should log format validation decisions for successful validation', async () => {
      spyOn(console, 'log');

      const rawData = {
        title: 'File:Valid_Format.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' },
            MimeType: { value: 'image/jpeg' }
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        detectedMimeType: 'image/jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);

      expect(result).toBeTruthy();
      expect(console.log).toHaveBeenCalledWith('Photo format validation successful', {
        url: 'https://example.com/test.jpg',
        detectedFormat: 'jpeg',
        detectedMimeType: 'image/jpeg',
        detectionMethod: 'mime-type',
        confidence: 0.9
      });
    });

    it('should log format validation decisions for rejected photos', async () => {
      spyOn(console, 'log');

      const rawData = {
        title: 'File:Rejected_Format.tiff',
        imageinfo: [{
          url: 'https://example.com/test.tiff',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' },
            MimeType: { value: 'image/tiff' }
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: false,
        detectedFormat: 'tiff',
        detectedMimeType: 'image/tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);

      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('Photo rejected due to format validation: Limited browser support', {
        url: 'https://example.com/test.tiff',
        detectedFormat: 'tiff',
        detectedMimeType: 'image/tiff',
        detectionMethod: 'mime-type',
        confidence: 0.9
      });
    });

    it('should call format validation with correct parameters', async () => {
      const rawData = {
        title: 'File:Test_Photo.png',
        imageinfo: [{
          url: 'https://example.com/test.png',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' },
            MimeType: { value: 'image/png' }
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'png',
        detectedMimeType: 'image/png',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      await service.processPhotoData(rawData);

      expect(formatValidationService.validateImageFormat).toHaveBeenCalledWith(
        'https://example.com/test.png',
        'image/png',
        { extmetadata: rawData.imageinfo[0].extmetadata }
      );
    });

    it('should handle format validation service errors gracefully', async () => {
      spyOn(console, 'error');

      const rawData = {
        title: 'File:Error_Photo.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' }
          }
        }]
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.reject(new Error('Validation service error')));

      const result = await service.processPhotoData(rawData);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error processing photo data:', jasmine.any(Error));
    });

    it('should include format metadata in successful photo objects', async () => {
      const rawData = {
        title: 'File:WebP_Photo.webp',
        imageinfo: [{
          url: 'https://example.com/test.webp',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' },
            MimeType: { value: 'image/webp' }
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'webp',
        detectedMimeType: 'image/webp',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);

      expect(result).toBeTruthy();
      expect(result!.metadata.format).toBe('webp');
      expect(result!.metadata.mimeType).toBe('image/webp');
    });

    it('should handle undefined format and mimeType in validation result', async () => {
      const rawData = {
        title: 'File:Unknown_Format.jpg',
        imageinfo: [{
          url: 'https://example.com/test.jpg',
          extmetadata: {
            DateTimeOriginal: { value: '1950:01:01 00:00:00' },
            GPSLatitude: { value: '40.7128' },
            GPSLongitude: { value: '-74.0060' },
            LicenseShortName: { value: 'Public Domain' }
          }
        }]
      };

      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        confidence: 0.5,
        detectionMethod: 'fallback'
        // No detectedFormat or detectedMimeType
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

      const result = await service.processPhotoData(rawData);

      expect(result).toBeTruthy();
      expect(result!.metadata.format).toBeUndefined();
      expect(result!.metadata.mimeType).toBeUndefined();
    });
  });

  describe('filtering logic', () => {
    it('should filter out photos with invalid years through fetchRandomPhotos', () => {
      const mockFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.7,
        detectionMethod: 'url-extension'
      };

      formatValidationService.validateImageFormat.and.returnValue(Promise.resolve(mockFormatValidation));

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

    it('should filter out photos with invalid formats through fetchRandomPhotos', () => {
      const mockValidFormatValidation: FormatValidationResult = {
        isValid: true,
        detectedFormat: 'jpeg',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      const mockInvalidFormatValidation: FormatValidationResult = {
        isValid: false,
        detectedFormat: 'tiff',
        rejectionReason: 'Limited browser support',
        confidence: 0.9,
        detectionMethod: 'mime-type'
      };

      // Set up different responses for different calls
      formatValidationService.validateImageFormat.and.callFake((url: string) => {
        if (url.includes('tiff')) {
          return Promise.resolve(mockInvalidFormatValidation);
        }
        return Promise.resolve(mockValidFormatValidation);
      });

      const mockGeosearchResponse = {
        query: {
          geosearch: [
            { title: 'File:Unsupported_Photo.tiff', pageid: 1, lat: 40.7128, lon: -74.0060, dist: 100 },
            { title: 'File:Valid_Photo.jpg', pageid: 2, lat: 51.5074, lon: -0.1278, dist: 200 }
          ]
        }
      };

      const mockImageInfoResponse = {
        query: {
          pages: {
            '1': {
              title: 'File:Unsupported_Photo.tiff',
              imageinfo: [{
                url: 'https://example.com/unsupported.tiff',
                extmetadata: {
                  DateTimeOriginal: { value: '1950:01:01 00:00:00' },
                  GPSLatitude: { value: '40.7128' },
                  GPSLongitude: { value: '-74.0060' },
                  LicenseShortName: { value: 'Public Domain' },
                  MimeType: { value: 'image/tiff' }
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
                  LicenseShortName: { value: 'Public Domain' },
                  MimeType: { value: 'image/jpeg' }
                }
              }]
            }
          }
        }
      };

      service.fetchRandomPhotos(2).subscribe(photos => {
        expect(photos.length).toBe(1); // Only valid format photo should remain
        expect(photos[0].url).toBe('https://example.com/valid.jpg');
        expect(photos[0].metadata.format).toBe('jpeg');
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

  describe('filterValidPhotos - enhanced format validation', () => {
    let formatValidationServiceSpy: jasmine.SpyObj<FormatValidationService>;

    beforeEach(() => {
      formatValidationServiceSpy = jasmine.createSpyObj('FormatValidationService', ['isFormatSupported', 'getSupportedFormats']);
      // Replace the service instance with our spy
      (service as any).formatValidationService = formatValidationServiceSpy;
    });

    it('should filter out photos without format metadata', () => {
      spyOn(console, 'log');
      
      const photosWithoutFormat: Photo[] = [
        {
          id: 'photo-without-format',
          url: 'https://example.com/photo1.jpg',
          title: 'Photo Without Format',
          year: 1950,
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY 4.0',
            originalSource: 'https://example.com/photo1.jpg',
            dateCreated: new Date(1950, 0, 1)
            // No format field
          }
        }
      ];

      formatValidationServiceSpy.getSupportedFormats.and.returnValue(['jpeg', 'png', 'webp']);

      const result = (service as any).filterValidPhotos(photosWithoutFormat);

      expect(result.length).toBe(0);
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to format validation failure', {
        url: 'https://example.com/photo1.jpg',
        detectedFormat: undefined,
        supportedFormats: ['jpeg', 'png', 'webp'],
        rejectionReason: 'No format detected during processing'
      });
    });

    it('should filter out photos with unsupported formats', () => {
      spyOn(console, 'log');
      
      const photosWithUnsupportedFormat: Photo[] = [
        {
          id: 'photo-with-tiff',
          url: 'https://example.com/photo.tiff',
          title: 'TIFF Photo',
          year: 1950,
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY 4.0',
            originalSource: 'https://example.com/photo.tiff',
            dateCreated: new Date(1950, 0, 1),
            format: 'tiff',
            mimeType: 'image/tiff'
          }
        }
      ];

      formatValidationServiceSpy.isFormatSupported.and.returnValue(false);
      formatValidationServiceSpy.getSupportedFormats.and.returnValue(['jpeg', 'png', 'webp']);

      const result = (service as any).filterValidPhotos(photosWithUnsupportedFormat);

      expect(result.length).toBe(0);
      expect(formatValidationServiceSpy.isFormatSupported).toHaveBeenCalledWith('tiff');
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to format validation failure', {
        url: 'https://example.com/photo.tiff',
        detectedFormat: 'tiff',
        supportedFormats: ['jpeg', 'png', 'webp'],
        rejectionReason: "Format 'tiff' is not supported"
      });
    });

    it('should keep photos with supported formats', () => {
      spyOn(console, 'log');
      
      const photosWithSupportedFormat: Photo[] = [
        {
          id: 'photo-with-jpeg',
          url: 'https://example.com/photo.jpg',
          title: 'JPEG Photo',
          year: 1950,
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY 4.0',
            originalSource: 'https://example.com/photo.jpg',
            dateCreated: new Date(1950, 0, 1),
            format: 'jpeg',
            mimeType: 'image/jpeg'
          }
        },
        {
          id: 'photo-with-png',
          url: 'https://example.com/photo.png',
          title: 'PNG Photo',
          year: 1960,
          coordinates: { latitude: 51.5074, longitude: -0.1278 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'Public Domain',
            originalSource: 'https://example.com/photo.png',
            dateCreated: new Date(1960, 0, 1),
            format: 'png',
            mimeType: 'image/png'
          }
        }
      ];

      formatValidationServiceSpy.isFormatSupported.and.returnValue(true);

      const result = (service as any).filterValidPhotos(photosWithSupportedFormat);

      expect(result.length).toBe(2);
      expect(formatValidationServiceSpy.isFormatSupported).toHaveBeenCalledWith('jpeg');
      expect(formatValidationServiceSpy.isFormatSupported).toHaveBeenCalledWith('png');
      
      expect(console.log).toHaveBeenCalledWith('Photo passed all filtering criteria', {
        url: 'https://example.com/photo.jpg',
        year: 1950,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        coordinates: { latitude: 40.7128, longitude: -74.0060 }
      });
      
      expect(console.log).toHaveBeenCalledWith('Photo passed all filtering criteria', {
        url: 'https://example.com/photo.png',
        year: 1960,
        format: 'png',
        mimeType: 'image/png',
        coordinates: { latitude: 51.5074, longitude: -0.1278 }
      });
    });

    it('should filter out photos with invalid metadata before checking format', () => {
      spyOn(console, 'log');
      
      const photosWithInvalidMetadata: Photo[] = [
        {
          id: 'photo-invalid-year',
          url: 'https://example.com/photo.jpg',
          title: 'Invalid Year Photo',
          year: 1850, // Before 1900
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY 4.0',
            originalSource: 'https://example.com/photo.jpg',
            dateCreated: new Date(1850, 0, 1),
            format: 'jpeg',
            mimeType: 'image/jpeg'
          }
        }
      ];

      const result = (service as any).filterValidPhotos(photosWithInvalidMetadata);

      expect(result.length).toBe(0);
      expect(formatValidationServiceSpy.isFormatSupported).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to invalid metadata', {
        url: 'https://example.com/photo.jpg',
        year: 1850,
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        hasValidMetadata: false
      });
    });

    it('should filter out photos with zero coordinates before checking format', () => {
      spyOn(console, 'log');
      
      const photosWithZeroCoords: Photo[] = [
        {
          id: 'photo-zero-coords',
          url: 'https://example.com/photo.jpg',
          title: 'Zero Coordinates Photo',
          year: 1950,
          coordinates: { latitude: 0, longitude: 0 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY 4.0',
            originalSource: 'https://example.com/photo.jpg',
            dateCreated: new Date(1950, 0, 1),
            format: 'jpeg',
            mimeType: 'image/jpeg'
          }
        }
      ];

      const result = (service as any).filterValidPhotos(photosWithZeroCoords);

      expect(result.length).toBe(0);
      expect(formatValidationServiceSpy.isFormatSupported).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to invalid metadata', {
        url: 'https://example.com/photo.jpg',
        year: 1950,
        coordinates: { latitude: 0, longitude: 0 },
        hasValidMetadata: false
      });
    });

    it('should handle mixed valid and invalid photos correctly', () => {
      spyOn(console, 'log');
      
      const mixedPhotos: Photo[] = [
        {
          id: 'valid-photo',
          url: 'https://example.com/valid.jpg',
          title: 'Valid Photo',
          year: 1950,
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY 4.0',
            originalSource: 'https://example.com/valid.jpg',
            dateCreated: new Date(1950, 0, 1),
            format: 'jpeg',
            mimeType: 'image/jpeg'
          }
        },
        {
          id: 'invalid-format-photo',
          url: 'https://example.com/invalid.tiff',
          title: 'Invalid Format Photo',
          year: 1960,
          coordinates: { latitude: 51.5074, longitude: -0.1278 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'Public Domain',
            originalSource: 'https://example.com/invalid.tiff',
            dateCreated: new Date(1960, 0, 1),
            format: 'tiff',
            mimeType: 'image/tiff'
          }
        },
        {
          id: 'no-format-photo',
          url: 'https://example.com/noformat.jpg',
          title: 'No Format Photo',
          year: 1970,
          coordinates: { latitude: 48.8566, longitude: 2.3522 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY-SA 4.0',
            originalSource: 'https://example.com/noformat.jpg',
            dateCreated: new Date(1970, 0, 1)
            // No format field
          }
        }
      ];

      formatValidationServiceSpy.isFormatSupported.and.callFake((format: string) => {
        return format === 'jpeg';
      });
      formatValidationServiceSpy.getSupportedFormats.and.returnValue(['jpeg', 'png', 'webp']);

      const result = (service as any).filterValidPhotos(mixedPhotos);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('valid-photo');
      
      expect(formatValidationServiceSpy.isFormatSupported).toHaveBeenCalledWith('jpeg');
      expect(formatValidationServiceSpy.isFormatSupported).toHaveBeenCalledWith('tiff');
      
      expect(console.log).toHaveBeenCalledWith('Photo passed all filtering criteria', jasmine.objectContaining({
        url: 'https://example.com/valid.jpg'
      }));
      
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to format validation failure', jasmine.objectContaining({
        url: 'https://example.com/invalid.tiff',
        rejectionReason: "Format 'tiff' is not supported"
      }));
      
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to format validation failure', jasmine.objectContaining({
        url: 'https://example.com/noformat.jpg',
        rejectionReason: 'No format detected during processing'
      }));
    });

    it('should integrate format validation with existing metadata validation', () => {
      spyOn(console, 'log');
      
      const photosWithComplexValidation: Photo[] = [
        {
          id: 'photo-invalid-year-but-valid-format',
          url: 'https://example.com/photo1.jpg',
          title: 'Invalid Year but Valid Format',
          year: 1850, // Invalid year
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY 4.0',
            originalSource: 'https://example.com/photo1.jpg',
            dateCreated: new Date(1850, 0, 1),
            format: 'jpeg', // Valid format
            mimeType: 'image/jpeg'
          }
        },
        {
          id: 'photo-valid-year-but-invalid-format',
          url: 'https://example.com/photo2.tiff',
          title: 'Valid Year but Invalid Format',
          year: 1950, // Valid year
          coordinates: { latitude: 51.5074, longitude: -0.1278 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'Public Domain',
            originalSource: 'https://example.com/photo2.tiff',
            dateCreated: new Date(1950, 0, 1),
            format: 'tiff', // Invalid format
            mimeType: 'image/tiff'
          }
        }
      ];

      formatValidationServiceSpy.isFormatSupported.and.callFake((format: string) => {
        return format === 'jpeg';
      });
      formatValidationServiceSpy.getSupportedFormats.and.returnValue(['jpeg', 'png', 'webp']);

      const result = (service as any).filterValidPhotos(photosWithComplexValidation);

      expect(result.length).toBe(0);
      
      // First photo should be filtered out due to invalid metadata (year), format validation should not be called
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to invalid metadata', jasmine.objectContaining({
        url: 'https://example.com/photo1.jpg',
        year: 1850
      }));
      
      // Second photo should pass metadata validation but fail format validation
      expect(console.log).toHaveBeenCalledWith('Photo filtered out due to format validation failure', jasmine.objectContaining({
        url: 'https://example.com/photo2.tiff',
        rejectionReason: "Format 'tiff' is not supported"
      }));
      
      expect(formatValidationServiceSpy.isFormatSupported).toHaveBeenCalledWith('tiff');
      expect(formatValidationServiceSpy.isFormatSupported).not.toHaveBeenCalledWith('jpeg');
    });

    it('should log detailed information for successful filtering', () => {
      spyOn(console, 'log');
      
      const validPhoto: Photo[] = [
        {
          id: 'detailed-photo',
          url: 'https://example.com/detailed.webp',
          title: 'Detailed Photo',
          year: 1965,
          coordinates: { latitude: 35.6762, longitude: 139.6503 },
          source: 'Wikimedia Commons',
          metadata: {
            license: 'CC BY-SA 3.0',
            originalSource: 'https://example.com/detailed.webp',
            dateCreated: new Date(1965, 5, 15),
            format: 'webp',
            mimeType: 'image/webp'
          }
        }
      ];

      formatValidationServiceSpy.isFormatSupported.and.returnValue(true);

      const result = (service as any).filterValidPhotos(validPhoto);

      expect(result.length).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Photo passed all filtering criteria', {
        url: 'https://example.com/detailed.webp',
        year: 1965,
        format: 'webp',
        mimeType: 'image/webp',
        coordinates: { latitude: 35.6762, longitude: 139.6503 }
      });
    });

    it('should handle empty photo array', () => {
      const result = (service as any).filterValidPhotos([]);
      
      expect(result.length).toBe(0);
      expect(formatValidationServiceSpy.isFormatSupported).not.toHaveBeenCalled();
    });

    it('should maintain original photo objects for valid photos', () => {
      const originalPhoto: Photo = {
        id: 'original-photo',
        url: 'https://example.com/original.png',
        title: 'Original Photo',
        description: 'A test photo',
        year: 1955,
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        source: 'Wikimedia Commons',
        metadata: {
          photographer: 'Test Photographer',
          license: 'CC BY 4.0',
          originalSource: 'https://example.com/original.png',
          dateCreated: new Date(1955, 0, 1),
          format: 'png',
          mimeType: 'image/png'
        }
      };

      formatValidationServiceSpy.isFormatSupported.and.returnValue(true);

      const result = (service as any).filterValidPhotos([originalPhoto]);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(originalPhoto); // Should be the same object reference
      expect(result[0].description).toBe('A test photo');
      expect(result[0].metadata.photographer).toBe('Test Photographer');
    });
  });
});