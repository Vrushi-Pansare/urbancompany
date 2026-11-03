import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartRow, CartService } from '../../services/cart.service';
import { AddressUpdate, AuthService, UserProfile } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { NotifyService } from '../../services/notify.service';
import {
  BookingCustomer,
  BookingError,
  BookingService,
  BookingSlot,
  CallProduct,
  CreateCallPayload,
  CustomerAddress,
  CustomerState
} from '../../services/booking.service';
import { ASSET_URLS, CUSTOMER_TYPE_ID } from '../../constants/urls';
import { BookingSummary } from '../booking-success/booking-success.component';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;

  user: UserProfile | null = null;
  rows: CartRow[] = [];

  avoidCalling = false;

  // ── Booking details (loaded once logged in) ──
  customer: BookingCustomer | null = null;
  customerState: LoadState = 'idle';
  customerError = '';
  selectedAddress: CustomerAddress | null = null;
  showAddressPicker = false;

  slots: BookingSlot[] = [];
  slotsState: LoadState = 'idle';
  selectedSlotId: string | null = null;

  submitting = false;
  submitError = '';
  productError = '';

  // Payment link dialog (shown after the Call + payment request are created)
  showPaymentDialog = false;
  paymentLink = '';
  paymentExpiresAt = '';
  private pendingSummary: BookingSummary | null = null;

  private area: string | null = null;
  private sub = new Subscription();
  // Kept while the booking is unchanged, so retrying after a lost response can't book twice
  private submission: { fingerprint: string; key: string } | null = null;

  constructor(
    private cart: CartService,
    private auth: AuthService,
    private location: LocationService,
    private notify: NotifyService,
    private booking: BookingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.cart.rows$.subscribe((rows) => {
        this.rows = rows;
        this.loadProducts(); // a newly added item needs its product data too
      })
    );
    this.sub.add(
      this.auth.currentUser$.subscribe((user) => {
        const changed = user?.phoneNumber !== this.user?.phoneNumber;
        this.user = user;
        if (!changed) return;
        this.resetBookingDetails();
        if (!user) return;
        // Customer (search by contact -> reference-options/{customerId}) and slots, loaded for this page
        this.booking.loadCustomer();
        this.loadProducts();
        this.loadSlots();
      })
    );
    this.sub.add(this.booking.customer$.subscribe((state) => this.applyCustomer(state)));
    // After an address is edited in the dialog, show it immediately (no re-fetch, so it can't get stuck loading)
    this.sub.add(this.auth.addressUpdated$.subscribe((update) => this.applyAddressUpdate(update)));
    this.sub.add(this.location.area$.subscribe((area) => (this.area = area?.label ?? null)));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ── Totals (no separate taxes/fees — everything is included in the price) ──
  get itemTotal(): number {
    return this.cart.total;
  }

  get amountToPay(): number {
    return this.itemTotal;
  }

  formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  get cardTitle(): string {
    const first = this.rows[0]?.service;
    return first?.categoryName || first?.groupName || 'Your booking';
  }

  get addressLine(): string {
    if (this.selectedAddress) return this.selectedAddress.address || this.selectedAddress.formattedAddress;
    return this.area ? `Home · ${this.area}` : 'Home';
  }

  get selectedSlot(): BookingSlot | null {
    return this.slots.find((s) => s.id === this.selectedSlotId) ?? null;
  }

  // ── Cart ──
  inc(row: CartRow): void {
    this.cart.add(row.service);
  }

  dec(row: CartRow): void {
    this.cart.remove(row.service.id);
  }

  editPackage(): void {
    this.router.navigate(['/']);
  }

  // ── Auth ──
  login(): void {
    this.auth.openLoginModal();
  }

  // ── Customer + address (BookingService holds the loaded record; this page renders it) ──
  private applyCustomer(state: CustomerState): void {
    this.customerState = state.status;
    this.customerError = state.error ?? '';
    this.customer = state.customer;
    // Keep the user's picked address across a background refresh, if it still exists
    const addresses = state.customer?.addresses ?? [];
    this.selectedAddress =
      addresses.find((a) => a.masterPincodeId === this.selectedAddress?.masterPincodeId && a.address === this.selectedAddress?.address) ??
      addresses[0] ??
      null;
  }

  retryCustomer(): void {
    this.booking.loadCustomer();
  }

  editAddress(): void {
    const address = this.selectedAddress;
    if (!this.customer || !address) {
      this.notify.show('No saved address on your profile.');
      return;
    }
    this.showAddressPicker = false;
    // Show just the pincode code in the dropdown (not "formattedAddress + pincode")
    const pin = address.pincode || address.formattedAddress.match(/\b\d{6}\b/)?.[0] || '';
    // Open the same address dialog, prefilled, so the user can update and save
    this.auth.openEditAddressModal({
      customerId: this.customer.customerId,
      phone: this.customer.customerPhoneNumber || this.user?.phoneNumber || '',
      firstName: this.customer.customerFirstName,
      lastName: this.customer.customerLastName,
      email: this.customer.email,
      address: address.address,
      pincodeOption: {
        value: address.masterPincodeId,
        label: pin,
        code: pin
      }
    });
  }

  selectAddress(address: CustomerAddress): void {
    this.selectedAddress = address;
    this.showAddressPicker = false;
  }

  /** Show the just-saved address immediately, without re-fetching the Customer */
  private applyAddressUpdate(update: AddressUpdate): void {
    const updated: CustomerAddress = {
      masterPincodeId: update.masterPincodeId,
      address: update.address,
      formattedAddress: update.address,
      pincode: update.pincode
    };
    if (this.customer) {
      const list = this.customer.addresses;
      const idx = list.findIndex((a) => a.masterPincodeId === (this.selectedAddress?.masterPincodeId ?? update.masterPincodeId));
      if (idx >= 0) list[idx] = updated;
      else list.unshift(updated);
    }
    this.selectedAddress = updated;
    this.customerState = 'ready';
  }

  // ── Slots ──
  async loadSlots(): Promise<void> {
    this.slotsState = 'loading';
    try {
      this.slots = await this.booking.getSlots();
      this.slotsState = 'ready';
    } catch {
      this.slotsState = 'error';
    }
  }

  selectSlot(slot: BookingSlot): void {
    this.selectedSlotId = slot.id;
    this.submitError = '';
  }


  // ── Book (creates the Inquiry Call) ──
  async pay(): Promise<void> {
    if (!this.user) {
      this.login();
      return;
    }
    if (this.submitting) return;
    if (!this.customer || !this.selectedAddress) {
      this.submitError = 'Add an address to your profile to book.';
      return;
    }
    if (!this.selectedSlotId) {
      this.submitError = 'Select a slot to continue.';
      return;
    }

    this.submitting = true;
    this.submitError = '';
    try {
      const address = this.selectedAddress;
      const products = await this.callProducts();
      const booking: Omit<CreateCallPayload, 'userAssignments'> = {
        customerId: this.customer.customerId,
        customerFullName: `${this.customer.customerFirstName} ${this.customer.customerLastName}`.trim(),
        customerPhoneNumber: this.customer.customerPhoneNumber,
        customerEmail: this.customer.email,
        customerTypeId: CUSTOMER_TYPE_ID,
        addressMasterPincodeId: address.masterPincodeId,
        address: address.address,
        slots: this.selectedSlotId,
        remarks: 'Enquiry from app',
        callProducts: products.map((p) => ({
          categoryId: p.categoryId,
          groupId: p.groupId,
          productId: p.productId,
          unitPrice: p.unitPrice
        }))
      };

      // A retry of the same booking re-sends the exact same request (same key)
      const fingerprint = JSON.stringify(booking);
      if (this.submission?.fingerprint !== fingerprint) {
        this.submission = { fingerprint, key: this.booking.newIdempotencyKey() };
      }
      const { key } = this.submission;

      // Call is created with no assignment (no create-context lookup)
      const call = await this.booking.createCall({ ...booking, userAssignments: [] }, key);
      // Create the payment request for this Call, then show the hosted payment link
      const payment = await this.booking.createPaymentRequest(call.id);
      this.submission = null;

      this.pendingSummary = {
        title: this.cardTitle,
        items: this.cart.count,
        amount: this.amountToPay,
        address: address.formattedAddress,
        slot: this.selectedSlot?.label ?? '',
        callId: call.id
      };
      this.paymentLink = payment.paymentLink;
      this.paymentExpiresAt = payment.linkExpiresAt;
      this.showPaymentDialog = true;
    } catch (err) {
      this.submitError = this.errorMessage(err);
    } finally {
      this.submitting = false;
    }
  }

  // ── Payment link dialog ──
  /** Close the payment dialog and go to the booking-success screen */
  closePaymentDialog(): void {
    this.showPaymentDialog = false;
    const summary = this.pendingSummary;
    this.pendingSummary = null;
    this.paymentLink = '';
    this.paymentExpiresAt = '';
    if (summary) {
      this.router.navigate(['/booking-success'], { state: { booking: summary } }).then(() => this.cart.clear());
    }
  }

  // ── Stubs for the remaining booking steps ──
  viewBreakup(): void {
    this.notify.show('Amount to pay is inclusive of all taxes & charges.');
  }

  readPolicy(): void {
    this.notify.show('Full cancellation policy is coming soon.');
  }

  // Customer fields aren't reset here -- they follow BookingService.customer$
  private resetBookingDetails(): void {
    this.showAddressPicker = false;
    this.selectedSlotId = null;
    this.submitError = '';
    this.submission = null;
  }

  /**
   * The cart already holds product ids, so each row's category/group/price comes straight from
   * the product reference (step 4). One entry per unit -- the call has no quantity field.
   */
  /** Step 4 for every cart item as soon as the page has a logged-in user (cached, so pay() reuses it) */
  async loadProducts(): Promise<void> {
    if (!this.user || !this.rows.length) return;
    this.productError = '';
    try {
      await Promise.all(this.rows.map((row) => this.booking.getCallProduct(row.service.id)));
    } catch (err) {
      this.productError = this.errorMessage(err);
    }
  }

  private async callProducts(): Promise<CallProduct[]> {
    const products = await Promise.all(this.rows.map((row) => this.booking.getCallProduct(row.service.id)));
    return this.rows.flatMap((row, i) => Array.from({ length: row.qty }, () => ({ ...products[i] })));
  }

  private errorMessage(err: unknown): string {
    return err instanceof BookingError ? err.message : 'Something went wrong. Please try again.';
  }
}
