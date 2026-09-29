import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceIconComponent } from '../service-icon/service-icon.component';

export interface DialogCategory {
  code: string;
  name: string;
}

export interface DialogGroup {
  id: string;
  code: string;
  name: string;
  image?: string;
}

/** Tiles shown before the "+N More" tile */
const COLLAPSED_COUNT = 5;

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [CommonModule, ServiceIconComponent],
  templateUrl: './category-dialog.component.html',
  styleUrl: './category-dialog.component.scss'
})
export class CategoryDialogComponent implements OnChanges, OnDestroy {
  @Input() category: DialogCategory | null = null;
  @Input() groups: DialogGroup[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() groupSelected = new EventEmitter<DialogGroup>();

  showAll = false;

  ngOnChanges(): void {
    // Start collapsed each time a category opens; lock page scroll while open
    this.showAll = false;
    document.body.style.overflow = this.category ? 'hidden' : '';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  /** Collapse only when it saves at least two tiles (a lone "+1" tile is pointless) */
  get isCollapsed(): boolean {
    return !this.showAll && this.groups.length > COLLAPSED_COUNT + 1;
  }

  get visibleGroups(): DialogGroup[] {
    return this.isCollapsed ? this.groups.slice(0, COLLAPSED_COUNT) : this.groups;
  }

  get hiddenCount(): number {
    return this.groups.length - COLLAPSED_COUNT;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.category) this.close();
  }

  close(): void {
    this.closed.emit();
  }
}
