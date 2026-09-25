// Customer reviews shown in the home page "Reviews" section.
//
// Only add reviews from real customers (with their permission to publish). Fabricated reviews
// mislead buyers and are prohibited in India (Consumer Protection Act 2019, BIS IS 19000:2022).
// The home page reviews section stays hidden while this list is empty.

export interface CustomerReview {
  id: string;
  name: string; // as the customer agreed to be shown, e.g. "Priya S."
  city: string;
  service: string; // what was booked, e.g. "Split AC - Repair Service"
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  date: string; // e.g. "Sep 2026"
}

export const CUSTOMER_REVIEWS: CustomerReview[] = [
  // Add real customer reviews here, e.g.:
  // {
  //   id: 'r1',
  //   name: 'Priya S.',
  //   city: 'Ahmedabad',
  //   service: 'Water RO System - Home RO System - Repair Service',
  //   rating: 5,
  //   text: '<the customer\'s own words>',
  //   date: 'Sep 2026',
  // },
];
