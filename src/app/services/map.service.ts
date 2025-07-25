import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Coordinates } from '../models/coordinates.model';

// Fix for Leaflet default marker icons in Angular
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Pin options for customizing marker appearance
 */
export interface PinOptions {
  color?: string;
  label?: string;
  title?: string;
  alt?: string;
  icon?: L.Icon;
}

/**
 * Service for managing Leaflet map interactions and functionality
 */
@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: L.Map | null = null;
  private currentPin: L.Marker | null = null;
  private markers: L.Marker[] = [];

  /**
   * Initialize a Leaflet map with OpenStreetMap tiles
   * @param containerId - The HTML element ID where the map will be rendered
   * @param initialCoordinates - Optional initial coordinates to center the map
   * @param initialZoom - Optional initial zoom level (default: 2 for world view)
   * @returns The initialized Leaflet map instance
   */
  initializeMap(
    containerId: string,
    initialCoordinates?: Coordinates,
    initialZoom: number = 2
  ): L.Map {
    try {
      // Validate container ID
      if (!containerId || typeof containerId !== 'string') {
        throw new Error('Invalid container ID provided for map initialization');
      }

      // Check if container exists
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Map container with ID '${containerId}' not found`);
      }

      // Clean up existing map if it exists
      if (this.map) {
        try {
          this.map.remove();
        } catch (error) {
          console.warn('Error cleaning up existing map:', error);
        }
      }

      // Clear the container to ensure it's not already initialized
      container.innerHTML = '';
      // Remove Leaflet's internal reference to prevent "already initialized" error
      (container as any)._leaflet_id = null;

      // Validate coordinates
      const coords = initialCoordinates || { latitude: 20, longitude: 0 };
      if (coords.latitude < -90 || coords.latitude > 90) {
        throw new Error('Invalid latitude: must be between -90 and 90');
      }
      if (coords.longitude < -180 || coords.longitude > 180) {
        throw new Error('Invalid longitude: must be between -180 and 180');
      }

      // Validate zoom level
      if (initialZoom < 1 || initialZoom > 18) {
        console.warn(`Invalid zoom level ${initialZoom}, using default zoom 2`);
        initialZoom = 2;
      }

      // Initialize the map
      this.map = L.map(containerId, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true
      }).setView([coords.latitude, coords.longitude], initialZoom);

      // Add OpenStreetMap tile layer with error handling
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        minZoom: 1,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });

      tileLayer.on('tileerror', (error: any) => {
        console.warn('Map tile loading error:', error);
      });

      tileLayer.addTo(this.map);

      // Add error handling for map events
      this.map.on('error', (error: any) => {
        console.error('Map error:', error);
      });

      return this.map;
    } catch (error) {
      console.error('Failed to initialize map:', error);
      throw new Error(`Map initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add or update a pin at the specified coordinates
   * @param coordinates - The coordinates where to place the pin
   * @param options - Optional pin customization options
   * @returns The created marker
   */
  addPin(coordinates: Coordinates, options?: PinOptions): L.Marker {
    try {
      if (!this.map) {
        throw new Error('Map must be initialized before adding pins');
      }

      // Validate coordinates
      if (!coordinates || typeof coordinates !== 'object') {
        throw new Error('Invalid coordinates provided');
      }
      if (coordinates.latitude < -90 || coordinates.latitude > 90) {
        throw new Error('Invalid latitude: must be between -90 and 90');
      }
      if (coordinates.longitude < -180 || coordinates.longitude > 180) {
        throw new Error('Invalid longitude: must be between -180 and 180');
      }

      // Remove existing pin if it exists
      if (this.currentPin) {
        try {
          this.map.removeLayer(this.currentPin);
        } catch (error) {
          console.warn('Error removing existing pin:', error);
        }
      }

      // Create marker options with custom icon if color is specified
      const markerOptions: L.MarkerOptions = {};
      if (options?.icon) {
        markerOptions.icon = options.icon;
      } else if (options?.color) {
        try {
          markerOptions.icon = this.createColoredIcon(options.color);
        } catch (error) {
          console.warn('Error creating colored icon, using default:', error);
        }
      }

      // Add title and alt attributes if provided
      if (options?.title) {
        markerOptions.title = options.title;
      }
      if (options?.alt) {
        markerOptions.alt = options.alt;
      }

      // Create new pin
      this.currentPin = L.marker([coordinates.latitude, coordinates.longitude], markerOptions)
        .addTo(this.map);

      // Add label if provided
      if (options?.label) {
        try {
          this.currentPin.bindPopup(options.label);
        } catch (error) {
          console.warn('Error binding popup to marker:', error);
        }
      }

      return this.currentPin;
    } catch (error) {
      console.error('Failed to add pin to map:', error);
      throw new Error(`Pin creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove the current pin from the map
   */
  removePin(): void {
    if (this.currentPin && this.map) {
      this.map.removeLayer(this.currentPin);
      this.currentPin = null;
    }
  }

  /**
   * Get the current pin coordinates
   * @returns The coordinates of the current pin, or null if no pin exists
   */
  getPinCoordinates(): Coordinates | null {
    if (!this.currentPin) {
      return null;
    }

    const latLng = this.currentPin.getLatLng();
    return {
      latitude: latLng.lat,
      longitude: latLng.lng
    };
  }

  /**
   * Set the map view to specific coordinates and zoom level
   * @param coordinates - The coordinates to center the map on
   * @param zoom - The zoom level
   */
  setMapView(coordinates: Coordinates, zoom: number): void {
    if (!this.map) {
      throw new Error('Map must be initialized before setting view');
    }

    this.map.setView([coordinates.latitude, coordinates.longitude], zoom);
  }

  /**
   * Enable click handling on the map to place pins
   * @param callback - Function to call when map is clicked with the clicked coordinates
   */
  enableClickToPlace(callback: (coordinates: Coordinates) => void): void {
    if (!this.map) {
      throw new Error('Map must be initialized before enabling click handling');
    }

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      const coordinates: Coordinates = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      };
      callback(coordinates);
    });
  }

  /**
   * Disable click handling on the map
   */
  disableClickToPlace(): void {
    if (this.map) {
      this.map.off('click');
    }
  }

  /**
   * Calculate the distance between two coordinates using the Haversine formula
   * @param point1 - First coordinate point
   * @param point2 - Second coordinate point
   * @returns Distance in kilometers
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers

    const lat1Rad = this.toRadians(point1.latitude);
    const lat2Rad = this.toRadians(point2.latitude);
    const deltaLatRad = this.toRadians(point2.latitude - point1.latitude);
    const deltaLngRad = this.toRadians(point2.longitude - point1.longitude);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get the current map bounds
   * @returns The current map bounds or null if map is not initialized
   */
  getMapBounds(): L.LatLngBounds | null {
    if (!this.map) {
      return null;
    }
    return this.map.getBounds();
  }

  /**
   * Fit the map view to show multiple coordinate points
   * @param coordinates - Array of coordinate points or single coordinate pair
   * @param padding - Optional padding around the bounds
   */
  fitBounds(coordinates: Coordinates[] | [Coordinates, Coordinates], padding?: L.FitBoundsOptions): void {
    if (!this.map) {
      throw new Error('Map must be initialized before fitting bounds');
    }

    const coordArray = Array.isArray(coordinates[0]) ? coordinates as [Coordinates, Coordinates] : coordinates as Coordinates[];

    const latLngs = coordArray.map(coord => [coord.latitude, coord.longitude] as [number, number]);
    const bounds = L.latLngBounds(latLngs);

    this.map.fitBounds(bounds, padding || { padding: [20, 20] });
  }

  /**
   * Add multiple pins to the map (for results display)
   * @param coordinates - The coordinates for the additional pin
   * @param options - Optional pin customization options
   * @returns The created marker
   */
  addAdditionalPin(coordinates: Coordinates, options?: PinOptions): L.Marker {
    if (!this.map) {
      throw new Error('Map must be initialized before adding pins');
    }

    // Create marker options with custom icon if color is specified
    const markerOptions: L.MarkerOptions = {};
    if (options?.icon) {
      markerOptions.icon = options.icon;
    } else if (options?.color) {
      markerOptions.icon = this.createColoredIcon(options.color);
    }

    // Add title and alt attributes if provided
    if (options?.title) {
      markerOptions.title = options.title;
    }
    if (options?.alt) {
      markerOptions.alt = options.alt;
    }

    const marker = L.marker([coordinates.latitude, coordinates.longitude], markerOptions)
      .addTo(this.map);

    // Add label if provided
    if (options?.label) {
      marker.bindPopup(options.label);
    }

    // Keep track of additional markers
    this.markers.push(marker);

    return marker;
  }

  /**
   * Clear all additional markers from the map
   */
  clearAdditionalMarkers(): void {
    if (this.map) {
      this.markers.forEach(marker => {
        this.map!.removeLayer(marker);
      });
      this.markers = [];
    }
  }

  /**
   * Clean up the map instance and remove all event listeners
   */
  destroy(): void {
    if (this.map) {
      this.clearAdditionalMarkers();
      this.map.remove();
      this.map = null;
      this.currentPin = null;
    }
  }

  /**
   * Create a colored icon for map markers
   * @param color - The color for the icon (red, green, blue, etc.)
   * @returns A Leaflet icon with the specified color
   */
  private createColoredIcon(color: string): L.Icon {
    return L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  /**
   * Convert degrees to radians
   * @param degrees - Angle in degrees
   * @returns Angle in radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}