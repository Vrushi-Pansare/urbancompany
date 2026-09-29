import { Injectable } from '@angular/core';
import { API_URLS } from '../constants/urls';

export interface ListingRef {
  id: string;
  code: string;
  label: string;
}

export interface ListingItem {
  id: string;
  companyId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  name: string;
  description: string;
  categoryId: string;
  category: ListingRef;
  groupId: string;
  group: ListingRef;
  tagsId?: string | null;
  tags?: ListingRef | null;
  // Relative file URLs ("/api/v1/files/<id>/public#<name>"); load via the /api proxy
  productImages?: string[];
  unitPrice: number;
}

export interface ListingResponse {
  success: boolean;
  requestId: string;
  data: ListingItem[];
  meta: {
    timestamp: string;
    apiVersion: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ListingService {
  // One in-flight/finished request per moduleCode, shared by every page
  private cache = new Map<string, Promise<ListingResponse | null>>();

  getListing(moduleCode = 'product'): Promise<ListingResponse | null> {
    if (!this.cache.has(moduleCode)) {
      const request = this.fetchListing(moduleCode).then((response) => {
        if (!response) this.cache.delete(moduleCode); // allow a retry after failure
        return response;
      });
      this.cache.set(moduleCode, request);
    }
    return this.cache.get(moduleCode)!;
  }

  private async fetchListing(moduleCode: string): Promise<ListingResponse | null> {
    try {
      const res = await fetch(API_URLS.PUBLIC_LISTING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleCode })
      });
      const data: ListingResponse = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[ListingService] Listing request failed:', data);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[ListingService] Listing network error:', err);
      return null;
    }
  }
}
