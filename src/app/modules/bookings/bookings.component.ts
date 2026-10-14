import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ASSET_URLS } from '../../constants/urls';
import { AuthService, UserProfile } from '../../services/auth.service';
import { BookingCall, BookingError, BookingService } from '../../services/booking.service';

const PAGE_SIZE = 25;

/** "My bookings": the user's active Inquiry Calls, newest first */
@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss'
})
export class BookingsComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;

  user: UserProfile | null = null;
  calls: BookingCall[] = [];
  loading = false;
  error = '';
  hasNext = false;

  // Details are fetched (GET /calls/:id) the first time a booking is opened
  openId: string | null = null;
  details = new Map<string, BookingCall>();
  detailError = '';

  private page = 0;
  private sub = new Subscription();

  constructor(private auth: AuthService, private bookings: BookingService, private router: Router) {}

  ngOnInit(): void {
    this.sub.add(
      this.auth.currentUser$.subscribe((user) => {
        this.user = user;
        this.calls = [];
        this.page = 0;
        this.openId = null;
        if (user) this.loadMore();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  async loadMore(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      const { calls, pagination } = await this.bookings.listCalls(this.page + 1, PAGE_SIZE);
      this.page += 1;
      this.calls = [...this.calls, ...calls];
      this.hasNext = !!pagination?.hasNext;
    } catch (err) {
      this.error = err instanceof BookingError ? err.message : 'Could not load your bookings.';
    } finally {
      this.loading = false;
    }
  }

  async toggle(call: BookingCall): Promise<void> {
    this.detailError = '';
    if (this.openId === call.id) {
      this.openId = null;
      return;
    }
    this.openId = call.id;
    if (this.details.has(call.id)) return;
    try {
      this.details.set(call.id, await this.bookings.getCall(call.id));
    } catch (err) {
      if (this.openId === call.id) {
        this.detailError = err instanceof BookingError ? err.message : 'Could not load this booking.';
      }
    }
  }

  /** Details once loaded, otherwise the list row (the list may already carry everything) */
  view(call: BookingCall): BookingCall {
    return this.details.get(call.id) ?? call;
  }

  login(): void {
    this.auth.openLoginModal();
  }

  goBack(): void {
    if (window.history.length > 1) window.history.back();
    else this.router.navigate(['/']);
  }

  formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }
}
