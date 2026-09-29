// Display helpers for data from the public listing API
import { ListingItem } from '../services/listing.service';

// Tile images for listing categories that have one; others use <app-service-icon>
export const LISTING_CATEGORY_IMAGES: Record<string, string> = {
  air_conditioner: 'assets/categories/appliance.jpg',
  water_ro_system: 'assets/categories/water-purifier.jpg',
};

// Photos for listing groups that have one; others use the category icon
export const LISTING_GROUP_IMAGES: Record<string, string> = {
  window_ac: 'assets/appliance/ac-repair.png',
  split_ac: 'assets/appliance/ac-repair.png',
  commercial_ac: 'assets/appliance/ac-repair.png',
  washing_machine: 'assets/appliance/washing-machine-installation.jpeg',
  geyser: 'assets/appliance/geyser-service.jpeg',
  microwave_oven: 'assets/appliance/microwave-checkup.jpeg',
  water_purifier: 'assets/appliance/water-purifier.jpeg',
  home_ro_system: 'assets/appliance/water-purifier.jpeg',
  led_tv: 'assets/appliance/tv-checkup.jpeg',
  led_tv_32_to_43: 'assets/appliance/tv-checkup.jpeg',
  led_tv_50_to_65: 'assets/appliance/tv-checkup.jpeg',
  led_tv_above_65_inch: 'assets/appliance/tv-checkup.jpeg',
};

const UPPERCASE_WORDS = new Set(['AC', 'RO', 'LED', 'TV', 'UV']);

/** "WATER RO SYSTEM" -> "Water RO System", "LED TV , 32 TO 43" -> "LED TV, 32 To 43" */
export function toTitleCase(text: string): string {
  return text
    .replace(/\s+,/g, ',')
    .toLowerCase()
    .replace(/[a-z]+/g, (word) =>
      UPPERCASE_WORDS.has(word.toUpperCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    );
}

/** Case-insensitive A to Z comparison on a label */
export function byLabel(a: { label: string }, b: { label: string }): number {
  return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
}

/**
 * First product image of an item. The API URLs are relative, so they go through our /api proxy —
 * required, as the API sends Cross-Origin-Resource-Policy: same-origin. The "#file name" suffix is dropped.
 */
export function productImage(item: ListingItem): string | undefined {
  const url = item.productImages?.find(Boolean);
  return url ? url.split('#')[0] : undefined;
}

/** Image for a group: first product image in it from the API, else a local photo */
export function groupImage(items: ListingItem[], groupCode: string): string | undefined {
  const withImage = items.find((item) => item.group?.code === groupCode && productImage(item));
  return (withImage && productImage(withImage)) || LISTING_GROUP_IMAGES[groupCode];
}
