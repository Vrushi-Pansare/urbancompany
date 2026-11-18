import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ASSET_URLS } from '../../constants/urls';
import { AddressUpdate, AuthService, UserProfile } from '../../services/auth.service';
import { BookingCustomer, BookingService, CustomerAddress, CustomerState } from '../../services/booking.service';

/** "My profile": the logged-in user's details and saved address, from their Customer record */
@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.scss'
})
export class MyProfileComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;

  user: UserProfile | null = null;
  customer: BookingCustomer | null = null;
  customerState: CustomerState['status'] = 'idle';
  customerError = '';

  private sub = new Subscription();

  constructor(private auth: AuthService, private booking: BookingService, private router: Router) {}

  ngOnInit(): void {
    this.sub.add(
      this.auth.currentUser$.subscribe((user) => {
        const changed = user?.phoneNumber !== this.user?.phoneNumber;
        this.user = user;
        if (changed && user) this.booking.loadCustomer();
      })
    );
    this.sub.add(
      this.booking.customer$.subscribe((state) => {
        this.customerState = state.status;
        this.customerError = state.error ?? '';
        this.customer = state.customer;
      })
    );
    // After the address dialog saves, show the address straight away
    this.sub.add(this.auth.addressUpdated$.subscribe((update) => this.applyAddressUpdate(update)));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  /** Name from the Customer record, falling back to the login profile */
  get fullName(): string {
    const fromCustomer = [this.customer?.customerFirstName, this.customer?.customerLastName].filter(Boolean).join(' ').trim();
    return fromCustomer || this.user?.name?.trim() || '';
  }

  get initials(): string {
    const parts = this.fullName.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  get phone(): string {
    const number = this.user?.phoneNumber || this.customer?.customerPhoneNumber || '';
    return number ? `${this.user?.countryCode || '+91'} ${number}` : '';
  }

  get addresses(): CustomerAddress[] {
    return this.customer?.addresses ?? [];
  }

  addressText(address: CustomerAddress): string {
    return address.address || address.formattedAddress;
  }

  retry(): void {
    this.booking.loadCustomer();
  }

  /** Edit the primary address, or add the first one, in the shared address dialog */
  openAddress(address: CustomerAddress | null): void {
    if (!this.user) return;
    const [firstName = '', ...rest] = (this.user.name ?? '').trim().split(/\s+/);
    const pin = address ? address.pincode || address.formattedAddress.match(/\b\d{6}\b/)?.[0] || '' : '';
    this.auth.openEditAddressModal({
      customerId: this.customer?.customerId ?? '',
      phone: this.customer?.customerPhoneNumber || this.user.phoneNumber || '',
      firstName: this.customer?.customerFirstName || firstName,
      lastName: this.customer?.customerLastName || rest.join(' '),
      email: this.customer?.email ?? '',
      address: address?.address ?? '',
      pincodeOption: address ? { value: address.masterPincodeId, label: pin, code: pin } : null
    });
  }

  private applyAddressUpdate(update: AddressUpdate): void {
    // No Customer record until now: the dialog just created it, so load it
    if (!this.customer) {
      this.booking.loadCustomer();
      return;
    }
    const updated: CustomerAddress = {
      masterPincodeId: update.masterPincodeId,
      address: update.address,
      formattedAddress: update.address,
      pincode: update.pincode
    };
    // The dialog saves the primary (first) address
    this.customer.addresses = [updated, ...this.customer.addresses.slice(1)];
  }

  login(): void {
    this.auth.openLoginModal();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  goBack(): void {
    if (window.history.length > 1) window.history.back();
    else this.router.navigate(['/']);
  }
}
