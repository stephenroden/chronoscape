import { Injectable } from '@angular/core';

/**
 * Configuration for a single image format
 */
export interface FormatDefinition {
  extensions: string[];
  mimeTypes: string[];
  enabled: boolean;
  description?: string;
}

/**
 * Configuration for rejected image formats
 */
export interface RejectedFormatDefinition {
  extensions: string[];
  mimeTypes: string[];
  reason: string;
  description?: string;
}

/**
 * Fallback behavior configuration
 */
export interface FallbackBehaviorConfig {
  retryCount: number;
  expandSearchRadius: boolean;
  httpTimeoutMs: number;
}

/**
 * Complete format configuration structure
 */
export interface FormatConfig {
  supportedFormats: {
    [key: string]: FormatDefinition;
  };
  rejectedFormats: {
    [key: string]: RejectedFormatDefinition;
  };
  fallbackBehavior: FallbackBehaviorConfig;
}

/**
 * Validation result for format configuration
 */
export interface FormatConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service for managing image format configuration
 * Provides centralized configuration management with validation
 */
@Injectable({
  providedIn: 'root'
})
export class FormatConfigService {
  private readonly defaultConfig: FormatConfig = {
    supportedFormats: {
      jpeg: {
        extensions: ['.jpg', '.jpeg'],
        mimeTypes: ['image/jpeg'],
        enabled: true,
        description: 'JPEG format - widely supported, good compression'
      },
      png: {
        extensions: ['.png'],
        mimeTypes: ['image/png'],
        enabled: true,
        description: 'PNG format - lossless compression, transparency support'
      },
      webp: {
        extensions: ['.webp'],
        mimeTypes: ['image/webp'],
        enabled: true,
        description: 'WebP format - modern format with excellent compression'
      }
    },
    rejectedFormats: {
      tiff: {
        extensions: ['.tiff', '.tif'],
        mimeTypes: ['image/tiff'],
        reason: 'Limited browser support',
        description: 'TIFF format - not widely supported in browsers'
      },
      svg: {
        extensions: ['.svg'],
        mimeTypes: ['image/svg+xml'],
        reason: 'Not suitable for photographs',
        description: 'SVG format - vector graphics, not appropriate for photos'
      },
      gif: {
        extensions: ['.gif'],
        mimeTypes: ['image/gif'],
        reason: 'Avoid animated content',
        description: 'GIF format - may contain animations, limited color palette'
      },
      bmp: {
        extensions: ['.bmp'],
        mimeTypes: ['image/bmp'],
        reason: 'Large file sizes, limited web optimization',
        description: 'BMP format - uncompressed, large file sizes'
      }
    },
    fallbackBehavior: {
      retryCount: 3,
      expandSearchRadius: true,
      httpTimeoutMs: 5000
    }
  };

  private currentConfig: FormatConfig;

  constructor() {
    this.currentConfig = this.deepClone(this.defaultConfig);
  }

  /**
   * Gets the current format configuration
   * @returns Current format configuration
   */
  getConfig(): FormatConfig {
    return this.deepClone(this.currentConfig);
  }

  /**
   * Updates the format configuration with validation
   * @param newConfig - New configuration to apply
   * @returns Validation result indicating success or failure with details
   */
  updateConfig(newConfig: FormatConfig): FormatConfigValidationResult {
    const validation = this.validateConfig(newConfig);
    
    if (validation.isValid) {
      this.currentConfig = this.deepClone(newConfig);
    }
    
    return validation;
  }

  /**
   * Resets configuration to default values
   */
  resetToDefault(): void {
    this.currentConfig = this.deepClone(this.defaultConfig);
  }

  /**
   * Gets the default configuration
   * @returns Default format configuration
   */
  getDefaultConfig(): FormatConfig {
    return this.deepClone(this.defaultConfig);
  }

  /**
   * Adds a new supported format to the configuration
   * @param formatName - Name of the format to add
   * @param definition - Format definition
   * @returns Validation result
   */
  addSupportedFormat(formatName: string, definition: FormatDefinition): FormatConfigValidationResult {
    if (!formatName || typeof formatName !== 'string' || formatName.trim() === '') {
      return {
        isValid: false,
        errors: ['Format name must be a non-empty string'],
        warnings: []
      };
    }

    const normalizedName = formatName.toLowerCase().trim();
    
    // Check if format already exists in supported or rejected formats
    if (this.currentConfig.supportedFormats[normalizedName]) {
      return {
        isValid: false,
        errors: [`Format '${normalizedName}' already exists in supported formats`],
        warnings: []
      };
    }

    if (this.currentConfig.rejectedFormats[normalizedName]) {
      return {
        isValid: false,
        errors: [`Format '${normalizedName}' exists in rejected formats. Remove it first before adding as supported.`],
        warnings: []
      };
    }

    const formatValidation = this.validateFormatDefinition(definition);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    // Check for extension/MIME type conflicts with existing formats
    const conflicts = this.checkForConflicts(definition, normalizedName);
    if (conflicts.length > 0) {
      return {
        isValid: false,
        errors: conflicts,
        warnings: formatValidation.warnings
      };
    }

    this.currentConfig.supportedFormats[normalizedName] = this.deepClone(definition);
    
    return {
      isValid: true,
      errors: [],
      warnings: formatValidation.warnings
    };
  }

  /**
   * Removes a supported format from the configuration
   * @param formatName - Name of the format to remove
   * @returns True if format was removed, false if it didn't exist
   */
  removeSupportedFormat(formatName: string): boolean {
    const normalizedName = formatName.toLowerCase().trim();
    
    if (this.currentConfig.supportedFormats[normalizedName]) {
      delete this.currentConfig.supportedFormats[normalizedName];
      return true;
    }
    
    return false;
  }

  /**
   * Adds a new rejected format to the configuration
   * @param formatName - Name of the format to add
   * @param definition - Rejected format definition
   * @returns Validation result
   */
  addRejectedFormat(formatName: string, definition: RejectedFormatDefinition): FormatConfigValidationResult {
    if (!formatName || typeof formatName !== 'string' || formatName.trim() === '') {
      return {
        isValid: false,
        errors: ['Format name must be a non-empty string'],
        warnings: []
      };
    }

    const normalizedName = formatName.toLowerCase().trim();
    
    // Check if format already exists
    if (this.currentConfig.rejectedFormats[normalizedName]) {
      return {
        isValid: false,
        errors: [`Format '${normalizedName}' already exists in rejected formats`],
        warnings: []
      };
    }

    if (this.currentConfig.supportedFormats[normalizedName]) {
      return {
        isValid: false,
        errors: [`Format '${normalizedName}' exists in supported formats. Remove it first before adding as rejected.`],
        warnings: []
      };
    }

    const formatValidation = this.validateRejectedFormatDefinition(definition);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    // Check for extension/MIME type conflicts with existing formats
    const conflicts = this.checkForRejectedConflicts(definition, normalizedName);
    if (conflicts.length > 0) {
      return {
        isValid: false,
        errors: conflicts,
        warnings: formatValidation.warnings
      };
    }

    this.currentConfig.rejectedFormats[normalizedName] = this.deepClone(definition);
    
    return {
      isValid: true,
      errors: [],
      warnings: formatValidation.warnings
    };
  }

  /**
   * Removes a rejected format from the configuration
   * @param formatName - Name of the format to remove
   * @returns True if format was removed, false if it didn't exist
   */
  removeRejectedFormat(formatName: string): boolean {
    const normalizedName = formatName.toLowerCase().trim();
    
    if (this.currentConfig.rejectedFormats[normalizedName]) {
      delete this.currentConfig.rejectedFormats[normalizedName];
      return true;
    }
    
    return false;
  }

  /**
   * Enables or disables a supported format
   * @param formatName - Name of the format to modify
   * @param enabled - Whether the format should be enabled
   * @returns True if format was modified, false if it didn't exist
   */
  setFormatEnabled(formatName: string, enabled: boolean): boolean {
    const normalizedName = formatName.toLowerCase().trim();
    
    if (this.currentConfig.supportedFormats[normalizedName]) {
      this.currentConfig.supportedFormats[normalizedName].enabled = enabled;
      return true;
    }
    
    return false;
  }

  /**
   * Updates fallback behavior configuration
   * @param fallbackConfig - New fallback configuration
   * @returns Validation result
   */
  updateFallbackBehavior(fallbackConfig: FallbackBehaviorConfig): FormatConfigValidationResult {
    const validation = this.validateFallbackBehavior(fallbackConfig);
    
    if (validation.isValid) {
      this.currentConfig.fallbackBehavior = this.deepClone(fallbackConfig);
    }
    
    return validation;
  }

  /**
   * Gets list of all supported format names (enabled only)
   * @returns Array of enabled supported format names
   */
  getSupportedFormatNames(): string[] {
    return Object.keys(this.currentConfig.supportedFormats)
      .filter(formatName => this.currentConfig.supportedFormats[formatName].enabled);
  }

  /**
   * Gets list of all rejected format names
   * @returns Array of rejected format names
   */
  getRejectedFormatNames(): string[] {
    return Object.keys(this.currentConfig.rejectedFormats);
  }

  /**
   * Validates the complete format configuration structure
   * @param config - Configuration to validate
   * @returns Validation result with errors and warnings
   */
  private validateConfig(config: FormatConfig): FormatConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate config structure
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { isValid: false, errors, warnings };
    }

    if (!config.supportedFormats || typeof config.supportedFormats !== 'object') {
      errors.push('supportedFormats must be an object');
    }

    if (!config.rejectedFormats || typeof config.rejectedFormats !== 'object') {
      errors.push('rejectedFormats must be an object');
    }

    if (!config.fallbackBehavior || typeof config.fallbackBehavior !== 'object') {
      errors.push('fallbackBehavior must be an object');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Validate supported formats
    for (const [formatName, definition] of Object.entries(config.supportedFormats)) {
      const formatValidation = this.validateFormatDefinition(definition);
      if (!formatValidation.isValid) {
        errors.push(...formatValidation.errors.map(error => `Supported format '${formatName}': ${error}`));
      }
      warnings.push(...formatValidation.warnings.map(warning => `Supported format '${formatName}': ${warning}`));
    }

    // Validate rejected formats
    for (const [formatName, definition] of Object.entries(config.rejectedFormats)) {
      const formatValidation = this.validateRejectedFormatDefinition(definition);
      if (!formatValidation.isValid) {
        errors.push(...formatValidation.errors.map(error => `Rejected format '${formatName}': ${error}`));
      }
      warnings.push(...formatValidation.warnings.map(warning => `Rejected format '${formatName}': ${warning}`));
    }

    // Validate fallback behavior
    const fallbackValidation = this.validateFallbackBehavior(config.fallbackBehavior);
    if (!fallbackValidation.isValid) {
      errors.push(...fallbackValidation.errors.map(error => `Fallback behavior: ${error}`));
    }
    warnings.push(...fallbackValidation.warnings.map(warning => `Fallback behavior: ${warning}`));

    // Check for conflicts between supported and rejected formats
    const conflictErrors = this.validateFormatConflicts(config);
    errors.push(...conflictErrors);

    // Validate that at least one format is supported and enabled
    const enabledFormats = Object.values(config.supportedFormats).filter(format => format.enabled);
    if (enabledFormats.length === 0) {
      warnings.push('No supported formats are enabled. This may cause all photos to be rejected.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates a format definition
   * @param definition - Format definition to validate
   * @returns Validation result
   */
  private validateFormatDefinition(definition: FormatDefinition): FormatConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!definition || typeof definition !== 'object') {
      errors.push('Format definition must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate extensions
    if (!Array.isArray(definition.extensions)) {
      errors.push('extensions must be an array');
    } else {
      if (definition.extensions.length === 0) {
        warnings.push('No file extensions defined');
      }
      
      for (const ext of definition.extensions) {
        if (typeof ext !== 'string') {
          errors.push('All extensions must be strings');
        } else if (!ext.startsWith('.')) {
          errors.push(`Extension '${ext}' must start with a dot`);
        } else if (ext.length < 2) {
          errors.push(`Extension '${ext}' is too short`);
        }
      }
    }

    // Validate MIME types
    if (!Array.isArray(definition.mimeTypes)) {
      errors.push('mimeTypes must be an array');
    } else {
      if (definition.mimeTypes.length === 0) {
        warnings.push('No MIME types defined');
      }
      
      for (const mimeType of definition.mimeTypes) {
        if (typeof mimeType !== 'string') {
          errors.push('All MIME types must be strings');
        } else if (!mimeType.includes('/')) {
          errors.push(`MIME type '${mimeType}' is invalid (must contain '/')`);
        }
      }
    }

    // Validate enabled flag
    if (typeof definition.enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates a rejected format definition
   * @param definition - Rejected format definition to validate
   * @returns Validation result
   */
  private validateRejectedFormatDefinition(definition: RejectedFormatDefinition): FormatConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!definition || typeof definition !== 'object') {
      errors.push('Rejected format definition must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate extensions
    if (!Array.isArray(definition.extensions)) {
      errors.push('extensions must be an array');
    } else {
      if (definition.extensions.length === 0) {
        warnings.push('No file extensions defined');
      }
      
      for (const ext of definition.extensions) {
        if (typeof ext !== 'string') {
          errors.push('All extensions must be strings');
        } else if (!ext.startsWith('.')) {
          errors.push(`Extension '${ext}' must start with a dot`);
        } else if (ext.length < 2) {
          errors.push(`Extension '${ext}' is too short`);
        }
      }
    }

    // Validate MIME types
    if (!Array.isArray(definition.mimeTypes)) {
      errors.push('mimeTypes must be an array');
    } else {
      if (definition.mimeTypes.length === 0) {
        warnings.push('No MIME types defined');
      }
      
      for (const mimeType of definition.mimeTypes) {
        if (typeof mimeType !== 'string') {
          errors.push('All MIME types must be strings');
        } else if (!mimeType.includes('/')) {
          errors.push(`MIME type '${mimeType}' is invalid (must contain '/')`);
        }
      }
    }

    // Validate reason
    if (!definition.reason || typeof definition.reason !== 'string') {
      errors.push('reason must be a non-empty string');
    } else if (definition.reason.trim() === '') {
      errors.push('reason cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates fallback behavior configuration
   * @param fallbackConfig - Fallback configuration to validate
   * @returns Validation result
   */
  private validateFallbackBehavior(fallbackConfig: FallbackBehaviorConfig): FormatConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fallbackConfig || typeof fallbackConfig !== 'object') {
      errors.push('Fallback behavior must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate retryCount
    if (typeof fallbackConfig.retryCount !== 'number') {
      errors.push('retryCount must be a number');
    } else if (fallbackConfig.retryCount < 0) {
      errors.push('retryCount must be non-negative');
    } else if (fallbackConfig.retryCount > 10) {
      warnings.push('retryCount is very high, may impact performance');
    }

    // Validate expandSearchRadius
    if (typeof fallbackConfig.expandSearchRadius !== 'boolean') {
      errors.push('expandSearchRadius must be a boolean');
    }

    // Validate httpTimeoutMs
    if (typeof fallbackConfig.httpTimeoutMs !== 'number') {
      errors.push('httpTimeoutMs must be a number');
    } else if (fallbackConfig.httpTimeoutMs <= 0) {
      errors.push('httpTimeoutMs must be positive');
    } else if (fallbackConfig.httpTimeoutMs < 1000) {
      warnings.push('httpTimeoutMs is very low, may cause frequent timeouts');
    } else if (fallbackConfig.httpTimeoutMs > 30000) {
      warnings.push('httpTimeoutMs is very high, may impact user experience');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates that there are no conflicts between supported and rejected formats
   * @param config - Configuration to validate
   * @returns Array of conflict error messages
   */
  private validateFormatConflicts(config: FormatConfig): string[] {
    const errors: string[] = [];
    const allExtensions = new Map<string, string[]>(); // extension -> format names
    const allMimeTypes = new Map<string, string[]>(); // mimeType -> format names

    // Collect all extensions and MIME types from supported formats
    for (const [formatName, definition] of Object.entries(config.supportedFormats)) {
      for (const ext of definition.extensions) {
        if (!allExtensions.has(ext)) {
          allExtensions.set(ext, []);
        }
        allExtensions.get(ext)!.push(`supported:${formatName}`);
      }
      
      for (const mimeType of definition.mimeTypes) {
        if (!allMimeTypes.has(mimeType)) {
          allMimeTypes.set(mimeType, []);
        }
        allMimeTypes.get(mimeType)!.push(`supported:${formatName}`);
      }
    }

    // Check for conflicts with rejected formats
    for (const [formatName, definition] of Object.entries(config.rejectedFormats)) {
      for (const ext of definition.extensions) {
        if (allExtensions.has(ext)) {
          const conflictingFormats = allExtensions.get(ext)!;
          errors.push(`Extension '${ext}' is used by both rejected format '${formatName}' and ${conflictingFormats.join(', ')}`);
        } else {
          allExtensions.set(ext, [`rejected:${formatName}`]);
        }
      }
      
      for (const mimeType of definition.mimeTypes) {
        if (allMimeTypes.has(mimeType)) {
          const conflictingFormats = allMimeTypes.get(mimeType)!;
          errors.push(`MIME type '${mimeType}' is used by both rejected format '${formatName}' and ${conflictingFormats.join(', ')}`);
        } else {
          allMimeTypes.set(mimeType, [`rejected:${formatName}`]);
        }
      }
    }

    return errors;
  }

  /**
   * Checks for conflicts when adding a new supported format
   * @param definition - Format definition to check
   * @param formatName - Name of the format being added
   * @returns Array of conflict error messages
   */
  private checkForConflicts(definition: FormatDefinition, formatName: string): string[] {
    const errors: string[] = [];

    // Check extensions
    for (const ext of definition.extensions) {
      // Check against existing supported formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.supportedFormats)) {
        if (existingName !== formatName && existingDef.extensions.includes(ext)) {
          errors.push(`Extension '${ext}' is already used by supported format '${existingName}'`);
        }
      }
      
      // Check against rejected formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.rejectedFormats)) {
        if (existingDef.extensions.includes(ext)) {
          errors.push(`Extension '${ext}' is already used by rejected format '${existingName}'`);
        }
      }
    }

    // Check MIME types
    for (const mimeType of definition.mimeTypes) {
      // Check against existing supported formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.supportedFormats)) {
        if (existingName !== formatName && existingDef.mimeTypes.includes(mimeType)) {
          errors.push(`MIME type '${mimeType}' is already used by supported format '${existingName}'`);
        }
      }
      
      // Check against rejected formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.rejectedFormats)) {
        if (existingDef.mimeTypes.includes(mimeType)) {
          errors.push(`MIME type '${mimeType}' is already used by rejected format '${existingName}'`);
        }
      }
    }

    return errors;
  }

  /**
   * Checks for conflicts when adding a new rejected format
   * @param definition - Rejected format definition to check
   * @param formatName - Name of the format being added
   * @returns Array of conflict error messages
   */
  private checkForRejectedConflicts(definition: RejectedFormatDefinition, formatName: string): string[] {
    const errors: string[] = [];

    // Check extensions
    for (const ext of definition.extensions) {
      // Check against existing supported formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.supportedFormats)) {
        if (existingDef.extensions.includes(ext)) {
          errors.push(`Extension '${ext}' is already used by supported format '${existingName}'`);
        }
      }
      
      // Check against existing rejected formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.rejectedFormats)) {
        if (existingName !== formatName && existingDef.extensions.includes(ext)) {
          errors.push(`Extension '${ext}' is already used by rejected format '${existingName}'`);
        }
      }
    }

    // Check MIME types
    for (const mimeType of definition.mimeTypes) {
      // Check against existing supported formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.supportedFormats)) {
        if (existingDef.mimeTypes.includes(mimeType)) {
          errors.push(`MIME type '${mimeType}' is already used by supported format '${existingName}'`);
        }
      }
      
      // Check against existing rejected formats
      for (const [existingName, existingDef] of Object.entries(this.currentConfig.rejectedFormats)) {
        if (existingName !== formatName && existingDef.mimeTypes.includes(mimeType)) {
          errors.push(`MIME type '${mimeType}' is already used by rejected format '${existingName}'`);
        }
      }
    }

    return errors;
  }

  /**
   * Deep clones an object to prevent reference sharing
   * @param obj - Object to clone
   * @returns Deep clone of the object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }
}