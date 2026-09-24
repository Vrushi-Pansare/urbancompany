import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ListingItem, ListingService } from '../../services/listing.service';
import { ServiceIconComponent } from '../service-icon/service-icon.component';
import { byLabel, groupImage, productImage, toTitleCase } from '../../constants/listing-display';

interface SiblingGroup {
  code: string;
  name: string;
  image?: string;
}

interface ServiceRow {
  id: string;
  title: string;
  note?: string;
  price: number;
  image?: string;
}

@Component({
  selector: 'app-service-listing',
  standalone: true,
  imports: [CommonModule, RouterLink, ServiceIconComponent],
  templateUrl: './service-listing.component.html',
  styleUrl: './service-listing.component.scss'
})
export class ServiceListingComponent implements OnInit, OnDestroy {
  isLoading = true;
  notFound = false;

  categoryCode = '';
  categoryName = '';
  groupCode = '';
  groupName = '';
  groupImage?: string;

  siblings: SiblingGroup[] = [];
  services: ServiceRow[] = [];

  // In-page cart, kept while switching groups — not persisted yet
  cart = new Map<string, { service: ServiceRow; qty: number }>();

  highlightedId: string | null = null;
  private highlightTimer?: ReturnType<typeof setTimeout>;

  private listing: ListingItem[] = [];
  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listingService: ListingService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.route.paramMap.subscribe(async (params) => {
        this.categoryCode = params.get('category') ?? '';
        this.groupCode = params.get('group') ?? '';

        if (!this.listing.length) {
          this.isLoading = true;
          const response = await this.listingService.getListing('product');
          this.listing = response?.data ?? [];
        }
        this.buildPage();
        this.isLoading = false;
        this.highlightFromQuery();
      })
    );
    // Search results link to a specific service via ?service=<id>
    this.sub.add(this.route.queryParamMap.subscribe(() => this.highlightFromQuery()));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    clearTimeout(this.highlightTimer);
  }

  /** Scroll to and briefly highlight the service picked in search */
  private highlightFromQuery(): void {
    const id = this.route.snapshot.queryParamMap.get('service');
    if (!id || this.isLoading || !this.services.some((s) => s.id === id)) return;
    clearTimeout(this.highlightTimer);
    this.highlightedId = id;
    // Wait for the list to render (and the router's scroll-to-top) before scrolling
    setTimeout(() => document.getElementById(`svc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    this.highlightTimer = setTimeout(() => (this.highlightedId = null), 2600);
  }

  get cartRows(): { service: ServiceRow; qty: number }[] {
    return [...this.cart.values()];
  }

  get cartCount(): number {
    return this.cartRows.reduce((sum, row) => sum + row.qty, 0);
  }

  get cartTotal(): number {
    return this.cartRows.reduce((sum, row) => sum + row.service.price * row.qty, 0);
  }

  qty(id: string): number {
    return this.cart.get(id)?.qty ?? 0;
  }

  add(service: ServiceRow): void {
    this.cart.set(service.id, { service, qty: this.qty(service.id) + 1 });
  }

  remove(service: ServiceRow): void {
    const next = this.qty(service.id) - 1;
    if (next > 0) this.cart.set(service.id, { service, qty: next });
    else this.cart.delete(service.id);
  }

  formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  private buildPage(): void {
    const inCategory = this.listing.filter((item) => item.category?.code === this.categoryCode);
    const inGroup = inCategory.filter((item) => item.group?.code === this.groupCode);

    this.notFound = !inGroup.length;
    if (this.notFound) return;

    const { category, group } = inGroup[0];
    this.categoryName = toTitleCase(category.label);
    this.groupName = toTitleCase(group.label);
    this.groupImage = groupImage(inGroup, group.code);

    // Other groups in the same category for "Select a service"
    const unique = new Map<string, ListingItem['group']>();
    inCategory.forEach((item) => {
      if (item.group && !unique.has(item.group.code)) unique.set(item.group.code, item.group);
    });
    this.siblings = [...unique.values()].sort(byLabel).map((g) => ({
      code: g.code,
      name: toTitleCase(g.label),
      image: groupImage(inCategory, g.code),
    }));

    // Services / products in this group, keeping API order
    this.services = inGroup.map((item) => {
      const title = toTitleCase(item.name);
      const description = toTitleCase(item.description || '');
      // Descriptions are often just "GROUP - NAME"; only show one that adds information
      const isRedundant = !description || description === title || description === `${this.groupName} - ${title}`;
      return {
        id: item.id,
        title,
        note: isRedundant ? undefined : description,
        price: item.unitPrice,
        image: productImage(item),
      };
    });
  }
}
