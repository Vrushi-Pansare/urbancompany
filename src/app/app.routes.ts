import { Routes } from '@angular/router';
import { HomeComponent } from './modules/home/home.component';
import { ServiceListingComponent } from './modules/service-listing/service-listing.component';
import { CheckoutComponent } from './modules/checkout/checkout.component';
import { BookingSuccessComponent } from './modules/booking-success/booking-success.component';
import { BookingsComponent } from './modules/bookings/bookings.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'services/:category/:group', component: ServiceListingComponent },
  { path: 'checkout', component: CheckoutComponent },
  // Cart lives on the checkout page; alias so a payment cancel/return to /cart lands here
  { path: 'cart', redirectTo: 'checkout', pathMatch: 'full' },
  { path: 'booking-success', component: BookingSuccessComponent },
  { path: 'bookings', component: BookingsComponent },
  { path: '**', redirectTo: '' }
];

