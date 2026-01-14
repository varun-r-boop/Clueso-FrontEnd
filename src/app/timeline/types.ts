export interface Element {
  id: string;
  startTime: number;
  endTime: number;
}

export interface Viewport {
  timeStart: number; // Start time in viewport
  timeEnd: number; // End time in viewport
  pixelWidth: number; // Canvas width in pixels
  zoomLevel: number; // Current zoom multiplier
  panOffset: number; // Horizontal pan offset
}

export interface TrackAssignment {
  element: Element;
  trackIndex: number;
  pixelX: number;
  pixelWidth: number;
  pixelY: number;
}
