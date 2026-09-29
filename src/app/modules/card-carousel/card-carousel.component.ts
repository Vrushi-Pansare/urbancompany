import { Component, ContentChild, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

const AUTOPLAY_MS = 4000;
const SWIPE_THRESHOLD_PX = 40;

/**
 * Centered, looping card carousel: active card in front, neighbours faded at the sides.
 * Card content comes from the projected template, which receives the item and whether it is active:
 *   <app-card-carousel [items]="list" heading="...">
 *     <ng-template let-item let-active="active">...</ng-template>
 *   </app-card-carousel>
 */
@Component({
  selector: 'app-card-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-carousel.component.html',
  styleUrl: './card-carousel.component.scss'
})
export class CardCarouselComponent implements OnInit, OnDestroy {
  @Input() items: unknown[] = [];
  @Input() heading = '';
  @Input() subheading = '';
  @Input() sectionId?: string;
  @ContentChild(TemplateRef) cardTemplate?: TemplateRef<unknown>;

  active = 0;

  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;
  private swipeStartX: number | null = null;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  /** Position of a card relative to the active one, wrapped so the carousel loops (-1 left, 0 center, 1 right) */
  offset(index: number): number {
    const count = this.items.length;
    let diff = (index - this.active + count) % count;
    if (diff > count / 2) diff -= count;
    return diff;
  }

  goTo(index: number): void {
    const count = this.items.length;
    this.active = (index + count) % count;
    this.restartAutoplay();
  }

  next(): void {
    this.goTo(this.active + 1);
  }

  prev(): void {
    this.goTo(this.active - 1);
  }

  onCardClick(index: number): void {
    if (index !== this.active) this.goTo(index);
  }

  // Pause while the visitor is reading / interacting
  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  onPointerDown(event: PointerEvent): void {
    this.swipeStartX = event.clientX;
  }

  onPointerUp(event: PointerEvent): void {
    if (this.swipeStartX === null) return;
    const delta = event.clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) this.next();
    else this.prev();
  }

  private startAutoplay(): void {
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || this.timer) return;
    this.timer = setInterval(() => {
      if (!this.paused && this.items.length > 1) {
        this.active = (this.active + 1) % this.items.length;
      }
    }, AUTOPLAY_MS);
  }

  private stopAutoplay(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** A manual move restarts the countdown so the next auto-advance isn't immediate */
  private restartAutoplay(): void {
    if (!this.timer) return;
    this.stopAutoplay();
    this.startAutoplay();
  }
}
