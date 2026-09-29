import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface CategoryItem {
  id: string;
  name: string;
  image: string;
  timeBadge?: string;
}

interface SmartProduct {
  id: string;
  name: string;
  image: string;
}

interface SpotlightBanner {
  id: string;
  alt: string;
  image: string;
  link?: string;
}

interface NoteworthyItem {
  id: string;
  title: string;
  image: string;
  link?: string;
  badge?: string;
  timeInfo?: string;
}

interface MostBookedService {
  id: string;
  title: string;
  image: string;
  rating: string;
  price: string;
  originalPrice?: string;
  link?: string;
  isInstant?: boolean;
  badge?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
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
    {
      id: 'all-services',
      name: 'All services',
      image: 'assets/categories/all-services.jpeg',
    },
  ];

  smartProducts = [
    {
      id: 'water-purifier',
      name: 'Native Water Purifier',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T09:05:14.943Z/water-purifier.jpg',
    },
    {
      id: 'smart-locks',
      name: 'Native Smart Locks',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T09:03:53.937Z/NativeSmartLocks.jpg',
    },
  ];

  heroMediaImage =
    'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T08:57:56.893Z/heroMediaImage.jpg';

  @ViewChild('spotlightTrack') spotlightTrackRef!: ElementRef<HTMLDivElement>;

  canScrollLeft = false;
  canScrollRight = true;

  private readonly SCROLL_STEP = 415; // 389px card + 26px gap

  @ViewChild('noteworthyTrack') noteworthyTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftNoteworthy = false;
  canScrollRightNoteworthy = true;
  private readonly NOTEWORTHY_SCROLL_STEP = 250;

  @ViewChild('mostBookedTrack') mostBookedTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftMostBooked = false;
  canScrollRightMostBooked = true;
  private readonly MOST_BOOKED_SCROLL_STEP = 250;

  @ViewChild('revampTrack') revampTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftRevamp = false;
  canScrollRightRevamp = true;
  private readonly REVAMP_SCROLL_STEP = 420; // 394px card + 26px gap

  @ViewChild('spaTrack') spaTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftSpa = false;
  canScrollRightSpa = true;
  private readonly SPA_SCROLL_STEP = 250;

  @ViewChild('applianceTrack') applianceTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftAppliance = false;
  canScrollRightAppliance = true;
  private readonly APPLIANCE_SCROLL_STEP = 250;

  @ViewChild('homeRepairsTrack')
  homeRepairsTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftHomeRepairs = false;
  canScrollRightHomeRepairs = true;
  private readonly HOME_REPAIRS_SCROLL_STEP = 250;

  @ViewChild('massageMenTrack')
  massageMenTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftMassageMen = false;
  canScrollRightMassageMen = true;
  private readonly MASSAGE_MEN_SCROLL_STEP = 250;

  @ViewChild('salonWomenTrack')
  salonWomenTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftSalonWomen = false;
  canScrollRightSalonWomen = true;
  private readonly SALON_WOMEN_SCROLL_STEP = 250;

  @ViewChild('cleaningEssentialsTrack')
  cleaningEssentialsTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftCleaningEssentials = false;
  canScrollRightCleaningEssentials = true;
  private readonly CLEANING_ESSENTIALS_SCROLL_STEP = 250;

  @ViewChild('salonMenTrack')
  salonMenTrackRef!: ElementRef<HTMLDivElement>;
  canScrollLeftSalonMen = false;
  canScrollRightSalonMen = true;
  private readonly SALON_MEN_SCROLL_STEP = 250;

  ngAfterViewInit(): void {
    // Check initial scroll state after view renders
    setTimeout(() => {
      this.onCarouselScroll();
      this.onNoteworthyScroll();
      this.onMostBookedScroll();
      this.onRevampScroll();
      this.onSpaScroll();
      this.onApplianceScroll();
      this.onHomeRepairsScroll();
      this.onMassageMenScroll();
      this.onSalonMenScroll();
      this.onSalonWomenScroll();
      this.onCleaningEssentialsScroll();
    }, 0);
  }

  spotlightScrollProgress = 0;

  scrollCarousel(direction: 'left' | 'right'): void {
    const el = this.spotlightTrackRef.nativeElement;
    el.scrollBy({
      left: direction === 'right' ? this.SCROLL_STEP : -this.SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onCarouselScroll(): void {
    const el = this.spotlightTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeft = el.scrollLeft > 0;
    this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      this.spotlightScrollProgress = (el.scrollLeft / maxScroll) * (64 - 18);
    } else {
      this.spotlightScrollProgress = 0;
    }
  }

  scrollNoteworthyCarousel(direction: 'left' | 'right'): void {
    const el = this.noteworthyTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.NOTEWORTHY_SCROLL_STEP
          : -this.NOTEWORTHY_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onNoteworthyScroll(): void {
    const el = this.noteworthyTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftNoteworthy = el.scrollLeft > 0;
    this.canScrollRightNoteworthy =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollMostBookedCarousel(direction: 'left' | 'right'): void {
    const el = this.mostBookedTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.MOST_BOOKED_SCROLL_STEP
          : -this.MOST_BOOKED_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onMostBookedScroll(): void {
    const el = this.mostBookedTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftMostBooked = el.scrollLeft > 0;
    this.canScrollRightMostBooked =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollRevampCarousel(direction: 'left' | 'right'): void {
    const el = this.revampTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.REVAMP_SCROLL_STEP
          : -this.REVAMP_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onRevampScroll(): void {
    const el = this.revampTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftRevamp = el.scrollLeft > 0;
    this.canScrollRightRevamp =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollSpaCarousel(direction: 'left' | 'right'): void {
    const el = this.spaTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right' ? this.SPA_SCROLL_STEP : -this.SPA_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onSpaScroll(): void {
    const el = this.spaTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftSpa = el.scrollLeft > 0;
    this.canScrollRightSpa =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
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

  scrollMassageMenCarousel(direction: 'left' | 'right'): void {
    const el = this.massageMenTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.MASSAGE_MEN_SCROLL_STEP
          : -this.MASSAGE_MEN_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onMassageMenScroll(): void {
    const el = this.massageMenTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftMassageMen = el.scrollLeft > 0;
    this.canScrollRightMassageMen =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollSalonMenCarousel(direction: 'left' | 'right'): void {
    const el = this.salonMenTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.SALON_MEN_SCROLL_STEP
          : -this.SALON_MEN_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onSalonMenScroll(): void {
    const el = this.salonMenTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftSalonMen = el.scrollLeft > 0;
    this.canScrollRightSalonMen =
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  scrollSalonWomenCarousel(direction: 'left' | 'right'): void {
    const el = this.salonWomenTrackRef.nativeElement;
    el.scrollBy({
      left:
        direction === 'right'
          ? this.SALON_WOMEN_SCROLL_STEP
          : -this.SALON_WOMEN_SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  onSalonWomenScroll(): void {
    const el = this.salonWomenTrackRef?.nativeElement;
    if (!el) return;
    this.canScrollLeftSalonWomen = el.scrollLeft > 0;
    this.canScrollRightSalonWomen =
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

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth <= 768;
    }
  }

  get displaySpotlightBanners(): SpotlightBanner[] {
    return this.isMobile ? this.mobileSpotlightBanners : this.spotlightBanners;
  }

  get displayNoteworthyItems(): NoteworthyItem[] {
    return this.isMobile ? this.mobileNoteworthyItems : this.noteworthyItems;
  }

  get displayMostBookedServices(): MostBookedService[] {
    return this.isMobile
      ? this.mobileMostBookedServices
      : this.mostBookedServices;
  }

  get displaySpaServices(): MostBookedService[] {
    return this.isMobile ? this.spaServicesMobile : this.spaServices;
  }

  get displayApplianceServices(): MostBookedService[] {
    return this.isMobile
      ? this.applianceServicesMobile
      : this.applianceServices;
  }

  get displayHomeRepairsServices(): MostBookedService[] {
    return this.isMobile
      ? this.homeRepairsServicesMobile
      : this.homeRepairsServices;
  }

  get displayMassageMenServices(): MostBookedService[] {
    return this.isMobile
      ? this.massageMenServicesMobile
      : this.massageMenServices;
  }

  get displaySalonMenServices(): MostBookedService[] {
    return this.isMobile
      ? this.salonMenServicesMobile
      : this.salonMenServices;
  }

  // PC Original Spotlight Banners
  spotlightBanners: SpotlightBanner[] = [
    {
      id: 'banner-1',
      alt: 'Urban Company Banner 2',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:07:49.210Z/banner-1.jpg',
    },
    {
      id: 'banner-salon-luxe',
      alt: 'Salon Luxe',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:11:18.839Z/banner-salon-luxe.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-luxe',
    },
    {
      id: 'banner-cleaning',
      alt: 'Full Home/ By Room Cleaning',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:10:15.488Z/banner-cleaning.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-professional-home-cleaning',
    },
    {
      id: 'banner-4',
      alt: 'Urban Company Banner 4',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:08:20.458Z/banner-4.jpg',
    },
    {
      id: 'banner-ac',
      alt: 'AC Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:09:48.986Z/banner-ac.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
    },
    {
      id: 'banner-6',
      alt: 'Urban Company Banner 6',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:08:46.743Z/banner-6.jpg',
    },
    {
      id: 'banner-7',
      alt: 'Urban Company Banner 9',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:09:16.521Z/banner-7.jpg',
    },
    {
      id: 'banner-pest',
      alt: 'Pest Control',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:10:49.030Z/banner-pest.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-pest-control',
    },
  ];

  // Mobile Spotlight Banners
  mobileSpotlightBanners: SpotlightBanner[] = [
    {
      id: 'banner-1',
      alt: 'Urban Company Banner 2',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:07:49.210Z/banner-1.jpg',
    },
    {
      id: 'banner-salon-luxe',
      alt: 'Salon Luxe',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:11:18.839Z/banner-salon-luxe.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-luxe',
    },
    {
      id: 'banner-cleaning',
      alt: 'Full Home/ By Room Cleaning',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:10:15.488Z/banner-cleaning.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-professional-home-cleaning',
    },
    {
      id: 'banner-painting',
      alt: 'Walls & Rooms Painting',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:08:20.458Z/banner-4.jpg',
    },
    {
      id: 'banner-ac',
      alt: 'AC Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:09:48.986Z/banner-ac.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
    },
    {
      id: 'banner-bathroom',
      alt: 'Bathroom Cleaning',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:08:46.743Z/banner-6.jpg',
    },
    {
      id: 'banner-7',
      alt: 'Urban Company Banner 9',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:09:16.521Z/banner-7.jpg',
    },
    {
      id: 'banner-pest',
      alt: 'Cockroach Control',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:10:49.030Z/banner-pest.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-pest-control',
    },
  ];

  // PC Original Noteworthy Items (6 columns, 2 rows)
  noteworthyItems: NoteworthyItem[] = [
    // Column 1
    {
      id: 'noteworthy-cleaning',
      title: 'Full Home/ By Room Cleaning',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:40:08.043Z/noteworthy-cleaning.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-professional-home-cleaning',
    },
    {
      id: 'noteworthy-stove',
      title: 'Stove Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:44:35.648Z/noteworthy-stove.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-gas-stove-repair',
      timeInfo: 'In 55 mins',
    },

    // Column 2
    {
      id: 'noteworthy-furniture',
      title: 'Furniture clean & shine',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:40:50.960Z/noteworthy-furniture.jpg',
      badge: 'New',
    },
    {
      id: 'noteworthy-laptop',
      title: 'Laptop Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:42:27.692Z/noteworthy-laptop.jpg',
      link: 'https://www.urbancompany.com/new-delhi-laptop-repair',
      timeInfo: 'In 55 mins',
    },

    // Column 3
    {
      id: 'noteworthy-painting',
      title: 'Full home painting',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:42:57.013Z/noteworthy-painting.jpg',
    },
    {
      id: 'noteworthy-spa',
      title: 'Spa Ayurveda',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:44:04.195Z/noteworthy-spa.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-spa-ayurveda',
    },

    // Column 4
    {
      id: 'noteworthy-water-purifier',
      title: 'Native Water Purifier',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:45:18.558Z/noteworthy-water-purifier.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ro-purchase',
      badge: 'New',
    },
    {
      id: 'noteworthy-hair-women',
      title: 'Hair Studio for Women',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:41:18.879Z/noteworthy-hair-women.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-women-hair-services',
    },

    // Column 5
    {
      id: 'noteworthy-smart-locks',
      title: 'Native Smart Locks',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:43:31.874Z/noteworthy-smart-locks.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-epc-stores-smarthome',
    },
    {
      id: 'noteworthy-ac',
      title: 'AC Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:39:35.498Z/noteworthy-ac.jpg',
    },

    // Column 6
    {
      id: 'noteworthy-kitchen',
      title: 'Kitchen Cleaning',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:41:56.105Z/noteworthy-kitchen.jpg',
    },
  ];

  // Mobile Noteworthy Items
  mobileNoteworthyItems: NoteworthyItem[] = [
    {
      id: 'noteworthy-cleaning',
      title: 'Full Home/ By Room Cleaning',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:40:08.043Z/noteworthy-cleaning.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-professional-home-cleaning',
    },
    {
      id: 'noteworthy-painting',
      title: 'Full home painting',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:42:57.013Z/noteworthy-painting.jpg',
    },
    {
      id: 'noteworthy-living-bedroom',
      title: 'Living & Bedroom Cleaning ',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:40:50.960Z/noteworthy-furniture.jpg',
    },
    {
      id: 'noteworthy-kitchen',
      title: 'Kitchen Cleaning',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:41:56.105Z/noteworthy-kitchen.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-kitchen-cleaning',
    },
    {
      id: 'noteworthy-water-purifier',
      title: 'Native Water Purifier',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:45:18.558Z/noteworthy-water-purifier.jpg',
    },
    {
      id: 'noteworthy-smart-locks',
      title: 'Native Smart Locks',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:43:31.874Z/noteworthy-smart-locks.jpg',
    },
    {
      id: 'noteworthy-stove',
      title: 'Stove Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:44:35.648Z/noteworthy-stove.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-gas-stove-repair',
      timeInfo: 'In 44 mins',
    },
    {
      id: 'noteworthy-laptop',
      title: 'Laptop Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:42:27.692Z/noteworthy-laptop.jpg',
      link: 'https://www.urbancompany.com/new-delhi-laptop-repair',
      timeInfo: 'In 44 mins',
    },
    {
      id: 'noteworthy-spa',
      title: 'Spa Ayurveda',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:44:04.195Z/noteworthy-spa.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-spa-ayurveda',
    },
    {
      id: 'noteworthy-hair-women',
      title: 'Hair Studio for Women',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:41:18.879Z/noteworthy-hair-women.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-women-hair-services',
    },
    {
      id: 'noteworthy-ac',
      title: 'AC',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:39:35.498Z/noteworthy-ac.jpg',
      timeInfo: 'In 44 mins',
    },
  ];

  // PC Original Most Booked Services
  mostBookedServices: MostBookedService[] = [
    {
      id: 'most-booked-ac-repair',
      title: 'AC repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:08:58.598Z/most-booked-ac-repair.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.73',
      price: '₹299',
    },
    {
      id: 'most-booked-cleaning-2-bath',
      title: 'Intense cleaning (2 bathroom)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:10:27.534Z/most-booked-cleaning-2-bath.jpg',
      rating: '4.80',
      price: '₹958',
      originalPrice: '₹1,098',
    },
    {
      id: 'most-booked-haircut-men',
      title: 'Haircut for men',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:08:19.513Z/Haircutformen.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-mens-grooming',
      rating: '4.86',
      isInstant: true,
      price: '₹259',
    },
    {
      id: 'most-booked-foam-jet-ac',
      title: 'Foam-jet AC service',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:05:40.989Z/Foam-jetACservice.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.75',
      price: '₹699',
    },
    {
      id: 'most-booked-cleaning-3-bath',
      title: 'Intense cleaning (3 bathroom)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:11:09.693Z/most-booked-cleaning-3-bath.jpg',
      rating: '4.80',
      price: '₹1,377',
      originalPrice: '₹1,647',
    },
    {
      id: 'most-booked-waxing',
      title: 'Roll-on waxing (Full arms, legs & underarms)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:13:43.247Z/most-booked-waxing.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home',
      rating: '4.86',
      price: '₹899',
    },
    {
      id: 'most-booked-carpenter',
      title: 'Book a carpenter',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:09:39.920Z/most-booked-carpenter.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-carpenters-density',
      rating: '4.66',
      price: '₹99',
    },
    {
      id: 'most-booked-water-purifier',
      title: 'Water Purifier / RO Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:13:17.490Z/most-booked-water-purifier.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-kent-ro-repair',
      rating: '4.80',
      price: '₹299',
    },
    {
      id: 'most-booked-plumber',
      title: 'Plumber consultation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:12:42.923Z/most-booked-plumber.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-plumbers-density',
      rating: '4.74',
      isInstant: true,
      price: '₹49',
    },
    {
      id: 'most-booked-electrician',
      title: 'Electrician consultation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:11:45.276Z/most-booked-electrician.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-electrician-density',
      rating: '4.75',
      isInstant: true,
      price: '₹49',
    },
  ];

  // Mobile Most Booked Services
  mobileMostBookedServices: MostBookedService[] = [
    {
      id: 'most-booked-cleaning-2-bath',
      title: 'Intense cleaning (2 bathroom)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:10:27.534Z/most-booked-cleaning-2-bath.jpg',
      rating: '4.80',
      isInstant: true,
      price: '₹918',
      originalPrice: '₹998',
    },
    {
      id: 'most-booked-waxing',
      title: 'Roll-on waxing (Full arms, legs & underarms)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:13:43.247Z/most-booked-waxing.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home',
      rating: '4.86',
      isInstant: true,
      price: '₹899',
    },
    {
      id: 'most-booked-cleaning-3-bath',
      title: 'Intense cleaning (3 bathroom)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:11:09.693Z/most-booked-cleaning-3-bath.jpg',
      rating: '4.80',
      isInstant: true,
      price: '₹1,197',
      originalPrice: '₹1,497',
    },
    {
      id: 'most-booked-water-purifier',
      title: 'Water Purifier / RO Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:13:17.490Z/most-booked-water-purifier.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-kent-ro-repair',
      rating: '4.80',
      price: '₹299',
    },
    {
      id: 'most-booked-plumber',
      title: 'Plumber consultation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:12:42.923Z/most-booked-plumber.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-plumbers-density',
      rating: '4.74',
      price: '₹99',
    },
    {
      id: 'most-booked-haircut-men',
      title: 'Haircut for men',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:08:19.513Z/Haircutformen.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-mens-grooming',
      rating: '4.86',
      price: '₹259',
    },
    {
      id: 'most-booked-carpenter',
      title: 'Book a carpenter',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:09:39.920Z/most-booked-carpenter.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-carpenters-density',
      rating: '4.66',
      isInstant: true,
      price: '₹99',
    },
    {
      id: 'most-booked-electrician',
      title: 'Electrician consultation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:11:45.276Z/most-booked-electrician.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-electrician-density',
      rating: '4.75',
      isInstant: true,
      price: '₹99',
    },
    {
      id: 'most-booked-cleanup',
      title: 'Power glow cleanup',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:05:40.989Z/Foam-jetACservice.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home',
      rating: '4.86',
      isInstant: true,
      price: '₹699',
    },
    {
      id: 'most-booked-drain',
      title: 'Drain blockage removal',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:51:40.579Z/home-repair-drain-blockage.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-plumbers-density',
      rating: '4.77',
      price: '₹99',
    },
  ];

  revampBanners: SpotlightBanner[] = [
    {
      id: 'revamp-furniture-polish',
      alt: 'Wood & Furniture Polish',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:27:06.672Z/revamp-furniture-polish.jpg',
    },
    {
      id: 'revamp-wall-decor',
      alt: 'Wall Decor & Panels',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:27:47.144Z/revamp-wall-decor.jpg',
    },
  ];

  spotlightMassageBanner = {
    id: 'spotlight-massage',
    alt: 'Urban Company Spotlight',
    image:
      'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:33:17.748Z/spotlight-massage.jpg',
  };

  spotlightCleaningBanner = {
    id: 'spotlight-cleaning',
    alt: 'Full Home/ By Room Cleaning',
    image:
      'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:37:24.503Z/spotlight-cleaning.jpg',
    link: 'https://www.urbancompany.com/delhi-ncr-professional-home-cleaning',
  };

  spotlightLocksBanner = {
    id: 'spotlight-locks',
    alt: 'Urban Company Spotlight Locks',
    image:
      'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:10:49.379Z/spotlight-locks.jpg',
  };

  salonWomenServices: MostBookedService[] = [
    {
      id: 'salon-women-waxing',
      title: 'Roll-on waxing (Full arms, legs & underarms)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:13:43.247Z/most-booked-waxing.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home',
      rating: '4.86',
      isInstant: true,
      price: '₹899',
    },
    {
      id: 'salon-women-cleanup',
      title: 'Power glow cleanup',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:05:40.989Z/Foam-jetACservice.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home',
      rating: '4.86',
      isInstant: true,
      price: '₹699',
    },
    {
      id: 'salon-women-pedicure',
      title: 'Crystal rose pedicure',
      image:
        'https://www.urbancompany.com/img/images/supply/customer-app-supply/1763038614950-13e09b.jpeg?bucket=urbanclap-prod&quality=90&format=auto&width=144&dpr=2',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home',
      rating: '4.83',
      isInstant: true,
      price: '₹759',
    },
    {
      id: 'salon-women-facial',
      title: 'Aroma Magic instant glow facial',
      image:
        'https://www.urbancompany.com/img/images/supply/customer-app-supply/1787560577261-b70127.jpeg?bucket=urbanclap-prod&quality=90&format=auto&width=144&dpr=2',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home',
      rating: '4.85',
      isInstant: true,
      price: '₹999',
    },
  ];

  spaServices: MostBookedService[] = [
    {
      id: 'spa-leg-relief',
      title: 'Leg relief massage',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:58:37.994Z/spa-leg-relief.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.83',
      isInstant: true,
      price: '₹929',
    },
    {
      id: 'spa-quick-comfort',
      title: 'Quick comfort therapy',
      badge: '20% OFF',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:58:05.353Z/spa-quick-comfort.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.80',
      isInstant: true,
      price: '₹999',
    },
    {
      id: 'spa-top-to-toe',
      title: 'Top-to-toe stress relief massage',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:57:40.746Z/spa-top-to-toe.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.81',
      isInstant: true,
      price: '₹1,929',
    },
    {
      id: 'spa-full-body-scrub',
      title: 'Full body massage & scrub',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:56:55.896Z/spa-full-body-scrub.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.82',
      isInstant: true,
      price: '₹1,699',
    },
    {
      id: 'spa-back-relief',
      title: 'Back relief massage',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T11:56:08.181Z/spa-back-relief.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.84',
      isInstant: true,
      price: '₹929',
    },
  ];

  spaServicesMobile: MostBookedService[] = [
    {
      id: 'spa-quick-comfort',
      title: 'Quick comfort therapy',
      badge: '17% OFF',
      image:
        'https://www.urbancompany.com/img/images/supply/customer-app-supply/1765967044786-77bf34.jpeg?bucket=urbanclap-prod&quality=90&format=auto&width=144&dpr=2',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.80',
      isInstant: true,
      price: '₹999',
      originalPrice: '₹1,199',
    },
    {
      id: 'spa-top-to-toe',
      title: 'Top-to-toe stress relief massage',
      image:
        'https://www.urbancompany.com/img/images/growth/luminosity/1656575927066-d267b0.jpeg?bucket=urbanclap-prod&quality=90&format=auto&width=144&dpr=2',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.81',
      isInstant: true,
      price: '₹1,929',
    },
    {
      id: 'spa-full-body-scrub',
      title: 'Full body massage & scrub',
      image:
        'https://www.urbancompany.com/img/images/growth/luminosity/1729149877618-bd4221.jpeg?bucket=urbanclap-prod&quality=90&format=auto&width=144&dpr=2',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.82',
      isInstant: true,
      price: '₹1,699',
    },
    {
      id: 'spa-leg-relief',
      title: 'Leg relief massage',
      image:
        'https://www.urbancompany.com/img/images/supply/customer-app-supply/1764927910031-575580.jpeg?bucket=urbanclap-prod&quality=90&format=auto&width=144&dpr=2',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.83',
      isInstant: true,
      price: '₹929',
    },
    {
      id: 'spa-back-relief',
      title: 'Back relief massage',
      image:
        'https://www.urbancompany.com/img/images/growth/luminosity/1656577671070-e48cba.jpeg?bucket=urbanclap-prod&quality=90&format=auto&width=144&dpr=2',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women',
      rating: '4.84',
      isInstant: true,
      price: '₹929',
    },
  ];

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

  applianceServices: MostBookedService[] = [
    {
      id: 'appliance-ac-repair',
      title: 'AC repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:40:19.596Z/appliance-ac-repair.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.73',
      price: '₹299',
    },
    {
      id: 'appliance-foam-jet-ac',
      title: 'Foam-jet AC service',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:39:30.509Z/appliance-foam-jet-ac.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.75',
      price: '₹699',
    },
    {
      id: 'appliance-water-purifier',
      title: 'Water Purifier / RO Service & Repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:39:03.424Z/appliance-water-purifier.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-kent-ro-repair',
      rating: '4.80',
      price: '₹299',
    },
    {
      id: 'appliance-foam-jet-2-ac',
      title: 'Foam-jet service (2 ACs)',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:38:25.230Z/appliance-foam-jet-2-ac.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.75',
      price: '₹1,298',
      originalPrice: '₹1,398',
    },
    {
      id: 'appliance-tv-checkup',
      title: 'TV check-up',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:37:57.944Z/appliance-tv-checkup.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-tv-repair',
      rating: '4.77',
      price: '₹249',
    },
    {
      id: 'appliance-gas-refill',
      title: 'Gas refill & check-up',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:37:28.994Z/appliance-gas-refill.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.77',
      price: '₹3,000',
    },
    {
      id: 'appliance-microwave-checkup',
      title: 'Microwave check-up',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:36:55.954Z/appliance-microwave-checkup.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-microwave-repair',
      rating: '4.82',
      isInstant: true,
      price: '₹199',
    },
    {
      id: 'appliance-ac-installation',
      title: 'AC installation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:36:28.938Z/appliance-ac-installation.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.69',
      price: '₹1,599',
    },
    {
      id: 'appliance-ac-uninstallation',
      title: 'AC uninstallation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:36:04.157Z/appliance-ac-uninstallation.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-ac-service-repair',
      rating: '4.79',
      price: '₹699',
    },
  ];

  applianceServicesMobile: MostBookedService[] = [
    {
      id: 'appliance-water-purifier',
      title: 'Water Purifier / RO Service & Repair',
      image: 'assets/appliance/water-purifier.jpeg',
      link: 'https://www.urbancompany.com/pune-ro-repair',
      rating: '4.80',
      isInstant: true,
      price: '₹299',
    },
    {
      id: 'appliance-geyser-checkup',
      title: 'Geyser check-up',
      image: 'assets/appliance/geyser-checkup.jpeg',
      link: 'https://www.urbancompany.com/pune-geyser-reapir',
      rating: '4.72',
      isInstant: true,
      price: '₹249',
    },
    {
      id: 'appliance-ac-repair',
      title: 'AC repair',
      image: 'assets/appliance/ac-repair.png',
      link: 'https://www.urbancompany.com/pune-ac-service-repair',
      rating: '4.73',
      isInstant: true,
      price: '₹299',
    },
    {
      id: 'appliance-microwave-checkup',
      title: 'Microwave check-up',
      image: 'assets/appliance/microwave-checkup.jpeg',
      link: 'https://www.urbancompany.com/pune-microwave-repair',
      rating: '4.82',
      isInstant: true,
      price: '₹199',
    },
    {
      id: 'appliance-tv-checkup',
      title: 'TV check-up',
      image: 'assets/appliance/tv-checkup.jpeg',
      link: 'https://www.urbancompany.com/pune-tv-repair',
      rating: '4.77',
      price: '₹249',
    },
    {
      id: 'appliance-foam-jet-ac',
      title: 'Foam-jet AC service',
      image: 'assets/appliance/foam-jet-ac.jpeg',
      link: 'https://www.urbancompany.com/pune-ac-service-repair',
      rating: '4.75',
      isInstant: true,
      price: '₹649',
    },
    {
      id: 'appliance-geyser-installation',
      title: 'Geyser installation',
      image: 'assets/appliance/geyser-installation.jpeg',
      link: 'https://www.urbancompany.com/pune-geyser-reapir',
      rating: '4.78',
      isInstant: true,
      price: '₹499',
    },
    {
      id: 'appliance-ac-uninstallation',
      title: 'AC uninstallation',
      image: 'assets/appliance/ac-uninstallation.png',
      link: 'https://www.urbancompany.com/pune-ac-service-repair',
      rating: '4.79',
      isInstant: true,
      price: '₹649',
    },
    {
      id: 'appliance-geyser-service',
      title: 'Geyser service',
      image: 'assets/appliance/geyser-service.jpeg',
      link: 'https://www.urbancompany.com/pune-geyser-reapir',
      rating: '4.76',
      isInstant: true,
      price: '₹599',
    },
    {
      id: 'appliance-washing-machine-installation',
      title: 'Washing machine installation',
      image: 'assets/appliance/washing-machine-installation.jpeg',
      link: 'https://www.urbancompany.com/pune-washing-machine-repair',
      rating: '4.80',
      price: '₹399',
    },
  ];

  homeRepairsServices: MostBookedService[] = [
    {
      id: 'home-repair-carpenter',
      title: 'Book a carpenter',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:57:07.575Z/home-repair-carpenter.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-carpenters-density',
      rating: '4.66',
      price: '₹99',
    },
    {
      id: 'home-repair-plumber',
      title: 'Plumber consultation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:56:35.869Z/home-repair-plumber.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-plumbers-density',
      rating: '4.74',
      isInstant: true,
      price: '₹49',
    },
    {
      id: 'home-repair-electrician',
      title: 'Electrician consultation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:55:54.558Z/home-repair-electrician.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-electrician-density',
      rating: '4.75',
      isInstant: true,
      price: '₹49',
    },
    {
      id: 'home-repair-fan',
      title: 'Fan repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:55:25.347Z/home-repair-fan.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-electrician-density',
      rating: '4.80',
      isInstant: true,
      price: '₹149',
    },
    {
      id: 'home-repair-flush-tank',
      title: 'Flush tank repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:54:50.687Z/home-repair-flush-tank.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-plumbers-density',
      rating: '4.76',
      isInstant: true,
      price: '₹149',
    },
    {
      id: 'home-repair-switchboard',
      title: 'Switchboard repair & replacement',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:54:17.747Z/home-repair-switchboard.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-electrician-density',
      rating: '4.83',
      isInstant: true,
      price: '₹99',
    },
    {
      id: 'home-repair-cupboard',
      title: 'Cupboard repair & installation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:53:37.254Z/home-repair-cupboard.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-carpenters-density',
      rating: '4.79',
      price: '₹89',
    },
    {
      id: 'home-repair-tubelight',
      title: 'Tubelight repair & Installation',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:53:05.574Z/home-repair-tubelight.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-electrician-density',
      rating: '4.86',
      isInstant: true,
      price: '₹99',
    },
    {
      id: 'home-repair-door-locks',
      title: 'Door locks & latches repair',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:52:41.410Z/home-repair-door-locks.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-carpenters-density',
      rating: '4.80',
      price: '₹99',
    },
    {
      id: 'home-repair-drain-blockage',
      title: 'Drain blockage removal',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T12:51:40.579Z/home-repair-drain-blockage.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-plumbers-density',
      rating: '4.77',
      isInstant: true,
      price: '₹199',
    },
  ];

  homeRepairsServicesMobile: MostBookedService[] = [
    {
      id: 'home-repair-plumber-consultation',
      title: 'Plumber consultation',
      image: 'assets/homerepairs/plumber-consultation.jpeg',
      link: 'https://www.urbancompany.com/pune-plumbers-density',
      rating: '4.74',
      price: '₹99',
    },
    {
      id: 'home-repair-drain-blockage',
      title: 'Drain blockage removal',
      image: 'assets/homerepairs/drain-blockage.jpeg',
      link: 'https://www.urbancompany.com/pune-plumbers-density',
      rating: '4.77',
      price: '₹99',
    },
    {
      id: 'home-repair-carpenter',
      title: 'Book a carpenter',
      image: 'assets/homerepairs/carpenter.jpeg',
      link: 'https://www.urbancompany.com/pune-carpenters-density',
      rating: '4.66',
      isInstant: true,
      price: '₹99',
    },
    {
      id: 'home-repair-electrician',
      title: 'Electrician consultation',
      image: 'assets/homerepairs/electrician.jpeg',
      link: 'https://www.urbancompany.com/pune-electrician-density',
      rating: '4.75',
      isInstant: true,
      price: '₹99',
    },
    {
      id: 'home-repair-fan',
      title: 'Regular ceiling fan replace/install',
      badge: '10% off',
      image: 'assets/homerepairs/ceiling-fan.jpeg',
      link: 'https://www.urbancompany.com/pune-electrician-density',
      rating: '4.85',
      isInstant: true,
      price: '₹99',
    },
    {
      id: 'home-repair-shelf',
      title: 'Shelf installation',
      image: 'assets/homerepairs/shelf-installation.jpeg',
      link: 'https://www.urbancompany.com/pune-carpenters-density',
      rating: '4.80',
      isInstant: true,
      price: '₹139',
    },
    {
      id: 'home-repair-flush-tank',
      title: 'Flush tank repair',
      image: 'assets/homerepairs/flush-tank.png',
      link: 'https://www.urbancompany.com/pune-plumbers-density',
      rating: '4.76',
      price: '₹99',
    },
    {
      id: 'home-repair-wash-basin-leakage',
      title: 'Wash basin leakage repair',
      image: 'assets/homerepairs/wash-basin-leakage.jpeg',
      link: 'https://www.urbancompany.com/pune-plumbers-density',
      rating: '4.78',
      price: '₹99',
    },
    {
      id: 'home-repair-connection-hose',
      title: 'Connection hose installation',
      image: 'assets/homerepairs/connection-hose.png',
      link: 'https://www.urbancompany.com/pune-plumbers-density',
      rating: '4.78',
      price: '₹99',
    },
    {
      id: 'home-repair-wash-basin-blockage',
      title: 'Wash basin blockage removal',
      image: 'assets/homerepairs/wash-basin-blockage.jpeg',
      link: 'https://www.urbancompany.com/pune-plumbers-density',
      rating: '4.79',
      price: '₹99',
    },
  ];

  massageMenServices: MostBookedService[] = [
    {
      id: 'massage-men-quick-comfort',
      title: 'Quick comfort therapy',
      badge: '17% OFF',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:06:16.660Z/massage-men-quick-comfort.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-foot-massage-for-men',
      rating: '4.81',
      isInstant: true,
      price: '₹999',
      originalPrice: '₹1,199',
    },
    {
      id: 'massage-men-leg-relief',
      title: 'Leg relief massage',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:05:51.951Z/massage-men-leg-relief.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-foot-massage-for-men',
      rating: '4.85',
      isInstant: true,
      price: '₹919',
    },
    {
      id: 'massage-men-top-to-toe',
      title: 'Top-to-toe stress relief massage',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:05:24.035Z/massage-men-top-to-toe.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-foot-massage-for-men',
      rating: '4.84',
      isInstant: true,
      price: '₹1,979',
    },
    {
      id: 'massage-men-back-relief',
      title: 'Back relief massage',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:04:44.598Z/massage-men-back-relief.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-foot-massage-for-men',
      rating: '4.85',
      isInstant: true,
      price: '₹919',
    },
  ];

  massageMenServicesMobile: MostBookedService[] = [
    {
      id: 'massage-men-quick-comfort',
      title: 'Quick comfort therapy',
      badge: '17% off',
      image: 'assets/massagemen/quick-comfort.jpeg',
      link: 'https://www.urbancompany.com/pune-massage-for-men',
      rating: '4.81',
      price: '₹999',
      originalPrice: '₹1,199',
    },
    {
      id: 'massage-men-top-to-toe',
      title: 'Top-to-toe stress relief massage',
      image: 'assets/massagemen/top-to-toe.jpeg',
      link: 'https://www.urbancompany.com/pune-massage-for-men',
      rating: '4.83',
      price: '₹1,979',
    },
    {
      id: 'massage-men-leg-relief',
      title: 'Leg relief massage',
      image: 'assets/massagemen/leg-relief.jpeg',
      link: 'https://www.urbancompany.com/pune-massage-for-men',
      rating: '4.85',
      price: '₹919',
    },
    {
      id: 'massage-men-back-relief',
      title: 'Back relief massage',
      image: 'assets/massagemen/back-relief.jpeg',
      link: 'https://www.urbancompany.com/pune-massage-for-men',
      rating: '4.85',
      price: '₹919',
    },
    {
      id: 'massage-men-holistic',
      title: 'Holistic de-stress massage',
      image: 'assets/massagemen/holistic-de-stress.jpeg',
      link: 'https://www.urbancompany.com/pune-massage-for-men',
      rating: '4.83',
      price: '₹1,559',
    },
  ];

  salonMenServices: MostBookedService[] = [
    {
      id: 'salon-men-haircut-men',
      title: 'Haircut for men',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:23:05.578Z/salon-men-haircut-men.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-mens-grooming',
      rating: '4.86',
      isInstant: true,
      price: '₹259',
    },
    {
      id: 'salon-men-haircut-boys',
      title: 'Haircut for boys',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:22:24.684Z/salon-men-haircut-boys.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-mens-grooming',
      rating: '4.84',
      isInstant: true,
      price: '₹259',
    },
    {
      id: 'salon-men-massage',
      title: 'Head, neck & shoulder massage',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:21:44.600Z/salon-men-massage.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-mens-grooming',
      rating: '4.81',
      isInstant: true,
      price: '₹299',
    },
    {
      id: 'salon-men-pedicure-deep',
      title: 'Brightening lemon deep cleanse pedicure ',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:21:07.364Z/salon-men-pedicure-deep.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-mens-grooming',
      rating: '4.78',
      isInstant: true,
      price: '₹799',
    },
    {
      id: 'salon-men-pedicure-express',
      title: 'Brightening lemon express pedicure',
      image:
        'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T13:20:23.861Z/salon-men-pedicure-express.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-mens-grooming',
      rating: '4.76',
      isInstant: true,
      price: '₹549',
    },
  ];

  salonMenServicesMobile: MostBookedService[] = [
    {
      id: 'salon-men-haircut-men',
      title: 'Haircut for men',
      image: 'assets/salonmen/haircut-men.jpeg',
      link: 'https://www.urbancompany.com/pune-mens-grooming',
      rating: '4.86',
      price: '₹259',
    },
    {
      id: 'salon-men-haircut-boys',
      title: 'Haircut for boys',
      image: 'assets/salonmen/haircut-boys.jpeg',
      link: 'https://www.urbancompany.com/pune-mens-grooming',
      rating: '4.83',
      price: '₹259',
    },
    {
      id: 'salon-men-massage',
      title: 'Head, neck & shoulder massage',
      image: 'assets/salonmen/head-neck-massage.jpeg',
      link: 'https://www.urbancompany.com/pune-mens-grooming',
      rating: '4.81',
      price: '₹299',
    },
    {
      id: 'salon-men-pedicure-deep',
      title: 'Brightening lemon deep cleanse pedicure ',
      image: 'assets/salonmen/pedicure-deep-cleanse.jpeg',
      link: 'https://www.urbancompany.com/pune-mens-grooming',
      rating: '4.78',
      price: '₹799',
    },
    {
      id: 'salon-men-pedicure-express',
      title: 'Brightening lemon express pedicure',
      image: 'assets/salonmen/pedicure-express.jpeg',
      link: 'https://www.urbancompany.com/pune-mens-grooming',
      rating: '4.76',
      price: '₹549',
    },
  ];
}
