import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  HostListener,
  isDevMode,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ListingItem, ListingService } from '../../services/listing.service';
import { CategoryDialogComponent, DialogCategory, DialogGroup } from '../category-dialog/category-dialog.component';
import { ServiceIconComponent } from '../service-icon/service-icon.component';
import { CardCarouselComponent } from '../card-carousel/card-carousel.component';
import { CUSTOMER_REVIEWS } from '../../constants/reviews';
import { PREVIEW_REVIEWS } from '../../constants/reviews.preview';
import { LISTING_CATEGORY_IMAGES, byLabel, groupImage, productImage, toTitleCase } from '../../constants/listing-display';

/** Card for a tagged listing item (Popular / Recommended Services) */
interface PopularService {
  id: string;
  title: string;
  groupName: string;
  price: string;
  image?: string;
  link: string[];
}

interface CategoryItem {
  id: string;
  name: string;
  image?: string;
  timeBadge?: string;
}

interface MostBookedService {
  id: string;
  title: string;
  image: string;
  rating?: string;
  price: string;
  originalPrice?: string;
  link?: string;
  route?: string[]; // in-app link (listing items) — used instead of the external `link`
  isInstant?: boolean;
  badge?: string;
}

// Listing tags shown on the home page
const POPULAR_TAG_CODE = 'popular'; // "Popular Categories" + "Popular Services"
const RECOMMENDED_TAG_CODE = 'recommended'; // "Recommended Services"
const APPLIANCE_REPAIR_TAG_CODE = 'repairing_ac'; // "Appliance repair & service"
const INSTALLATION_TAG_CODE = 'installation'; // "Home repair & installation"

function toCategoryTile(category: ListingItem['category']): CategoryItem {
  return {
    id: category.code,
    name: toTitleCase(category.label),
    image: LISTING_CATEGORY_IMAGES[category.code],
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, CategoryDialogComponent, ServiceIconComponent, CardCarouselComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit {
  categories: CategoryItem[] = [
    {
      id: 'instahelp',
      name: 'InstaHelp',
      image: 'assets/categories/instahelp.jpg',
      timeBadge: '14 mins',
    },
    {
      id: 'womens-salon',
      name: "Women's Salon & Spa",
      image: 'assets/categories/womens-salon.jpg',
      timeBadge: '44 mins',
    },
    {
      id: 'mens-salon',
      name: "Men's Salon & Massage",
      image: 'assets/categories/mens-salon.jpg',
      timeBadge: '44 mins',
    },
    {
      id: 'cleaning',
      name: 'Cleaning & Pest Control',
      image: 'assets/categories/cleaning.jpg',
    },
    {
      id: 'painting',
      name: 'Home Painting & Upgrade',
      image: 'assets/categories/painting.jpg',
    },
    {
      id: 'appliance',
      name: 'AC & Appliance Repair',
      image: 'assets/categories/appliance.jpg',
      timeBadge: '44 mins',
    },
    {
      id: 'handyman',
      name: 'Electrician, Plumber & Carpenter',
      image: 'assets/categories/handyman.jpeg',
      timeBadge: '44 mins',
    },
  ];

  heroVideo = 'assets/videos/home-hero.mp4';

  private readonly SCROLL_STEP = 415; // 389px card + 26px gap

  @ViewChild('applianceTrack') applianceTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftAppliance = false;
  canScrollRightAppliance = true;
  private readonly APPLIANCE_SCROLL_STEP = 250;

  @ViewChild('homeRepairsTrack')
  homeRepairsTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftHomeRepairs = false;
  canScrollRightHomeRepairs = true;
  private readonly HOME_REPAIRS_SCROLL_STEP = 250;

  @ViewChild('cleaningEssentialsTrack')
  cleaningEssentialsTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftCleaningEssentials = false;
  canScrollRightCleaningEssentials = true;
  private readonly CLEANING_ESSENTIALS_SCROLL_STEP = 250;

  ngAfterViewInit(): void {
    // Check initial scroll state after view renders
    setTimeout(() => {
      this.onApplianceScroll();
      this.onHomeRepairsScroll();
      this.onCleaningEssentialsScroll();
    }, 0);
  }

  scrollApplianceCarousel(direction: 'left' | 'right'): void {
    const el = this.applianceTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.APPLIANCE_SCROLL_STEP
          : -this.APPLIANCE_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onApplianceScroll(): void {
    const el = this.applianceTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftAppliance = el.scrollLeft > 0;
    this.canScrollRightAppliance =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollHomeRepairsCarousel(direction: 'left' | 'right'): void {
    const el = this.homeRepairsTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.HOME_REPAIRS_SCROLL_STEP
          : -this.HOME_REPAIRS_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onHomeRepairsScroll(): void {
    const el = this.homeRepairsTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftHomeRepairs = el.scrollLeft > 0;
    this.canScrollRightHomeRepairs =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollCleaningEssentialsCarousel(direction: 'left' | 'right'): void {
    const el = this.cleaningEssentialsTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.CLEANING_ESSENTIALS_SCROLL_STEP
          : -this.CLEANING_ESSENTIALS_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onCleaningEssentialsScroll(): void {
    const el = this.cleaningEssentialsTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftCleaningEssentials = el.scrollLeft > 0;
    this.canScrollRightCleaningEssentials =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  isMobile = false;

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth <= 768;
    }
  }

  // Raw listing from the API
  listingItems: ListingItem[] = [];

  // Unique categories from the listing, shown in "Home services at your doorstep"
  listingCategories: CategoryItem[] = [];
  private listingLoaded = false;

  // "Popular Categories" — unique categories of listing items tagged popular
  popularCategories: CategoryItem[] = [];

  // "Popular Services" / "Recommended Services" — listing items with that tag
  popularServices: PopularService[] = [];
  recommendedServices: PopularService[] = [];

  // Customer reviews: real ones from constants/reviews.ts. Until there are any, local dev (`ng serve`)
  // shows preview entries so the carousel can be designed; production builds never include them.
  reviews = CUSTOMER_REVIEWS.length ? CUSTOMER_REVIEWS : PREVIEW_REVIEWS;
  readonly stars = [1, 2, 3, 4, 5];

  // Carousels built from tagged listing items
  applianceServices: MostBookedService[] = []; // "Appliance repair & service"
  homeRepairsServices: MostBookedService[] = []; // "Home repair & installation"

  // Category dialog state
  selectedCategory: DialogCategory | null = null;
  selectedGroups: DialogGroup[] = [];

  /** API categories once loaded; hardcoded tiles only if the API call failed */
  get displayCategories(): CategoryItem[] {
    if (!this.listingLoaded) return [];
    return this.listingCategories.length ? this.listingCategories : this.categories;
  }

  constructor(
    private listingService: ListingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth <= 768;
    }
    this.loadListing();
  }

  private async loadListing(): Promise<void> {
    const response = await this.listingService.getListing('product');
    this.listingItems = response?.data ?? [];

    // One tile per unique category, sorted A to Z
    const unique = new Map<string, ListingItem['category']>();
    this.listingItems.forEach((item) => {
      if (item.category && !unique.has(item.category.code)) {
        unique.set(item.category.code, item.category);
      }
    });
    this.listingCategories = [...unique.values()].sort(byLabel).map(toCategoryTile);

    const popular = new Map<string, ListingItem['category']>();
    this.listingItems
      .filter((item) => item.tags?.code === POPULAR_TAG_CODE && item.category)
      .forEach((item) => {
        if (!popular.has(item.category.code)) popular.set(item.category.code, item.category);
      });
    this.popularCategories = [...popular.values()].sort(byLabel).map(toCategoryTile);

    this.popularServices = this.servicesWithTag(POPULAR_TAG_CODE);
    this.recommendedServices = this.servicesWithTag(RECOMMENDED_TAG_CODE);
    this.applianceServices = this.carouselCardsWithTag(APPLIANCE_REPAIR_TAG_CODE);
    this.homeRepairsServices = this.carouselCardsWithTag(INSTALLATION_TAG_CODE);

    // Re-check carousel arrows once the new cards render
    setTimeout(() => {
      this.onApplianceScroll();
      this.onHomeRepairsScroll();
    }, 0);
    this.listingLoaded = true;
  }

  /** Service cards for listing items carrying a tag, in API order */
  private servicesWithTag(tagCode: string): PopularService[] {
    return this.listingItems
      .filter((item) => item.tags?.code === tagCode && item.category && item.group)
      .map((item) => ({
        id: item.id,
        title: toTitleCase(item.name),
        groupName: toTitleCase(item.group.label),
        price: `₹${item.unitPrice.toLocaleString('en-IN')}`,
        image: productImage(item) ?? groupImage(this.listingItems, item.group.code),
        link: ['/services', item.category.code, item.group.code],
      }));
  }

  /** Carousel cards for listing items carrying a tag, in API order */
  private carouselCardsWithTag(tagCode: string): MostBookedService[] {
    return this.listingItems
      .filter((item) => item.tags?.code === tagCode && item.category && item.group)
      .map((item) => ({
        id: `listing-${item.id}`,
        // Names like "Repair Service" repeat across groups, so prefix the group
        title: `${toTitleCase(item.group.label)} - ${toTitleCase(item.name)}`,
        image: productImage(item) ?? groupImage(this.listingItems, item.group.code) ?? '',
        price: `₹${item.unitPrice.toLocaleString('en-IN')}`,
        route: ['/services', item.category.code, item.group.code],
      }));
  }

  /** Open the dialog with the unique groups (A to Z) of a listing category */
  openCategory(item: CategoryItem): void {
    const unique = new Map<string, ListingItem['group']>();
    this.listingItems
      .filter((listing) => listing.category?.code === item.id && listing.group)
      .forEach((listing) => {
        if (!unique.has(listing.group.code)) unique.set(listing.group.code, listing.group);
      });
    if (!unique.size) return; // hardcoded fallback tiles have no groups

    this.selectedGroups = [...unique.values()]
      .sort(byLabel)
      .map((group) => ({
        id: group.id,
        code: group.code,
        name: toTitleCase(group.label),
        image: groupImage(this.listingItems, group.code),
      }));
    this.selectedCategory = { code: item.id, name: item.name };
  }

  closeCategory(): void {
    this.selectedCategory = null;
    this.selectedGroups = [];
  }

  /** Open the service listing page for a group picked in the dialog */
  openGroup(group: DialogGroup): void {
    const category = this.selectedCategory;
    this.closeCategory();
    if (category) {
      this.router.navigate(['/services', category.code, group.code]);
    }
  }

  cleaningEssentialsServices: MostBookedService[] = [
    {
      id: 'cleaning-intense-2-bath',
      title: 'Intense cleaning (2 bathroom)',
      image: 'assets/cleaning/intense-cleaning-2-bath.jpeg',
      rating: '4.80',
      price: '₹918',
      originalPrice: '₹998',
    },
    {
      id: 'cleaning-intense-3-bath',
      title: 'Intense cleaning (3 bathroom)',
      image: 'assets/cleaning/intense-cleaning-3-bath.png',
      rating: '4.80',
      price: '₹1,197',
      originalPrice: '₹1,497',
    },
    {
      id: 'cleaning-fridge',
      title: 'Fridge cleaning',
      image: 'assets/cleaning/fridge-cleaning.jpeg',
      link: 'https://www.urbanclap.com/pune-professional-kitchen-cleaning',
      rating: '4.83',
      price: '₹399',
    },
    {
      id: 'cleaning-pest-utensils',
      title: 'Pest control (includes utensil removal)',
      image: 'assets/cleaning/pest-control-utensils.jpeg',
      link: 'https://www.urbancompany.com/pune-pest-control',
      rating: '4.79',
      price: '₹1,249',
    },
    {
      id: 'cleaning-pest-no-utensils',
      title: 'Pest control (no utensil removal)',
      image: 'assets/cleaning/pest-control-no-utensils.jpeg',
      link: 'https://www.urbancompany.com/pune-pest-control',
      rating: '4.80',
      price: '₹998',
    },
    {
      id: 'cleaning-kitchen-window',
      title: 'Kitchen window cleaning',
      image: 'assets/cleaning/kitchen-window-cleaning.jpeg',
      link: 'https://www.urbanclap.com/pune-professional-kitchen-cleaning',
      rating: '4.78',
      price: '₹399',
    },
    {
      id: 'cleaning-apt-pest',
      title: 'Apartment pest control (includes utensil removal)',
      image: 'assets/cleaning/apartment-pest-control.jpeg',
      link: 'https://www.urbancompany.com/pune-pest-control',
      rating: '4.79',
      price: '₹1,849',
    },
  ];

}
