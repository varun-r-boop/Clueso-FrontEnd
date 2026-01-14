import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy
} from '@angular/core';
import { Element, Viewport, TrackAssignment } from './types';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
  standalone: true
})
export class TimelineComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() elements: Element[] = [];

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private viewport: Viewport = {
    timeStart: 0,
    timeEnd: 10,
    pixelWidth: 0,
    zoomLevel: 1,
    panOffset: 0
  };

  // Interaction state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartPanOffset = 0;
  private hoveredElement: Element | null = null;
  private animationFrameId: number | null = null;
  private resizeHandler: (() => void) | null = null;

  // Track assignments (cached)
  private trackAssignments: TrackAssignment[] = [];
  private sortedElements: Element[] = [];
  
  // Data bounds
  private minTime = 0;
  private maxTime = 0;

  // Constants
  private readonly TRACK_HEIGHT = 35;
  private readonly TRACK_PADDING = 5;
  private readonly BAR_HEIGHT = 25;
  private readonly ZOOM_FACTOR = 1.1;
  private readonly MIN_ZOOM = 0.1;
  private readonly MAX_ZOOM = 100;

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.processElements();
    this.updateViewport();
    this.render();
    this.setupResizeListener();
  }

  private setupResizeListener(): void {
    this.resizeHandler = () => {
      this.initializeCanvas();
      this.render();
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elements'] && !changes['elements'].firstChange) {
      this.processElements();
      this.updateViewport();
      this.render();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      this.viewport.pixelWidth = canvas.width;
    }

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
      this.viewport.pixelWidth = rect.width;
    }
  }

  private processElements(): void {
    if (this.elements.length === 0) {
      this.sortedElements = [];
      this.trackAssignments = [];
      return;
    }

    // Sort elements by startTime
    this.sortedElements = [...this.elements].sort(
      (a, b) => a.startTime - b.startTime
    );

    // Assign tracks - one track per element
    this.trackAssignments = [];

    for (let i = 0; i < this.sortedElements.length; i++) {
      const element = this.sortedElements[i];
      const assignedTrack = i;

      this.trackAssignments.push({
        element,
        trackIndex: assignedTrack,
        pixelX: 0, // Will be calculated during render
        pixelWidth: 0, // Will be calculated during render
        pixelY: assignedTrack * (this.TRACK_HEIGHT + this.TRACK_PADDING) + this.TRACK_PADDING
      });
    }
  }

  private updateViewport(): void {
    if (this.sortedElements.length === 0) {
      this.viewport.timeStart = 0;
      this.viewport.timeEnd = 1000;
      this.minTime = 0;
      this.maxTime = 1000;
      return;
    }

    this.minTime = Math.min(...this.sortedElements.map(e => e.startTime));
    this.maxTime = Math.max(...this.sortedElements.map(e => e.endTime));
    const timeRange = this.maxTime - this.minTime;

    // Add padding only at the start, but limit end to maxTime
    const padding = timeRange * 0.1;
    this.viewport.timeStart = this.minTime - padding;
    this.viewport.timeEnd = this.maxTime; // Don't extend beyond max endTime
  }

  private timeToPixel(time: number): number {
    const timeRange = this.viewport.timeEnd - this.viewport.timeStart;
    if (timeRange === 0) return 0;
    const normalized = (time - this.viewport.timeStart) / timeRange;
    return normalized * this.viewport.pixelWidth + this.viewport.panOffset;
  }

  private pixelToTime(pixelX: number): number {
    const timeRange = this.viewport.timeEnd - this.viewport.timeStart;
    const normalized = (pixelX - this.viewport.panOffset) / this.viewport.pixelWidth;
    return this.viewport.timeStart + normalized * timeRange;
  }

  private getVisibleElements(): TrackAssignment[] {
    if (this.trackAssignments.length === 0) return [];

    const visibleStart = this.pixelToTime(0);
    const visibleEnd = this.pixelToTime(this.viewport.pixelWidth);

    // Binary search for first element that might be visible
    let startIdx = 0;
    let endIdx = this.trackAssignments.length - 1;

    while (startIdx < endIdx) {
      const mid = Math.floor((startIdx + endIdx) / 2);
      if (this.trackAssignments[mid].element.endTime < visibleStart) {
        startIdx = mid + 1;
      } else {
        endIdx = mid;
      }
    }

    // Collect all potentially visible elements
    const visible: TrackAssignment[] = [];
    for (let i = startIdx; i < this.trackAssignments.length; i++) {
      const assignment = this.trackAssignments[i];
      if (assignment.element.startTime > visibleEnd) break;

      // Calculate pixel positions
      assignment.pixelX = this.timeToPixel(assignment.element.startTime);
      assignment.pixelWidth = this.timeToPixel(assignment.element.endTime) - assignment.pixelX;

      // Only include if actually visible
      if (assignment.pixelX + assignment.pixelWidth >= 0 && assignment.pixelX < this.viewport.pixelWidth) {
        visible.push(assignment);
      }
    }

    return visible;
  }

  private render(): void {
    if (!this.ctx || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const width = this.viewport.pixelWidth;
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Get visible elements
    const visibleElements = this.getVisibleElements();

    // Render time axis
    this.renderTimeAxis(width, height);

    // Render elements
    for (const assignment of visibleElements) {
      const isHovered = this.hoveredElement?.id === assignment.element.id;
      this.renderElement(assignment, isHovered);
    }

    // Schedule next frame if needed
    this.animationFrameId = requestAnimationFrame(() => {
      // Only re-render if something changed
    });
  }

  private renderTimeAxis(width: number, height: number): void {
    if (!this.ctx) return;

    const timeRange = this.viewport.timeEnd - this.viewport.timeStart;
    const pixelPerTime = width / timeRange;

    // Determine tick interval based on zoom level
    let tickInterval = 1;
    if (pixelPerTime < 0.1) {
      tickInterval = 1000;
    } else if (pixelPerTime < 1) {
      tickInterval = 100;
    } else if (pixelPerTime < 10) {
      tickInterval = 10;
    } else if (pixelPerTime < 100) {
      tickInterval = 1;
    }

    // Round to nice numbers
    const firstTick = Math.ceil(this.viewport.timeStart / tickInterval) * tickInterval;
    const lastTick = Math.floor(this.viewport.timeEnd / tickInterval) * tickInterval;

    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1;
    this.ctx.font = '12px sans-serif';
    this.ctx.fillStyle = '#666';

    for (let time = firstTick; time <= lastTick; time += tickInterval) {
      const x = this.timeToPixel(time);

      if (x >= 0 && x <= width) {
        // Draw tick line
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();

        // Draw label
        const label = time.toFixed(0);
        const metrics = this.ctx.measureText(label);
        this.ctx.fillText(label, x - metrics.width / 2, 15);
      }
    }
  }

  private renderElement(assignment: TrackAssignment, isHovered: boolean): void {
    if (!this.ctx) return;

    const x = Math.max(0, assignment.pixelX);
    const y = assignment.pixelY;
    const width = Math.min(assignment.pixelWidth, this.viewport.pixelWidth - x);
    const height = this.BAR_HEIGHT;

    // Color based on track index for distinction
    const hue = (assignment.trackIndex * 137.5) % 360;
    const saturation = isHovered ? '80%' : '60%';
    const lightness = isHovered ? '55%' : '50%';
    const color = `hsl(${hue}, ${saturation}, ${lightness})`;

    // Draw bar
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);

    // Draw border if hovered
    if (isHovered) {
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    }

    // Draw text if bar is wide enough
    if (width > 50) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px sans-serif';
      const text = assignment.element.id;
      const metrics = this.ctx.measureText(text);
      if (metrics.width < width - 10) {
        this.ctx.fillText(text, x + 5, y + height / 2 + 4);
      }
    }
  }

  // Mouse event handlers
  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.offsetX;
    this.dragStartPanOffset = this.viewport.panOffset;
    if (this.canvasRef) {
      this.canvasRef.nativeElement.style.cursor = 'grabbing';
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      // Panning
      const deltaX = event.offsetX - this.dragStartX;
      const newPanOffset = this.dragStartPanOffset + deltaX;
      
      // Constrain panning to not go beyond maxTime
      // Calculate what time would be at the right edge with this pan offset
      const rightEdgeTime = this.pixelToTimeWithOffset(this.viewport.pixelWidth, newPanOffset);
      const leftEdgeTime = this.pixelToTimeWithOffset(0, newPanOffset);
      
      // Only allow panning if it doesn't extend beyond maxTime or before minTime (with padding)
      const minAllowedStart = this.minTime - (this.maxTime - this.minTime) * 0.1;
      if (rightEdgeTime <= this.maxTime && leftEdgeTime >= minAllowedStart) {
        this.viewport.panOffset = newPanOffset;
      }
      
      this.render();
    } else {
      // Hover detection
      this.detectHover(event.offsetX, event.offsetY);
    }
  }
  
  private pixelToTimeWithOffset(pixelX: number, panOffset: number): number {
    const timeRange = this.viewport.timeEnd - this.viewport.timeStart;
    const normalized = (pixelX - panOffset) / this.viewport.pixelWidth;
    return this.viewport.timeStart + normalized * timeRange;
  }

  onMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.canvasRef) {
        this.canvasRef.nativeElement.style.cursor = 'grab';
      }
    }
  }

  onMouseLeave(): void {
    this.isDragging = false;
    this.hoveredElement = null;
    if (this.canvasRef) {
      this.canvasRef.nativeElement.style.cursor = 'default';
    }
    this.render();
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();

    const mouseX = event.offsetX;
    const mouseTime = this.pixelToTime(mouseX);

    // Calculate zoom
    const zoomDelta = event.deltaY > 0 ? 1 / this.ZOOM_FACTOR : this.ZOOM_FACTOR;
    const newZoom = this.viewport.zoomLevel * zoomDelta;
    this.viewport.zoomLevel = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newZoom));

    // Calculate new time range (smaller range = more zoomed in)
    const timeRange = this.viewport.timeEnd - this.viewport.timeStart;
    const newTimeRange = timeRange / zoomDelta;

    // Center zoom around mouse position
    const mouseTimeRatio = (mouseTime - this.viewport.timeStart) / timeRange;
    this.viewport.timeStart = mouseTime - newTimeRange * mouseTimeRatio;
    this.viewport.timeEnd = this.viewport.timeStart + newTimeRange;

    // Constrain to data bounds - don't extend beyond maxTime
    if (this.viewport.timeEnd > this.maxTime) {
      const overflow = this.viewport.timeEnd - this.maxTime;
      this.viewport.timeEnd = this.maxTime;
      this.viewport.timeStart = Math.max(this.minTime - (this.maxTime - this.minTime) * 0.1, this.viewport.timeStart - overflow);
    }
    
    // Don't go before minTime (with padding)
    const minAllowedStart = this.minTime - (this.maxTime - this.minTime) * 0.1;
    if (this.viewport.timeStart < minAllowedStart) {
      const underflow = minAllowedStart - this.viewport.timeStart;
      this.viewport.timeStart = minAllowedStart;
      this.viewport.timeEnd = Math.min(this.maxTime, this.viewport.timeEnd + underflow);
    }

    // Reset pan offset since we're changing the time range
    this.viewport.panOffset = 0;

    this.render();
  }

  onClick(event: MouseEvent): void {
    if (this.isDragging) return; // Don't trigger click if we were dragging

    const element = this.findElementAt(event.offsetX, event.offsetY);
    if (element) {
      console.log('Element clicked:', {
        id: element.id,
        startTime: element.startTime,
        endTime: element.endTime
      });
    }
  }

  private detectHover(mouseX: number, mouseY: number): void {
    const element = this.findElementAt(mouseX, mouseY);
    if (element !== this.hoveredElement) {
      this.hoveredElement = element;
      if (this.canvasRef) {
        this.canvasRef.nativeElement.style.cursor = element ? 'pointer' : 'default';
      }
      this.render();
    }
  }

  private findElementAt(mouseX: number, mouseY: number): Element | null {
    const mouseTime = this.pixelToTime(mouseX);

    // Binary search for potential elements
    let startIdx = 0;
    let endIdx = this.trackAssignments.length - 1;

    while (startIdx <= endIdx) {
      const mid = Math.floor((startIdx + endIdx) / 2);
      const assignment = this.trackAssignments[mid];

      if (mouseTime < assignment.element.startTime) {
        endIdx = mid - 1;
      } else if (mouseTime > assignment.element.endTime) {
        startIdx = mid + 1;
      } else {
        // Check if mouse is within track bounds
        const trackY = assignment.pixelY;
        const trackBottom = trackY + this.BAR_HEIGHT;

        if (mouseY >= trackY && mouseY <= trackBottom) {
          return assignment.element;
        }

        // Check nearby tracks
        for (let i = mid - 1; i >= 0 && this.trackAssignments[i].element.endTime >= mouseTime; i--) {
          const nearby = this.trackAssignments[i];
          if (mouseY >= nearby.pixelY && mouseY <= nearby.pixelY + this.BAR_HEIGHT) {
            return nearby.element;
          }
        }

        for (let i = mid + 1; i < this.trackAssignments.length && this.trackAssignments[i].element.startTime <= mouseTime; i++) {
          const nearby = this.trackAssignments[i];
          if (mouseY >= nearby.pixelY && mouseY <= nearby.pixelY + this.BAR_HEIGHT) {
            return nearby.element;
          }
        }

        return null;
      }
    }

    return null;
  }
}
