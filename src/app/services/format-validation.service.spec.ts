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

  describe('getFormatFromUrl', () => {
    it('should detect JPEG format from .jpg extension', () => {
      const format = service.getFormatFromUrl('https://example.com/photo.jpg');
      expect(format).toBe('jpeg');
    });

    it('should detect PNG format from .png extension', () => {
      const format = service.getFormatFromUrl('https://example.com/photo.png');
      expect(format).toBe('png');
    });

    it('should return null for unknown extensions', () => {
      const format = service.getFormatFromUrl('https://example.com/photo.xyz');
      expect(format).toBeNull();
    });

    it('should handle malformed URLs gracefully', () => {
      expect(service.getFormatFromUrl('not-a-url')).toBeNull();
      expect(service.getFormatFromUrl('')).toBeNull();
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