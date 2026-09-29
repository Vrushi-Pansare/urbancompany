import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: string;
  title: string;
  note?: string;
  price: number;
  image?: string;
  groupName?: string;
  categoryName?: string;
}

export interface CartRow {
  service: CartItem;
  qty: number;
}

const STORAGE_KEY = 'uc_cart';

/** Shared, persisted booking cart used by the listing page and checkout. */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cart = new Map<string, CartRow>(this.load());

  private rowsSubject = new BehaviorSubject<CartRow[]>(this.snapshot());
  public rows$ = this.rowsSubject.asObservable();

  get rows(): CartRow[] {
    return this.snapshot();
  }

  get count(): number {
    return this.snapshot().reduce((sum, row) => sum + row.qty, 0);
  }

  get total(): number {
    return this.snapshot().reduce((sum, row) => sum + row.service.price * row.qty, 0);
  }

  qty(id: string): number {
    return this.cart.get(id)?.qty ?? 0;
  }

  add(service: CartItem): void {
    this.cart.set(service.id, { service, qty: this.qty(service.id) + 1 });
    this.commit();
  }

  remove(id: string): void {
    const existing = this.cart.get(id);
    if (!existing) return;
    const next = existing.qty - 1;
    if (next > 0) this.cart.set(id, { service: existing.service, qty: next });
    else this.cart.delete(id);
    this.commit();
  }

  clear(): void {
    this.cart.clear();
    this.commit();
  }

  private snapshot(): CartRow[] {
    return [...this.cart.values()];
  }

  private commit(): void {
    const rows = this.snapshot();
    this.rowsSubject.next(rows);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      } catch {
        /* storage full / unavailable — cart stays in memory */
      }
    }
  }

  private load(): [string, CartRow][] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const rows: CartRow[] = JSON.parse(raw);
      return rows.filter((r) => r?.service?.id).map((r) => [r.service.id, r]);
    } catch {
      return [];
    }
  }
}
