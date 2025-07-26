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

    it('should return null for unknown MIME types', () => {
      const format = service.getFormatFromMimeType('image/unknown');
      expect(format).toBeNull();
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
});