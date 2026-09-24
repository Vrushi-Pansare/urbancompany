import { Injectable } from '@angular/core';
import { ListingItem, ListingService } from './listing.service';
import { LISTING_CATEGORY_IMAGES, byLabel, groupImage, productImage, toTitleCase } from '../constants/listing-display';

export type SearchResultType = 'category' | 'group' | 'service';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  categoryCode: string; // for the fallback icon
  image?: string;
  price?: string;
  route: string[];
  queryParams?: Record<string, string>;
}

export interface SearchResults {
  categories: SearchResult[];
  groups: SearchResult[];
  services: SearchResult[];
}

interface IndexEntry {
  result: SearchResult;
  title: string; // normalized
  words: string[]; // normalized words of title + group + category + description
}

// Everyday words people type -> words used in the listing data
const SYNONYMS: Record<string, string> = {
  fridge: 'refrigerator',
  freeze: 'freezer',
  purifier: 'ro',
  aquaguard: 'ro',
  television: 'tv',
  washer: 'washing',
  hob: 'cooktop',
  airconditioner: 'air conditioner',
  computer: 'computers',
  pc: 'desktop',
  // The API spells this category "Applainces"
  appliance: 'applainces',
  appliances: 'applainces',
};

const LIMITS = { categories: 3, groups: 5, services: 6 };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Client-side search over the public listing (categories, groups and services) */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private categories: IndexEntry[] = [];
  private groups: IndexEntry[] = [];
  private services: IndexEntry[] = [];
  private suggestionsCache: SearchResults | null = null;
  private ready: Promise<void> | null = null;

  constructor(private listingService: ListingService) {}

  /** Builds the index once (the listing request itself is cached by ListingService) */
  ensureIndex(): Promise<void> {
    if (!this.ready) {
      this.ready = this.listingService.getListing('product').then((response) => {
        this.buildIndex(response?.data ?? []);
        if (!response) this.ready = null; // retry on next focus if the request failed
      });
    }
    return this.ready;
  }

  search(query: string): SearchResults {
    const tokens = normalize(query)
      .split(' ')
      .filter(Boolean)
      .flatMap((token) => (SYNONYMS[token] ?? token).split(' '));
    if (!tokens.length) return { categories: [], groups: [], services: [] };

    const phrase = tokens.join(' ');
    const rank = (entries: IndexEntry[], limit: number) =>
      entries
        // Every token must start some word ("ac" matches "AC", not "machine")
        .filter((entry) => tokens.every((token) => entry.words.some((word) => word.startsWith(token))))
        .map((entry) => ({ entry, score: this.score(entry, phrase, tokens) }))
        .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
        .slice(0, limit)
        .map(({ entry }) => entry.result);

    return {
      categories: rank(this.categories, LIMITS.categories),
      groups: rank(this.groups, LIMITS.groups),
      services: rank(this.services, LIMITS.services),
    };
  }

  /** Shown before the user types: popular services + all categories */
  suggestions(): SearchResults {
    return this.suggestionsCache ?? { categories: [], groups: [], services: [] };
  }

  private score(entry: IndexEntry, phrase: string, tokens: string[]): number {
    let score = 0;
    if (entry.title.startsWith(phrase)) score += 6;
    else if (entry.title.includes(phrase)) score += 4;
    score += tokens.filter((token) => entry.title.split(' ').some((word) => word.startsWith(token))).length * 2;
    return score;
  }

  private buildIndex(items: ListingItem[]): void {
    const categoryMap = new Map<string, ListingItem['category']>();
    const groupMap = new Map<string, { item: ListingItem; count: number }>();

    items.forEach((item) => {
      if (!item.category || !item.group) return;
      if (!categoryMap.has(item.category.code)) categoryMap.set(item.category.code, item.category);
      const key = `${item.category.code}/${item.group.code}`;
      const existing = groupMap.get(key);
      if (existing) existing.count++;
      else groupMap.set(key, { item, count: 1 });
    });

    // Categories open their first group (A to Z); "Select a service" there lists the rest
    this.categories = [...categoryMap.values()].sort(byLabel).map((category) => {
      const firstGroup = items
        .filter((item) => item.category?.code === category.code && item.group)
        .map((item) => item.group)
        .sort(byLabel)[0];
      const groupCount = new Set(
        items.filter((item) => item.category?.code === category.code).map((item) => item.group?.code)
      ).size;
      const title = toTitleCase(category.label);
      return {
        title: normalize(title),
        words: normalize(title).split(' '),
        result: {
          type: 'category',
          id: category.code,
          title,
          subtitle: `Category · ${groupCount} ${groupCount === 1 ? 'service type' : 'service types'}`,
          categoryCode: category.code,
          image: LISTING_CATEGORY_IMAGES[category.code],
          route: ['/services', category.code, firstGroup?.code ?? ''],
        },
      } as IndexEntry;
    });

    this.groups = [...groupMap.values()].map(({ item, count }) => {
      const title = toTitleCase(item.group.label);
      const category = toTitleCase(item.category.label);
      return {
        title: normalize(title),
        words: normalize(`${title} ${category}`).split(' '),
        result: {
          type: 'group',
          id: `${item.category.code}/${item.group.code}`,
          title,
          subtitle: `${category} · ${count} ${count === 1 ? 'service' : 'services'}`,
          categoryCode: item.category.code,
          image: groupImage(items, item.group.code),
          route: ['/services', item.category.code, item.group.code],
        },
      };
    });

    this.services = items
      .filter((item) => item.category && item.group)
      .map((item) => this.serviceEntry(item, items));

    const popular = items
      .filter((item) => item.tags?.code === 'popular' && item.category && item.group)
      .map((item) => this.serviceEntry(item, items).result);
    this.suggestionsCache = {
      categories: this.categories.map((entry) => entry.result),
      groups: [],
      services: popular,
    };
  }

  private serviceEntry(item: ListingItem, items: ListingItem[]): IndexEntry {
    const name = toTitleCase(item.name);
    const group = toTitleCase(item.group.label);
    const category = toTitleCase(item.category.label);
    return {
      title: normalize(`${group} ${name}`),
      words: normalize(`${group} ${name} ${category} ${item.description ?? ''}`).split(' '),
      result: {
        type: 'service',
        id: item.id,
        title: name,
        subtitle: group,
        categoryCode: item.category.code,
        image: productImage(item) ?? groupImage(items, item.group.code),
        price: `₹${item.unitPrice.toLocaleString('en-IN')}`,
        route: ['/services', item.category.code, item.group.code],
        queryParams: { service: item.id },
      },
    };
  }
}
