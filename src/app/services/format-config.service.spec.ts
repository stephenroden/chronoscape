import { TestBed } from '@angular/core/testing';
import { 
  FormatConfigService, 
  FormatConfig, 
  FormatDefinition, 
  RejectedFormatDefinition, 
  FallbackBehaviorConfig,
  FormatConfigValidationResult 
} from './format-config.service';

describe('FormatConfigService', () => {
  let service: FormatConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormatConfigService]
    });
    service = TestBed.inject(FormatConfigService);
  });

  describe('Basic Configuration Management', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should return default configuration on initialization', () => {
      const config = service.getConfig();
      
      expect(config).toBeDefined();
      expect(config.supportedFormats).toBeDefined();
      expect(config.rejectedFormats).toBeDefined();
      expect(config.fallbackBehavior).toBeDefined();
      
      // Check default supported formats
      expect(config.supportedFormats['jpeg']).toBeDefined();
      expect(config.supportedFormats['png']).toBeDefined();
      expect(config.supportedFormats['webp']).toBeDefined();
      
      // Check default rejected formats
      expect(config.rejectedFormats['tiff']).toBeDefined();
      expect(config.rejectedFormats['svg']).toBeDefined();
      expect(config.rejectedFormats['gif']).toBeDefined();
      expect(config.rejectedFormats['bmp']).toBeDefined();
    });

    it('should return deep clone of configuration to prevent external modification', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1.supportedFormats).not.toBe(config2.supportedFormats);
      
      // Modify one config and ensure the other is not affected
      config1.supportedFormats['jpeg'].enabled = false;
      expect(config2.supportedFormats['jpeg'].enabled).toBe(true);
    });

    it('should reset to default configuration', () => {
      // Modify configuration
      const newConfig = service.getConfig();
      newConfig.supportedFormats['jpeg'].enabled = false;
      service.updateConfig(newConfig);
      
      expect(service.getConfig().supportedFormats['jpeg'].enabled).toBe(false);
      
      // Reset to default
      service.resetToDefault();
      expect(service.getConfig().supportedFormats['jpeg'].enabled).toBe(true);
    });

    it('should return default configuration without affecting current config', () => {
      // Modify current configuration
      const newConfig = service.getConfig();
      newConfig.supportedFormats['jpeg'].enabled = false;
      service.updateConfig(newConfig);
      
      // Get default config
      const defaultConfig = service.getDefaultConfig();
      expect(defaultConfig.supportedFormats['jpeg'].enabled).toBe(true);
      
      // Current config should still be modified
      expect(service.getConfig().supportedFormats['jpeg'].enabled).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = service.getDefaultConfig();
      const result = service.updateConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject null or undefined configuration', () => {
      const result1 = service.updateConfig(null as any);
      const result2 = service.updateConfig(undefined as any);
      
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Configuration must be an object');
      
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Configuration must be an object');
    });

    it('should reject configuration with missing required properties', () => {
      const invalidConfig = {
        supportedFormats: {}
        // Missing rejectedFormats and fallbackBehavior
      } as any;
      
      const result = service.updateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('rejectedFormats must be an object');
      expect(result.errors).toContain('fallbackBehavior must be an object');
    });

    it('should warn when no supported formats are enabled', () => {
      const config = service.getDefaultConfig();
      
      // Disable all supported formats
      Object.keys(config.supportedFormats).forEach(formatName => {
        config.supportedFormats[formatName].enabled = false;
      });
      
      const result = service.updateConfig(config);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No supported formats are enabled. This may cause all photos to be rejected.');
    });

    it('should detect conflicts between supported and rejected formats', () => {
      const config = service.getDefaultConfig();
      
      // Add conflicting extension
      config.rejectedFormats['test'] = {
        extensions: ['.jpg'], // Conflicts with JPEG
        mimeTypes: ['image/test'],
        reason: 'Test format'
      };
      
      const result = service.updateConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes("Extension '.jpg' is used by both"))).toBe(true);
    });
  });

  describe('Format Definition Validation', () => {
    it('should validate format definition with valid data', () => {
      const validDefinition: FormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test'],
        enabled: true,
        description: 'Test format'
      };
      
      const result = service.addSupportedFormat('test', validDefinition);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject format definition with invalid extensions', () => {
      const invalidDefinition: FormatDefinition = {
        extensions: ['test', '.'], // Missing dot, too short
        mimeTypes: ['image/test'],
        enabled: true
      };
      
      const result = service.addSupportedFormat('test', invalidDefinition);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Extension 'test' must start with a dot");
      expect(result.errors).toContain("Extension '.' is too short");
    });

    it('should reject format definition with invalid MIME types', () => {
      const invalidDefinition: FormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['invalid-mime-type'], // Missing slash
        enabled: true
      };
      
      const result = service.addSupportedFormat('test', invalidDefinition);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("MIME type 'invalid-mime-type' is invalid (must contain '/')");
    });

    it('should reject format definition with non-boolean enabled flag', () => {
      const invalidDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test'],
        enabled: 'true' // Should be boolean
      } as any;
      
      const result = service.addSupportedFormat('test', invalidDefinition);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('enabled must be a boolean');
    });

    it('should warn about empty extensions or MIME types arrays', () => {
      const definitionWithEmptyArrays: FormatDefinition = {
        extensions: [],
        mimeTypes: [],
        enabled: true
      };
      
      const result = service.addSupportedFormat('test', definitionWithEmptyArrays);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No file extensions defined');
      expect(result.warnings).toContain('No MIME types defined');
    });
  });

  describe('Rejected Format Definition Validation', () => {
    it('should validate rejected format definition with valid data', () => {
      const validDefinition: RejectedFormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test'],
        reason: 'Test rejection reason',
        description: 'Test format'
      };
      
      const result = service.addRejectedFormat('test', validDefinition);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject rejected format definition without reason', () => {
      const invalidDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test']
        // Missing reason
      } as any;
      
      const result = service.addRejectedFormat('test', invalidDefinition);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('reason must be a non-empty string');
    });

    it('should reject rejected format definition with empty reason', () => {
      const invalidDefinition: RejectedFormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test'],
        reason: '   ' // Empty after trim
      };
      
      const result = service.addRejectedFormat('test', invalidDefinition);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('reason cannot be empty');
    });
  });

  describe('Fallback Behavior Validation', () => {
    it('should validate valid fallback behavior', () => {
      const validFallback: FallbackBehaviorConfig = {
        retryCount: 3,
        expandSearchRadius: true,
        httpTimeoutMs: 5000
      };
      
      const result = service.updateFallbackBehavior(validFallback);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject negative retry count', () => {
      const invalidFallback: FallbackBehaviorConfig = {
        retryCount: -1,
        expandSearchRadius: true,
        httpTimeoutMs: 5000
      };
      
      const result = service.updateFallbackBehavior(invalidFallback);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('retryCount must be non-negative');
    });

    it('should warn about very high retry count', () => {
      const fallbackWithHighRetry: FallbackBehaviorConfig = {
        retryCount: 15,
        expandSearchRadius: true,
        httpTimeoutMs: 5000
      };
      
      const result = service.updateFallbackBehavior(fallbackWithHighRetry);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('retryCount is very high, may impact performance');
    });

    it('should reject non-boolean expandSearchRadius', () => {
      const invalidFallback = {
        retryCount: 3,
        expandSearchRadius: 'true',
        httpTimeoutMs: 5000
      } as any;
      
      const result = service.updateFallbackBehavior(invalidFallback);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('expandSearchRadius must be a boolean');
    });

    it('should reject non-positive HTTP timeout', () => {
      const invalidFallback: FallbackBehaviorConfig = {
        retryCount: 3,
        expandSearchRadius: true,
        httpTimeoutMs: 0
      };
      
      const result = service.updateFallbackBehavior(invalidFallback);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('httpTimeoutMs must be positive');
    });

    it('should warn about very low HTTP timeout', () => {
      const fallbackWithLowTimeout: FallbackBehaviorConfig = {
        retryCount: 3,
        expandSearchRadius: true,
        httpTimeoutMs: 500
      };
      
      const result = service.updateFallbackBehavior(fallbackWithLowTimeout);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('httpTimeoutMs is very low, may cause frequent timeouts');
    });

    it('should warn about very high HTTP timeout', () => {
      const fallbackWithHighTimeout: FallbackBehaviorConfig = {
        retryCount: 3,
        expandSearchRadius: true,
        httpTimeoutMs: 60000
      };
      
      const result = service.updateFallbackBehavior(fallbackWithHighTimeout);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('httpTimeoutMs is very high, may impact user experience');
    });
  });

  describe('Supported Format Management', () => {
    it('should add new supported format successfully', () => {
      const newFormat: FormatDefinition = {
        extensions: ['.avif'],
        mimeTypes: ['image/avif'],
        enabled: true,
        description: 'AVIF format'
      };
      
      const result = service.addSupportedFormat('avif', newFormat);
      
      expect(result.isValid).toBe(true);
      expect(service.getSupportedFormatNames()).toContain('avif');
      
      const config = service.getConfig();
      expect(config.supportedFormats['avif']).toEqual(newFormat);
    });

    it('should reject adding format with empty name', () => {
      const newFormat: FormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test'],
        enabled: true
      };
      
      const result = service.addSupportedFormat('', newFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Format name must be a non-empty string');
    });

    it('should reject adding format that already exists in supported formats', () => {
      const newFormat: FormatDefinition = {
        extensions: ['.jpg2'],
        mimeTypes: ['image/jpeg2'],
        enabled: true
      };
      
      const result = service.addSupportedFormat('jpeg', newFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Format 'jpeg' already exists in supported formats");
    });

    it('should reject adding format that exists in rejected formats', () => {
      const newFormat: FormatDefinition = {
        extensions: ['.tiff2'],
        mimeTypes: ['image/tiff2'],
        enabled: true
      };
      
      const result = service.addSupportedFormat('tiff', newFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Format 'tiff' exists in rejected formats. Remove it first before adding as supported.");
    });

    it('should detect extension conflicts when adding supported format', () => {
      const conflictingFormat: FormatDefinition = {
        extensions: ['.png'], // Conflicts with existing PNG format
        mimeTypes: ['image/test'],
        enabled: true
      };
      
      const result = service.addSupportedFormat('test', conflictingFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Extension '.png' is already used by supported format 'png'");
    });

    it('should detect MIME type conflicts when adding supported format', () => {
      const conflictingFormat: FormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/jpeg'], // Conflicts with existing JPEG format
        enabled: true
      };
      
      const result = service.addSupportedFormat('test', conflictingFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("MIME type 'image/jpeg' is already used by supported format 'jpeg'");
    });

    it('should remove supported format successfully', () => {
      expect(service.getSupportedFormatNames()).toContain('jpeg');
      
      const removed = service.removeSupportedFormat('jpeg');
      
      expect(removed).toBe(true);
      expect(service.getSupportedFormatNames()).not.toContain('jpeg');
    });

    it('should return false when removing non-existent supported format', () => {
      const removed = service.removeSupportedFormat('nonexistent');
      
      expect(removed).toBe(false);
    });

    it('should enable/disable supported format', () => {
      expect(service.getConfig().supportedFormats['jpeg'].enabled).toBe(true);
      
      const modified = service.setFormatEnabled('jpeg', false);
      
      expect(modified).toBe(true);
      expect(service.getConfig().supportedFormats['jpeg'].enabled).toBe(false);
      expect(service.getSupportedFormatNames()).not.toContain('jpeg');
    });

    it('should return false when enabling/disabling non-existent format', () => {
      const modified = service.setFormatEnabled('nonexistent', false);
      
      expect(modified).toBe(false);
    });
  });

  describe('Rejected Format Management', () => {
    it('should add new rejected format successfully', () => {
      const newFormat: RejectedFormatDefinition = {
        extensions: ['.heic'],
        mimeTypes: ['image/heic'],
        reason: 'Limited browser support',
        description: 'HEIC format'
      };
      
      const result = service.addRejectedFormat('heic', newFormat);
      
      expect(result.isValid).toBe(true);
      expect(service.getRejectedFormatNames()).toContain('heic');
      
      const config = service.getConfig();
      expect(config.rejectedFormats['heic']).toEqual(newFormat);
    });

    it('should reject adding rejected format that already exists', () => {
      const newFormat: RejectedFormatDefinition = {
        extensions: ['.tiff2'],
        mimeTypes: ['image/tiff2'],
        reason: 'Test reason'
      };
      
      const result = service.addRejectedFormat('tiff', newFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Format 'tiff' already exists in rejected formats");
    });

    it('should reject adding rejected format that exists in supported formats', () => {
      const newFormat: RejectedFormatDefinition = {
        extensions: ['.jpg2'],
        mimeTypes: ['image/jpeg2'],
        reason: 'Test reason'
      };
      
      const result = service.addRejectedFormat('jpeg', newFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Format 'jpeg' exists in supported formats. Remove it first before adding as rejected.");
    });

    it('should remove rejected format successfully', () => {
      expect(service.getRejectedFormatNames()).toContain('tiff');
      
      const removed = service.removeRejectedFormat('tiff');
      
      expect(removed).toBe(true);
      expect(service.getRejectedFormatNames()).not.toContain('tiff');
    });

    it('should return false when removing non-existent rejected format', () => {
      const removed = service.removeRejectedFormat('nonexistent');
      
      expect(removed).toBe(false);
    });
  });

  describe('Format Name Lists', () => {
    it('should return correct supported format names (enabled only)', () => {
      const supportedNames = service.getSupportedFormatNames();
      
      expect(supportedNames).toContain('jpeg');
      expect(supportedNames).toContain('png');
      expect(supportedNames).toContain('webp');
      expect(supportedNames.length).toBe(3);
    });

    it('should exclude disabled formats from supported format names', () => {
      service.setFormatEnabled('jpeg', false);
      
      const supportedNames = service.getSupportedFormatNames();
      
      expect(supportedNames).not.toContain('jpeg');
      expect(supportedNames).toContain('png');
      expect(supportedNames).toContain('webp');
      expect(supportedNames.length).toBe(2);
    });

    it('should return correct rejected format names', () => {
      const rejectedNames = service.getRejectedFormatNames();
      
      expect(rejectedNames).toContain('tiff');
      expect(rejectedNames).toContain('svg');
      expect(rejectedNames).toContain('gif');
      expect(rejectedNames).toContain('bmp');
      expect(rejectedNames.length).toBe(4);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle format names with different cases', () => {
      const newFormat: FormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test'],
        enabled: true
      };
      
      // Add with uppercase
      const result1 = service.addSupportedFormat('TEST', newFormat);
      expect(result1.isValid).toBe(true);
      
      // Try to add with lowercase (should conflict)
      const result2 = service.addSupportedFormat('test', newFormat);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain("Format 'test' already exists in supported formats");
    });

    it('should handle whitespace in format names', () => {
      const newFormat: FormatDefinition = {
        extensions: ['.test'],
        mimeTypes: ['image/test'],
        enabled: true
      };
      
      const result = service.addSupportedFormat('  test  ', newFormat);
      
      expect(result.isValid).toBe(true);
      expect(service.getSupportedFormatNames()).toContain('test');
    });

    it('should handle null/undefined format definitions gracefully', () => {
      const result1 = service.addSupportedFormat('test', null as any);
      const result2 = service.addSupportedFormat('test', undefined as any);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    it('should handle arrays with non-string elements', () => {
      const invalidFormat = {
        extensions: ['.test', 123, null],
        mimeTypes: ['image/test', true, undefined],
        enabled: true
      } as any;
      
      const result = service.addSupportedFormat('test', invalidFormat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All extensions must be strings');
      expect(result.errors).toContain('All MIME types must be strings');
    });
  });

  describe('Deep Cloning', () => {
    it('should return independent copies of configuration', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      
      // Modify nested properties
      config1.supportedFormats['jpeg'].extensions.push('.test');
      config1.fallbackBehavior.retryCount = 999;
      
      expect(config2.supportedFormats['jpeg'].extensions).not.toContain('.test');
      expect(config2.fallbackBehavior.retryCount).not.toBe(999);
    });

    it('should handle Date objects in deep cloning', () => {
      // This test ensures the deep clone method can handle Date objects if they're added to config in the future
      const testObj = {
        date: new Date('2023-01-01'),
        nested: {
          anotherDate: new Date('2023-12-31')
        }
      };
      
      // Access private method for testing (TypeScript will complain but it works at runtime)
      const cloned = (service as any).deepClone(testObj);
      
      expect(cloned.date).toEqual(testObj.date);
      expect(cloned.date).not.toBe(testObj.date);
      expect(cloned.nested.anotherDate).toEqual(testObj.nested.anotherDate);
      expect(cloned.nested.anotherDate).not.toBe(testObj.nested.anotherDate);
    });
  });
});