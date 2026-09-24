import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchResult, SearchResults, SearchService } from '../../services/search.service';
import { ServiceIconComponent } from '../service-icon/service-icon.component';

/**
 * Service search.
 *  - mode "inline":  header search box with a results dropdown (desktop)
 *  - mode "overlay": full-screen search page opened by the parent via [open] (mobile)
 */
@Component({
  selector: 'app-service-search',
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceIconComponent],
  templateUrl: './service-search.component.html',
  styleUrl: './service-search.component.scss'
})
export class ServiceSearchComponent implements OnChanges, OnDestroy {
  @Input() mode: 'inline' | 'overlay' = 'inline';
  @Input() placeholder = 'Search for services';
  @Input() open = false; // overlay mode only
  @Output() closed = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  query = '';
  results: SearchResults = { categories: [], groups: [], services: [] };
  activeIndex = -1;
  isPanelOpen = false; // inline mode dropdown
  isLoading = false;

  constructor(
    private searchService: SearchService,
    private router: Router,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.mode === 'overlay' && changes['open']) {
      document.body.style.overflow = this.open ? 'hidden' : '';
      if (this.open) {
        this.prepare();
        setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.mode === 'overlay') document.body.style.overflow = '';
  }

  get isEmptyQuery(): boolean {
    return !this.query.trim();
  }

  get hasResults(): boolean {
    const r = this.results;
    return r.categories.length + r.groups.length + r.services.length > 0;
  }

  /** Results in display order, for keyboard navigation */
  get flatResults(): SearchResult[] {
    return [...this.results.services, ...this.results.groups, ...this.results.categories];
  }

  indexOf(result: SearchResult): number {
    return this.flatResults.indexOf(result);
  }

  async onFocus(): Promise<void> {
    this.isPanelOpen = true;
    await this.prepare();
  }

  onQueryChange(): void {
    this.activeIndex = -1;
    this.updateResults();
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.flatResults.length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % count;
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + count) % count;
    } else if (event.key === 'Enter') {
      const target = this.flatResults[this.activeIndex] ?? (this.isEmptyQuery ? undefined : this.flatResults[0]);
      if (target) {
        event.preventDefault();
        this.select(target);
      }
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  select(result: SearchResult): void {
    this.router.navigate(result.route, { queryParams: result.queryParams });
    this.query = '';
    this.close();
  }

  clear(): void {
    this.query = '';
    this.onQueryChange();
    this.searchInput?.nativeElement.focus();
  }

  close(): void {
    this.isPanelOpen = false;
    this.activeIndex = -1;
    this.searchInput?.nativeElement.blur();
    if (this.mode === 'overlay') this.closed.emit();
  }

  // Inline dropdown closes when clicking anywhere outside the search box
  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (this.mode === 'inline' && this.isPanelOpen && !this.host.nativeElement.contains(event.target as Node)) {
      this.isPanelOpen = false;
      this.activeIndex = -1;
    }
  }

  private async prepare(): Promise<void> {
    this.isLoading = true;
    await this.searchService.ensureIndex();
    this.isLoading = false;
    this.updateResults();
  }

  private updateResults(): void {
    this.results = this.isEmptyQuery ? this.searchService.suggestions() : this.searchService.search(this.query);
  }
}
