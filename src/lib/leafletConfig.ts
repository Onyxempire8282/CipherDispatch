/**
 * Leaflet Configuration - Disable VML, Force SVG
 *
 * This file MUST be imported before any Leaflet/react-leaflet usage.
 * Fixes: TypeError: Cannot read properties of undefined (reading 'add')
 * Caused by: Leaflet VML renderer incorrectly activating in modern browsers
 */

import L from 'leaflet';

// Hard-disable VML - it's only for IE6-8 which we don't support
L.Browser.vml = false;

// Ensure SVG is detected (should be true in all modern browsers)
if (!L.Browser.svg) {
  console.warn('Leaflet: SVG not detected, forcing Canvas renderer');
}

// Export a pre-configured SVG renderer for explicit use
export const svgRenderer = L.svg();

// Export canvas as fallback
export const canvasRenderer = L.canvas();

// Default renderer preference: SVG > Canvas
export const defaultRenderer = L.Browser.svg ? svgRenderer : canvasRenderer;
