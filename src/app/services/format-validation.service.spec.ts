import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormatValidationService } from './format-validation.service';

describe('FormatValidationService - Basic Tests', () => {
  let service: FormatValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormatValidationService]
    });
    service = TestBed.inject(FormatValidationService);
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const supportedFormats = service.getSupportedFormats();
      
      expect(supportedFormats).toContain('jpeg');
      expect(supportedFormats).toContain('png');
      expect(supportedFormats).toContain('webp');
      expect(supportedFormats.length).toBe(3);
    });
  });

  describe('getFormatFromUrl - URL-based format detection', () => {
    describe('Basic format detection', () => {
      it('should detect JPEG format from .jpg extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should detect JPEG format from .jpeg extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpeg');
        expect(format).toBe('jpeg');
      });

      it('should detect PNG format from .png extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png');
        expect(format).toBe('png');
      });

      it('should detect WebP format from .webp extension', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp');
        expect(format).toBe('webp');
      });

      it('should detect rejected formats (TIFF)', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.tiff');
        expect(format).toBe('tiff');
      });

      it('should detect rejected formats (GIF)', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.gif');
        expect(format).toBe('gif');
      });
    });

    describe('Query parameters handling', () => {
      it('should handle URLs with query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg?v=123');
        expect(format).toBe('jpeg');
      });

      it('should handle URLs with multiple query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png?width=800&height=600&format=original');
        expect(format).toBe('png');
      });

      it('should handle URLs with query parameters that contain dots', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp?file=image.backup.jpg');
        expect(format).toBe('webp');
      });

      it('should handle empty query parameters', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg?');
        expect(format).toBe('jpeg');
      });
    });

    describe('URL fragments handling', () => {
      it('should handle URLs with fragments', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.png#section1');
        expect(format).toBe('png');
      });

      it('should handle URLs with both query parameters and fragments', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpeg?v=1#top');
        expect(format).toBe('jpeg');
      });

      it('should handle fragments that contain dots', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.webp#image.details');
        expect(format).toBe('webp');
      });
    });

    describe('Case sensitivity handling', () => {
      it('should handle uppercase extensions', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.JPG');
        expect(format).toBe('jpeg');
      });

      it('should handle mixed case extensions', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.PnG');
        expect(format).toBe('png');
      });

      it('should handle uppercase in path but not affect extension detection', () => {
        const format = service.getFormatFromUrl('https://example.com/PHOTOS/Image.webp');
        expect(format).toBe('webp');
      });
    });

    describe('Complex path handling', () => {
      it('should handle nested directory paths', () => {
        const format = service.getFormatFromUrl('https://example.com/images/gallery/2023/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should handle paths with dots in directory names', () => {
        const format = service.getFormatFromUrl('https://example.com/images/v2.0/gallery/photo.png');
        expect(format).toBe('png');
      });

      it('should handle filenames with multiple dots', () => {
        const format = service.getFormatFromUrl('https://example.com/my.photo.backup.jpeg');
        expect(format).toBe('jpeg');
      });

      it('should handle very long paths', () => {
        const longPath = 'a/'.repeat(50);
        const format = service.getFormatFromUrl(`https://example.com/${longPath}photo.webp`);
        expect(format).toBe('webp');
      });
    });

    describe('Relative URL handling', () => {
      it('should handle relative URLs starting with slash', () => {
        const format = service.getFormatFromUrl('/images/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should handle relative URLs without leading slash', () => {
        const format = service.getFormatFromUrl('images/photo.png');
        expect(format).toBe('png');
      });

      it('should handle relative URLs with query parameters', () => {
        const format = service.getFormatFromUrl('/images/photo.webp?v=1');
        expect(format).toBe('webp');
      });
    });

    describe('Protocol variations', () => {
      it('should handle HTTP URLs', () => {
        const format = service.getFormatFromUrl('http://example.com/photo.jpg');
        expect(format).toBe('jpeg');
      });

      it('should handle protocol-relative URLs', () => {
        const format = service.getFormatFromUrl('//example.com/photo.png');
        expect(format).toBe('png');
      });
    });

    describe('Edge cases and error handling', () => {
      it('should return null for unknown extensions', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.xyz');
        expect(format).toBeNull();
      });

      it('should handle URLs without extensions', () => {
        expect(service.getFormatFromUrl('https://example.com/photo')).toBeNull();
        expect(service.getFormatFromUrl('https://example.com/images/')).toBeNull();
      });

      it('should handle URLs with trailing slashes', () => {
        expect(service.getFormatFromUrl('https://example.com/photo.jpg/')).toBe('jpeg');
      });

      it('should handle malformed URLs gracefully', () => {
        expect(service.getFormatFromUrl('not-a-url')).toBeNull();
        expect(service.getFormatFromUrl('')).toBeNull();
        expect(service.getFormatFromUrl('   ')).toBeNull();
      });

      it('should handle null and undefined inputs', () => {
        expect(service.getFormatFromUrl(null as any)).toBeNull();
        expect(service.getFormatFromUrl(undefined as any)).toBeNull();
      });

      it('should handle non-string inputs', () => {
        expect(service.getFormatFromUrl(123 as any)).toBeNull();
        expect(service.getFormatFromUrl({} as any)).toBeNull();
        expect(service.getFormatFromUrl([] as any)).toBeNull();
      });

      it('should handle URLs with only dots', () => {
        expect(service.getFormatFromUrl('https://example.com/...')).toBeNull();
        expect(service.getFormatFromUrl('https://example.com/.')).toBeNull();
      });

      it('should handle URLs where extension is in directory name', () => {
        expect(service.getFormatFromUrl('https://example.com/folder.jpg/image')).toBeNull();
        expect(service.getFormatFromUrl('https://example.com/photos.png/thumbnail')).toBeNull();
      });

      it('should handle URLs with invalid extension formats', () => {
        expect(service.getFormatFromUrl('https://example.com/photo.')).toBeNull();
        expect(service.getFormatFromUrl('https://example.com/photo.123')).toBeNull();
        expect(service.getFormatFromUrl('https://example.com/photo.j')).toBeNull();
      });

      it('should handle very long extensions', () => {
        const longExt = 'x'.repeat(50);
        expect(service.getFormatFromUrl(`https://example.com/photo.${longExt}`)).toBeNull();
      });

      it('should handle URLs with special characters in filename', () => {
        const format1 = service.getFormatFromUrl('https://example.com/my%20photo.jpg');
        expect(format1).toBe('jpeg');
        
        const format2 = service.getFormatFromUrl('https://example.com/photo-2023.png');
        expect(format2).toBe('png');
        
        const format3 = service.getFormatFromUrl('https://example.com/photo_final.webp');
        expect(format3).toBe('webp');
      });
    });

    describe('Real-world URL patterns', () => {
      it('should handle Wikimedia Commons URLs', () => {
        const format = service.getFormatFromUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Example.jpg/800px-Example.jpg');
        expect(format).toBe('jpeg');
      });

      it('should handle CDN URLs with version parameters', () => {
        const format = service.getFormatFromUrl('https://cdn.example.com/images/photo.png?v=20231201&w=800');
        expect(format).toBe('png');
      });

      it('should handle URLs with authentication tokens', () => {
        const format = service.getFormatFromUrl('https://api.example.com/image.webp?token=abc123&expires=1234567890');
        expect(format).toBe('webp');
      });

      it('should handle URLs with complex query strings', () => {
        const format = service.getFormatFromUrl('https://example.com/photo.jpg?resize=800x600&quality=85&format=auto&optimize=true');
        expect(format).toBe('jpeg');
      });
    });

    describe('Requirements validation', () => {
      // Requirement 3.1: WHEN validating photo format THEN the system SHALL check the file extension from the URL
      it('should validate file extension from URL (Requirement 3.1)', () => {
        expect(service.getFormatFromUrl('https://example.com/image.jpg')).toBe('jpeg');
        expect(service.getFormatFromUrl('https://example.com/image.png')).toBe('png');
        expect(service.getFormatFromUrl('https://example.com/image.webp')).toBe('webp');
        expect(service.getFormatFromUrl('https://example.com/image.tiff')).toBe('tiff');
        expect(service.getFormatFromUrl('https://example.com/image.gif')).toBe('gif');
      });

      // Requirement 3.4: WHEN neither extension nor MIME type indicate a supported format THEN the system SHALL reject the photo
      it('should return null for unsupported extensions (Requirement 3.4)', () => {
        expect(service.getFormatFromUrl('https://example.com/image.xyz')).toBeNull();
        expect(service.getFormatFromUrl('https://example.com/image.unknown')).toBeNull();
        expect(service.getFormatFromUrl('https://example.com/image.doc')).toBeNull();
      });

      // Requirement 6.5: WHEN testing format validation THEN the system SHALL handle photos with malformed URLs
      it('should handle malformed URLs gracefully (Requirement 6.5)', () => {
        expect(service.getFormatFromUrl('invalid-url')).toBeNull();
        expect(service.getFormatFromUrl('http://')).toBeNull();
        expect(service.getFormatFromUrl('https://')).toBeNull();
        expect(service.getFormatFromUrl('ftp://example.com/image.jpg')).toBe('jpeg'); // Should still work for valid URL structure
        expect(service.getFormatFromUrl('')).toBeNull();
        expect(service.getFormatFromUrl('   ')).toBeNull();
      });
    });
  });

  describe('getFormatFromMimeType', () => {
    it('should detect JPEG format from MIME type', () => {
      const format = service.getFormatFromMimeType('image/jpeg');
      expect(format).toBe('jpeg');
    });

    it('should detect PNG format from MIME type', () => {
      const format = service.getFormatFromMimeType('image/png');
      expect(format).toBe('png');
    });

    it('should detect WebP format from MIME type', () => {
      const format = service.getFormatFromMimeType('image/webp');
      expect(format).toBe('webp');
    });

    it('should detect rejected formats from MIME type', () => {
      expect(service.getFormatFromMimeType('image/tiff')).toBe('tiff');
      expect(service.getFormatFromMimeType('image/gif')).toBe('gif');
      expect(service.getFormatFromMimeType('image/svg+xml')).toBe('svg');
      expect(service.getFormatFromMimeType('image/bmp')).toBe('bmp');
    });

    it('should handle case insensitive MIME types', () => {
      expect(service.getFormatFromMimeType('IMAGE/JPEG')).toBe('jpeg');
      expect(service.getFormatFromMimeType('Image/PNG')).toBe('png');
      expect(service.getFormatFromMimeType('image/WebP')).toBe('webp');
    });

    it('should handle MIME types with whitespace', () => {
      expect(service.getFormatFromMimeType('  image/jpeg  ')).toBe('jpeg');
      expect(service.getFormatFromMimeType('\timage/png\n')).toBe('png');
    });

    it('should return null for invalid MIME types', () => {
      expect(service.getFormatFromMimeType('image/unknown')).toBeNull();
      expect(service.getFormatFromMimeType('text/plain')).toBeNull();
      expect(service.getFormatFromMimeType('application/json')).toBeNull();
    });

    it('should return null for empty or null MIME types', () => {
      expect(service.getFormatFromMimeType('')).toBeNull();
      expect(service.getFormatFromMimeType('   ')).toBeNull();
      expect(service.getFormatFromMimeType(null as any)).toBeNull();
      expect(service.getFormatFromMimeType(undefined as any)).toBeNull();
    });

    it('should return null for non-string MIME types', () => {
      expect(service.getFormatFromMimeType(123 as any)).toBeNull();
      expect(service.getFormatFromMimeType({} as any)).toBeNull();
      expect(service.getFormatFromMimeType([] as any)).toBeNull();
    });
  });

  describe('extractMimeTypeFromWikimediaMetadata - MIME type extraction from Wikimedia metadata', () => {
    describe('Valid metadata extraction', () => {
      it('should extract MIME type from valid Wikimedia extmetadata', () => {
        const extmetadata = {
          MimeType: { value: 'image/jpeg' }
        };
        
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
        expect(mimeType).toBe('image/jpeg');
      });

      it('should extract different MIME types correctly', () => {
        const testCases = [
          { metadata: { MimeType: { value: 'image/png' } }, expected: 'image/png' },
          { metadata: { MimeType: { value: 'image/webp' } }, expected: 'image/webp' },
          { metadata: { MimeType: { value: 'image/tiff' } }, expected: 'image/tiff' },
          { metadata: { MimeType: { value: 'image/gif' } }, expected: 'image/gif' }
        ];

        testCases.forEach(testCase => {
          const result = service.extractMimeTypeFromWikimediaMetadata(testCase.metadata);
          expect(result).toBe(testCase.expected);
        });
      });

      it('should handle MIME types with whitespace', () => {
        const extmetadata = {
          MimeType: { value: '  image/jpeg  ' }
        };
        
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
        expect(mimeType).toBe('image/jpeg');
      });

      it('should extract from complex metadata with other fields', () => {
        const extmetadata = {
          DateTime: { value: '2023-01-01' },
          Artist: { value: 'Test Artist' },
          MimeType: { value: 'image/png' },
          License: { value: 'CC BY-SA' }
        };
        
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
        expect(mimeType).toBe('image/png');
      });
    });

    describe('Invalid metadata handling', () => {
      it('should return null for missing MimeType field', () => {
        const extmetadata = {
          DateTime: { value: '2023-01-01' },
          Artist: { value: 'Test Artist' }
        };
        
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
        expect(mimeType).toBeNull();
      });

      it('should return null for MimeType field without value', () => {
        const testCases = [
          { MimeType: {} },
          { MimeType: { value: null } },
          { MimeType: { value: undefined } },
          { MimeType: { value: '' } },
          { MimeType: { value: '   ' } }
        ];

        testCases.forEach(extmetadata => {
          const result = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
          expect(result).toBeNull();
        });
      });

      it('should return null for non-string MIME type values', () => {
        const testCases = [
          { MimeType: { value: 123 } },
          { MimeType: { value: {} } },
          { MimeType: { value: [] } },
          { MimeType: { value: true } }
        ];

        testCases.forEach(extmetadata => {
          const result = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
          expect(result).toBeNull();
        });
      });

      it('should return null for invalid metadata structures', () => {
        const testCases = [
          null,
          undefined,
          '',
          123,
          [],
          'not-an-object',
          { MimeType: 'not-an-object' },
          { MimeType: null }
        ];

        testCases.forEach(extmetadata => {
          const result = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
          expect(result).toBeNull();
        });
      });
    });

    describe('Requirements validation', () => {
      // Requirement 3.2: WHEN validating photo format THEN the system SHALL check the MIME type from metadata if available
      it('should extract MIME type from metadata when available (Requirement 3.2)', () => {
        const extmetadata = {
          MimeType: { value: 'image/jpeg' },
          DateTime: { value: '2023-01-01' }
        };
        
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
        expect(mimeType).toBe('image/jpeg');
      });

      // Requirement 5.3: WHEN logging format decisions THEN the system SHALL include the photo URL and detected format
      it('should handle metadata structure for logging purposes (Requirement 5.3)', () => {
        const extmetadata = {
          MimeType: { value: 'image/png' }
        };
        
        const mimeType = service.extractMimeTypeFromWikimediaMetadata(extmetadata);
        expect(mimeType).toBeTruthy();
        expect(typeof mimeType).toBe('string');
      });
    });
  });

  describe('validateWithWikimediaMetadata - MIME type validation with prioritization', () => {
    describe('MIME type prioritization', () => {
      it('should prioritize MIME type over URL extension when both available', async () => {
        const extmetadata = {
          MimeType: { value: 'image/png' }
        };
        
        // URL suggests JPEG but MIME type says PNG
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
        
        expect(result.isValid).toBe(true);
        expect(result.detectedFormat).toBe('png');
        expect(result.detectedMimeType).toBe('image/png');
        expect(result.detectionMethod).toBe('mime-type');
        expect(result.confidence).toBe(0.9);
      });

      it('should fall back to URL extension when MIME type unavailable', async () => {
        const extmetadata = {
          DateTime: { value: '2023-01-01' }
          // No MimeType field
        };
        
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo.webp', extmetadata);
        
        expect(result.isValid).toBe(true);
        expect(result.detectedFormat).toBe('webp');
        expect(result.detectionMethod).toBe('url-extension');
        expect(result.confidence).toBe(0.7);
      });

      it('should handle conflicting MIME type and URL extension', async () => {
        const consoleSpy = spyOn(console, 'warn');
        
        const extmetadata = {
          MimeType: { value: 'image/png' }
        };
        
        // This should prioritize MIME type but log the conflict
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
        
        expect(result.isValid).toBe(true);
        expect(result.detectedFormat).toBe('png');
        expect(result.detectionMethod).toBe('mime-type');
      });
    });

    describe('Supported format validation', () => {
      it('should validate supported formats via MIME type', async () => {
        const testCases = [
          { mimeType: 'image/jpeg', expectedFormat: 'jpeg' },
          { mimeType: 'image/png', expectedFormat: 'png' },
          { mimeType: 'image/webp', expectedFormat: 'webp' }
        ];

        for (const testCase of testCases) {
          const extmetadata = {
            MimeType: { value: testCase.mimeType }
          };
          
          const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
          
          expect(result.isValid).toBe(true);
          expect(result.detectedFormat).toBe(testCase.expectedFormat);
          expect(result.detectedMimeType).toBe(testCase.mimeType);
          expect(result.detectionMethod).toBe('mime-type');
        }
      });

      it('should reject unsupported formats via MIME type', async () => {
        const testCases = [
          { mimeType: 'image/tiff', expectedFormat: 'tiff', expectedReason: 'Limited browser support' },
          { mimeType: 'image/gif', expectedFormat: 'gif', expectedReason: 'Avoid animated content' },
          { mimeType: 'image/svg+xml', expectedFormat: 'svg', expectedReason: 'Not suitable for photographs' },
          { mimeType: 'image/bmp', expectedFormat: 'bmp', expectedReason: 'Large file sizes, limited web optimization' }
        ];

        for (const testCase of testCases) {
          const extmetadata = {
            MimeType: { value: testCase.mimeType }
          };
          
          const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
          
          expect(result.isValid).toBe(false);
          expect(result.detectedFormat).toBe(testCase.expectedFormat);
          expect(result.detectedMimeType).toBe(testCase.mimeType);
          expect(result.rejectionReason).toBe(testCase.expectedReason);
          expect(result.detectionMethod).toBe('mime-type');
        }
      });
    });

    describe('Error handling', () => {
      it('should handle invalid URL input', async () => {
        const extmetadata = {
          MimeType: { value: 'image/jpeg' }
        };
        
        const result = await service.validateWithWikimediaMetadata('', extmetadata);
        
        expect(result.isValid).toBe(false);
        expect(result.detectionMethod).toBe('input-validation');
        expect(result.rejectionReason).toBe('Invalid URL provided');
        expect(result.confidence).toBe(1.0);
      });

      it('should handle unknown MIME types', async () => {
        const extmetadata = {
          MimeType: { value: 'image/unknown' }
        };
        
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
        
        expect(result.isValid).toBe(false);
        expect(result.detectedMimeType).toBe('image/unknown');
        expect(result.detectionMethod).toBe('mime-type');
        expect(result.rejectionReason).toBe('Unknown MIME type');
        expect(result.confidence).toBe(0.8);
      });

      it('should handle missing metadata and unrecognizable URL', async () => {
        const extmetadata = {
          DateTime: { value: '2023-01-01' }
          // No MimeType
        };
        
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo', extmetadata);
        
        expect(result.isValid).toBe(false);
        expect(result.detectionMethod).toBe('wikimedia-metadata-validation');
        expect(result.rejectionReason).toBe('Unable to determine image format from metadata or URL');
        expect(result.confidence).toBe(0.0);
      });

      it('should handle null and undefined metadata', async () => {
        const testCases = [null, undefined, {}];
        
        for (const extmetadata of testCases) {
          const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
          
          expect(result.isValid).toBe(true); // Should fall back to URL extension
          expect(result.detectedFormat).toBe('jpeg');
          expect(result.detectionMethod).toBe('url-extension');
        }
      });
    });

    describe('Requirements validation', () => {
      // Requirement 3.2: WHEN validating photo format THEN the system SHALL check the MIME type from metadata if available
      it('should check MIME type from metadata when available (Requirement 3.2)', async () => {
        const extmetadata = {
          MimeType: { value: 'image/png' }
        };
        
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
        
        expect(result.detectedMimeType).toBe('image/png');
        expect(result.detectionMethod).toBe('mime-type');
      });

      // Requirement 3.3: WHEN file extension and MIME type conflict THEN the system SHALL prioritize MIME type validation
      it('should prioritize MIME type over file extension when they conflict (Requirement 3.3)', async () => {
        const extmetadata = {
          MimeType: { value: 'image/webp' }
        };
        
        // URL extension suggests PNG but MIME type says WebP
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo.png', extmetadata);
        
        expect(result.detectedFormat).toBe('webp');
        expect(result.detectedMimeType).toBe('image/webp');
        expect(result.detectionMethod).toBe('mime-type');
        expect(result.confidence).toBe(0.9); // High confidence for MIME type
      });

      // Requirement 5.3: WHEN logging format decisions THEN the system SHALL include the photo URL and detected format
      it('should provide information suitable for logging (Requirement 5.3)', async () => {
        const extmetadata = {
          MimeType: { value: 'image/jpeg' }
        };
        
        const result = await service.validateWithWikimediaMetadata('https://example.com/photo.jpg', extmetadata);
        
        expect(result.detectedFormat).toBeDefined();
        expect(result.detectedMimeType).toBeDefined();
        expect(result.detectionMethod).toBeDefined();
        expect(result.confidence).toBeDefined();
      });
    });
  });

  describe('isFormatSupported', () => {
    it('should return true for supported formats', () => {
      expect(service.isFormatSupported('jpeg')).toBe(true);
      expect(service.isFormatSupported('png')).toBe(true);
      expect(service.isFormatSupported('webp')).toBe(true);
    });

    it('should return false for rejected formats', () => {
      expect(service.isFormatSupported('tiff')).toBe(false);
      expect(service.isFormatSupported('svg')).toBe(false);
      expect(service.isFormatSupported('gif')).toBe(false);
      expect(service.isFormatSupported('bmp')).toBe(false);
    });
  });

  describe('validateImageFormat - Basic Cases', () => {
    it('should validate supported format via MIME type', async () => {
      const result = await service.validateImageFormat('https://example.com/photo.jpg', 'image/jpeg');
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('jpeg');
      expect(result.detectedMimeType).toBe('image/jpeg');
      expect(result.detectionMethod).toBe('mime-type');
    });

    it('should reject unsupported format via MIME type', async () => {
      const result = await service.validateImageFormat('https://example.com/photo.tiff', 'image/tiff');
      
      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe('tiff');
      expect(result.detectionMethod).toBe('mime-type');
      expect(result.rejectionReason).toBe('Limited browser support');
    });

    it('should fall back to URL extension when no MIME type provided', async () => {
      const result = await service.validateImageFormat('https://example.com/photo.png');
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('png');
      expect(result.detectionMethod).toBe('url-extension');
    });

    it('should reject invalid URL input', async () => {
      const result = await service.validateImageFormat('');
      
      expect(result.isValid).toBe(false);
      expect(result.detectionMethod).toBe('input-validation');
      expect(result.rejectionReason).toBe('Invalid URL provided');
    });
  });

  describe('validateImageFormat - Wikimedia Metadata Integration', () => {
    it('should extract MIME type from Wikimedia extmetadata structure', async () => {
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/png' },
          DateTime: { value: '2023-01-01' }
        }
      };
      
      const result = await service.validateImageFormat('https://example.com/photo.jpg', undefined, metadata);
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('png');
      expect(result.detectedMimeType).toBe('image/png');
      expect(result.detectionMethod).toBe('mime-type');
    });

    it('should prioritize direct MIME type over extmetadata', async () => {
      const metadata = {
        extmetadata: {
          MimeType: { value: 'image/png' }
        }
      };
      
      // Direct MIME type should take precedence
      const result = await service.validateImageFormat('https://example.com/photo.jpg', 'image/webp', metadata);
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('webp');
      expect(result.detectedMimeType).toBe('image/webp');
      expect(result.detectionMethod).toBe('mime-type');
    });

    it('should handle missing extmetadata gracefully', async () => {
      const metadata = {
        someOtherField: 'value'
      };
      
      const result = await service.validateImageFormat('https://example.com/photo.jpeg', undefined, metadata);
      
      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe('jpeg');
      expect(result.detectionMethod).toBe('url-extension');
    });
  });
});