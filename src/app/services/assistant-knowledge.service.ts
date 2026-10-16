import { Injectable, signal } from '@angular/core';
import { API_URLS } from '../constants/urls';
import { ListingItem, ListingService } from './listing.service';
import { SERVICEABLE_CITIES, UserArea } from './location.service';
import { toTitleCase } from '../constants/listing-display';

// Listing modules the assistant also reads when the API publishes them. Today
// only `product` is public; these return MODULE_NOT_FOUND and are skipped, so
// once they go live the assistant picks them up with no code change.
const EXTRA_MODULES = ['location-data', 'store-location', 'faq'];

// Fields that only matter to the back office; dropping them keeps the prompt
// (and so every Gemini request) small.
const PROMPT_SKIP_FIELDS = new Set(['id', 'companyId', 'status', 'createdAt', 'updatedAt', 'version', 'productImages']);

// Facts the site already states (checkout page); the assistant may repeat them.
const SITE_POLICIES = [
  'MyGenie connects customers with verified professionals for home appliance repair, installation and servicing.',
  'Prices shown are per service and include all taxes and charges; there are no separate fees.',
  'To book: open a service page, add services to the cart, then log in or sign up with your phone number at checkout and pay.',
  'Free cancellation if cancelled more than 12 hours before the service; a fee is charged otherwise. The full cancellation policy is coming soon.',
  'You can add a tip at checkout; 100% of the tip goes to the professional.',
  'Booking needs your location to be in a serviceable city; outside those you can browse but not book.',
  'For anything else, use "Contact us" in the site footer.',
];

export interface ExtraModule {
  moduleCode: string;
  records: Record<string, unknown>[];
}

/** What the visitor's location looks like right now, for the prompt. */
export interface VisitorLocation {
  area: UserArea | null;
  serviceable: boolean | null; // null = not known yet / location off
}

export interface ServiceGroup {
  key: string; // "<category code>/<group code>"
  label: string;
  category: string;
  route: string[];
}

/**
 * Loads everything the AI assistant may talk about, once, when the app starts.
 * Products come from ListingService, so the request is shared with search and
 * the listing pages rather than made twice.
 */
@Injectable({
  providedIn: 'root'
})
export class AssistantKnowledgeService {
  private pending: Promise<void> | null = null;

  readonly items = signal<ListingItem[]>([]);
  readonly extras = signal<ExtraModule[]>([]);
  readonly ready = signal(false);
  readonly failed = signal(false);

  constructor(private listingService: ListingService) {}

  preload(): Promise<void> {
    if (this.pending) return this.pending;

    this.pending = Promise.all([
      this.listingService.getListing('product'),
      Promise.all(EXTRA_MODULES.map((code) => this.loadExtra(code))),
    ]).then(([listing, extras]) => {
      if (!listing) {
        // Let the next call retry instead of caching the failure.
        this.pending = null;
        this.failed.set(true);
        return;
      }
      this.items.set(listing.data.filter((item) => item.category && item.group));
      this.extras.set(extras.filter((e): e is ExtraModule => !!e && e.records.length > 0));
      this.failed.set(false);
      this.ready.set(true);
    });

    return this.pending;
  }

  itemById(id: string): ListingItem | undefined {
    return this.items().find((item) => item.id === id);
  }

  groupByKey(key: string): ServiceGroup | undefined {
    const [categoryCode, groupCode] = key.split('/');
    const item = this.items().find((i) => i.category.code === categoryCode && i.group.code === groupCode);
    if (!item) return undefined;
    return {
      key,
      label: toTitleCase(item.group.label),
      category: toTitleCase(item.category.label),
      route: ['/services', categoryCode, groupCode],
    };
  }

  // Everything the model is allowed to know, as compact plain text. The
  // system prompt tells it to answer from this and nothing else.
  buildContext(location: VisitorLocation): string {
    const where = location.area
      ? `${location.area.label}${location.area.state ? `, ${location.area.state}` : ''}`
      : 'unknown (location not shared)';
    const status =
      location.serviceable === true
        ? 'serviceable, booking available'
        : location.serviceable === false
          ? 'NOT serviceable, browse only, booking unavailable'
          : 'unknown';

    const sections = [
      '## Locations',
      `Serviceable cities: ${SERVICEABLE_CITIES.join(', ')}.`,
      `Visitor's detected location: ${where} (${status}).`,
      '',
      '## Policies',
      ...SITE_POLICIES,
      '',
      '## Services (id | category/group key | category | group | service | price | tag | details)',
      ...this.items().map((item) => this.itemLine(item)),
    ];

    for (const extra of this.extras()) {
      sections.push('', `## ${extra.moduleCode}`);
      sections.push(...extra.records.map((r) => this.compactRecord(r)));
    }

    return sections.join('\n');
  }

  private itemLine(item: ListingItem): string {
    const name = toTitleCase(item.name);
    const description = item.description && item.description.trim().toLowerCase() !== item.name.trim().toLowerCase()
      ? item.description
      : '';
    const shown = new Set(['name', 'description', 'category', 'group', 'unitPrice', 'tags']);
    const details = this.compactRecord(item as unknown as Record<string, unknown>, shown);
    return [
      item.id,
      `${item.category.code}/${item.group.code}`,
      toTitleCase(item.category.label),
      toTitleCase(item.group.label),
      name,
      `₹${item.unitPrice}`,
      item.tags?.label ?? '',
      [description, details].filter(Boolean).join(' '),
    ].join(' | ');
  }

  // key=value pairs for every filled-in field, with lookup objects reduced to
  // their label and *Id foreign keys dropped.
  private compactRecord(record: Record<string, unknown>, skip = new Set<string>()): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      if (skip.has(key) || PROMPT_SKIP_FIELDS.has(key) || /Id$/.test(key)) continue;
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
      const text =
        typeof value === 'object' && value && 'label' in value
          ? String((value as { label: unknown }).label)
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      parts.push(`${key}=${text}`);
    }
    return parts.join('; ');
  }

  private async loadExtra(moduleCode: string): Promise<ExtraModule | null> {
    try {
      const res = await fetch(API_URLS.PUBLIC_LISTING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleCode }),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { success: boolean; data: unknown };
      if (!body.success || !Array.isArray(body.data)) return null;
      return { moduleCode, records: body.data as Record<string, unknown>[] };
    } catch {
      return null;
    }
  }
}
