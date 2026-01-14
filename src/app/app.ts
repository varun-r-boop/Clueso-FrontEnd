import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TimelineComponent } from './timeline/timeline.component';
import { Element } from './timeline/types';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TimelineComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('fe-int-clueso');
  
  // Generate sample data with 10,000+ elements
  protected readonly timelineElements: Element[] = this.generateSampleElements(10000);

  private generateSampleElements(count: number): Element[] {
    const elements: Element[] = [];
    const baseTime = 0;
    const maxTime = 100000; // 100k time units
    const minDuration = 2;
    const maxDuration = 1000;

    // for (let i = 0; i < count; i++) {
    //   const startTime = Math.random() * (maxTime - maxDuration);
    //   const duration = minDuration + Math.random() * (maxDuration - minDuration);
    //   const endTime = startTime + duration;

    //   elements.push({
    //     id: `element-${i}`,
    //     startTime,
    //     endTime
    //   });
    // }
    elements.push({
      id: `element-0`,
      startTime: 1,
      endTime: 5
    });
    elements.push({
      id: `element-1`,
      startTime: 3,
      endTime: 7
    });
    elements.push({
      id: `element-2`,
      startTime: 5,
      endTime: 7
    });
    elements.push({
      id: `element-3`,
      startTime: 1,
      endTime: 5
    });
    elements.push({
      id: `element-4`,
      startTime: 1,
      endTime: 4
    });
    elements.push({
      id: `element-5`,
      startTime: 1,
      endTime: 2
    });
    elements.push({
      id: `element-6`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-7`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-8`,
      startTime: 7,
      endTime: 2
    });
    elements.push({
      id: `element-9`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-10`,
      startTime: 1,
      endTime: 2
    });
    elements.push({
      id: `element-11`,
      startTime: 1,
      endTime: 4
    });
    elements.push({
      id: `element-12`,
      startTime: 2,
      endTime: 5
    });
    elements.push({
      id: `element-4`,
      startTime: 1,
      endTime: 4
    });
    elements.push({
      id: `element-5`,
      startTime: 1,
      endTime: 2
    });
    elements.push({
      id: `element-6`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-7`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-8`,
      startTime: 7,
      endTime: 2
    });
    elements.push({
      id: `element-9`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-10`,
      startTime: 1,
      endTime: 2
    });
    elements.push({
      id: `element-11`,
      startTime: 1,
      endTime: 4
    });
    elements.push({
      id: `element-12`,
      startTime: 2,
      endTime: 5
    });
    elements.push({
      id: `element-4`,
      startTime: 1,
      endTime: 4
    });
    elements.push({
      id: `element-5`,
      startTime: 1,
      endTime: 2
    });
    elements.push({
      id: `element-6`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-7`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-8`,
      startTime: 7,
      endTime: 2
    });
    elements.push({
      id: `element-9`,
      startTime: 1,
      endTime: 3
    });
    elements.push({
      id: `element-10`,
      startTime: 1,
      endTime: 2
    });
    elements.push({
      id: `element-11`,
      startTime: 1,
      endTime: 4
    });
    elements.push({
      id: `element-12`,
      startTime: 2,
      endTime: 5
    });
    return elements;
  }
}
