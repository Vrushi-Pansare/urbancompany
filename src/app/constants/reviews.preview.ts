// LOCAL PREVIEW ONLY — these are not real customer reviews.
//
// Used to see the "Loved by Customers" carousel while developing. The home page only uses this list
// when Angular is in dev mode (`ng serve`); the production build (`ng build`, used by Netlify) never
// shows it. Put real reviews in reviews.ts — they replace these everywhere, including in dev.

import { CustomerReview } from './reviews';

export const PREVIEW_REVIEWS: CustomerReview[] = [
  {
    id: 'preview-1',
    name: 'Rohit M.',
    city: 'Gurugram',
    service: 'Air Conditioner - Split AC - Repair Service',
    rating: 5,
    text: 'AC stopped cooling in the middle of June. The technician came the same evening, found a gas leak near the outdoor unit, fixed it and showed me the pressure reading before leaving.',
    date: 'Sep 2026',
  },
  {
    id: 'preview-2',
    name: 'Sneha P.',
    city: 'Ahmedabad',
    service: 'Appliances - Washing Machine - Draining Issue',
    rating: 5,
    text: 'Front load machine was not draining and showing an error. He cleaned the drain filter and pump, ran a full cycle to test it and explained how to clean the filter myself next time.',
    date: 'Sep 2026',
  },
  {
    id: 'preview-3',
    name: 'Amit K.',
    city: 'Noida',
    service: 'Water RO System - Home RO System - Repair Service',
    rating: 4,
    text: 'Good service for our RO. Filter and membrane were changed and the water taste is back to normal. Arrived about 20 minutes late, but called beforehand to let me know.',
    date: 'Aug 2026',
  },
  {
    id: 'preview-4',
    name: 'Kavita S.',
    city: 'Delhi',
    service: 'Appliances - Refrigerator - Less Cooling',
    rating: 5,
    text: 'Fridge was barely cooling. The technician checked everything patiently and replaced the fan motor. Price was exactly what was shown on the app, no extra charges.',
    date: 'Aug 2026',
  },
  {
    id: 'preview-5',
    name: 'Harsh V.',
    city: 'Ahmedabad',
    service: 'Appliances - Geyser - Repair Service',
    rating: 5,
    text: 'Geyser was tripping the MCB every morning. The heating element had failed. It was replaced within an hour and he also checked the wiring. Very neat work.',
    date: 'Aug 2026',
  },
  {
    id: 'preview-6',
    name: 'Neha G.',
    city: 'Gurugram',
    service: 'Air Conditioner - Window AC - Repair Service',
    rating: 4,
    text: 'Old window AC was making a loud noise. The fan blade was loose and the unit needed cleaning. Much quieter now. Would have liked a slightly earlier slot, otherwise happy.',
    date: 'Jul 2026',
  },
  {
    id: 'preview-7',
    name: 'Vikas R.',
    city: 'Noida',
    service: 'Appliances - Microwave Oven - Not Working',
    rating: 5,
    text: 'Microwave was not heating at all. He diagnosed a faulty fuse and door switch, replaced both on the spot and tested it with a cup of water. Quick and polite.',
    date: 'Jul 2026',
  },
  {
    id: 'preview-8',
    name: 'Pooja D.',
    city: 'Delhi',
    service: 'Appliances - Washing Machine - Installation-Front Load',
    rating: 5,
    text: 'Got our new front load installed. He fixed the inlet and outlet pipes properly, levelled the machine and ran a demo wash. Explained all the wash programmes too.',
    date: 'Jul 2026',
  },
  {
    id: 'preview-9',
    name: 'Manish T.',
    city: 'Ahmedabad',
    service: 'Appliances - Refrigerator - Gas Charging',
    rating: 4,
    text: 'Gas refilling for our double-door fridge was done properly and it is cooling well now. The job took a bit longer than expected, but he explained the reason clearly.',
    date: 'Jun 2026',
  },
  {
    id: 'preview-10',
    name: 'Ritu A.',
    city: 'Gurugram',
    service: 'Appliances - Stove / Cooktop - Repair Service',
    rating: 5,
    text: 'Two burners of our gas stove had a weak flame. He cleaned and adjusted the burners and checked the pipe for leaks. Works like new and the charges were reasonable.',
    date: 'Jun 2026',
  },
];
