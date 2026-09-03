import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SpaceCard {
  id: string;
  image: string;
  alt: string;
}

interface NeedCard {
  id: string;
  image: string;
  alt: string;
}

@Component({
  selector: 'app-wall-panels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wall-panels.component.html',
  styleUrl: './wall-panels.component.scss'
})
export class WallPanelsComponent implements OnInit, AfterViewInit {
  @ViewChild('desktopSpacesTrack') desktopSpacesTrack?: ElementRef<HTMLElement>;
  @ViewChild('desktopNeedsTrack') desktopNeedsTrack?: ElementRef<HTMLElement>;

  // Explore by Space (5 Cards)
  spaces: SpaceCard[] = [
    {
      id: 'space-0',
      image: 'assets/wall-panels/space-1.jpeg',
      alt: 'Urban Company Banner 0'
    },
    {
      id: 'space-1',
      image: 'assets/wall-panels/space-2.jpeg',
      alt: 'Urban Company Banner 1'
    },
    {
      id: 'space-2',
      image: 'assets/wall-panels/space-3.jpeg',
      alt: 'Urban Company Banner 2'
    },
    {
      id: 'space-3',
      image: 'assets/wall-panels/space-4.jpeg',
      alt: 'Urban Company Banner 3'
    },
    {
      id: 'space-4',
      image: 'assets/wall-panels/space-5.jpeg',
      alt: 'Urban Company Banner 4'
    }
  ];

  // Beautiful walls for all your needs (4 Cards)
  needs: NeedCard[] = [
    {
      id: 'need-0',
      image: 'assets/wall-panels/need-1.jpeg',
      alt: 'Urban Company Banner 0'
    },
    {
      id: 'need-1',
      image: 'assets/wall-panels/need-2.jpeg',
      alt: 'Urban Company Banner 1'
    },
    {
      id: 'need-2',
      image: 'assets/wall-panels/need-3.jpeg',
      alt: 'Urban Company Banner 2'
    },
    {
      id: 'need-3',
      image: 'assets/wall-panels/need-4.jpeg',
      alt: 'Urban Company Banner 3'
    }
  ];

  scrollProgress: number = 0;

  // Spaces Carousel Scroll Controls
  canScrollLeft: boolean = false;
  canScrollRight: boolean = true;
  private isMouseDown: boolean = false;
  private startX: number = 0;
  private startScrollLeft: number = 0;

  // Needs Carousel Scroll Controls
  canScrollNeedsLeft: boolean = false;
  canScrollNeedsRight: boolean = true;
  private isNeedsMouseDown: boolean = false;
  private needsStartX: number = 0;
  private needsStartScrollLeft: number = 0;

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkDesktopScroll();
      this.checkDesktopNeedsScroll();
    }, 200);
  }

  /* Mobile scroll indicator calculation */
  onNeedsScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      this.scrollProgress = Math.min(36, Math.max(0, (el.scrollLeft / maxScroll) * 36));
    }
  }

  /* Desktop Spaces Carousel Methods */
  checkDesktopScroll(): void {
    if (!this.desktopSpacesTrack) return;
    const el = this.desktopSpacesTrack.nativeElement;
    this.canScrollLeft = el.scrollLeft > 10;
    this.canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 10;
  }

  scrollDesktopSpaces(direction: 'left' | 'right'): void {
    if (!this.desktopSpacesTrack) return;
    const el = this.desktopSpacesTrack.nativeElement;
    const scrollAmount = 418 * 2; // card width + gap (394 + 24 = 418)
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    setTimeout(() => this.checkDesktopScroll(), 350);
  }

  onMouseDown(event: MouseEvent): void {
    if (!this.desktopSpacesTrack) return;
    this.isMouseDown = true;
    this.startX = event.pageX - this.desktopSpacesTrack.nativeElement.offsetLeft;
    this.startScrollLeft = this.desktopSpacesTrack.nativeElement.scrollLeft;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isMouseDown || !this.desktopSpacesTrack) return;
    event.preventDefault();
    const x = event.pageX - this.desktopSpacesTrack.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 1.5;
    this.desktopSpacesTrack.nativeElement.scrollLeft = this.startScrollLeft - walk;
    this.checkDesktopScroll();
  }

  onMouseUp(): void {
    this.isMouseDown = false;
  }

  onMouseLeave(): void {
    this.isMouseDown = false;
  }

  /* Desktop Needs Carousel Methods */
  checkDesktopNeedsScroll(): void {
    if (!this.desktopNeedsTrack) return;
    const el = this.desktopNeedsTrack.nativeElement;
    this.canScrollNeedsLeft = el.scrollLeft > 10;
    this.canScrollNeedsRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 10;
  }

  scrollDesktopNeeds(direction: 'left' | 'right'): void {
    if (!this.desktopNeedsTrack) return;
    const el = this.desktopNeedsTrack.nativeElement;
    const scrollAmount = 418 * 2;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    setTimeout(() => this.checkDesktopNeedsScroll(), 350);
  }

  onNeedsMouseDown(event: MouseEvent): void {
    if (!this.desktopNeedsTrack) return;
    this.isNeedsMouseDown = true;
    this.needsStartX = event.pageX - this.desktopNeedsTrack.nativeElement.offsetLeft;
    this.needsStartScrollLeft = this.desktopNeedsTrack.nativeElement.scrollLeft;
  }

  onNeedsMouseMove(event: MouseEvent): void {
    if (!this.isNeedsMouseDown || !this.desktopNeedsTrack) return;
    event.preventDefault();
    const x = event.pageX - this.desktopNeedsTrack.nativeElement.offsetLeft;
    const walk = (x - this.needsStartX) * 1.5;
    this.desktopNeedsTrack.nativeElement.scrollLeft = this.needsStartScrollLeft - walk;
    this.checkDesktopNeedsScroll();
  }

  onNeedsMouseUp(): void {
    this.isNeedsMouseDown = false;
  }

  onNeedsMouseLeave(): void {
    this.isNeedsMouseDown = false;
  }
}
