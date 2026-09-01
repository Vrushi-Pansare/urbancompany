import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ASSET_URLS } from '../../constants/urls';

interface PromoBanner {
  id: string;
  alt: string;
  image: string;
  link?: string;
}

interface Campaign {
  id: string;
  location: string;
  minutes: number;
  themeColor: string;
  bannerType: 'image' | 'instahelp';
  bannerImage?: string;
  instahelp?: {
    title: string;
    subtitle: string;
    origPrice: string;
    offerPrice: string;
    badge: string;
    image: string;
  };
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;

  isScrolled = false;

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      this.isScrolled = scrollY > 40;
    }
  }

  // 0-9 digits for rolling ticker
  digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  digit1 = 0;
  digit2 = 0;

  // City & Campaign variations on refresh
  campaigns: Campaign[] = [
    {
      id: 'instahelp-pune',
      location: 'GW9W+9P4 Amanora Active Arena - Amanor...',
      minutes: 99,
      themeColor: 'rgba(87, 42, 200, 1.00)', // Purple #572ac8
      bannerType: 'instahelp',
      instahelp: {
        title: 'InstaHelp',
        subtitle: '3-visit pack at just',
        origPrice: '₹195',
        offerPrice: '₹29/visit',
        badge: '85% OFF',
        image: 'assets/instahelp-banner.jpg'
      }
    },
    {
      id: 'bathroom-pune',
      location: 'GW9W+9P4 Amanora Active Arena - Amanor...',
      minutes: 14,
      themeColor: 'rgba(17, 146, 232, 1.00)', // Blue #1192e8
      bannerType: 'image',
      bannerImage: 'https://www.urbancompany.com/img/images/supply/customer-app-supply/1787566909186-2193c7.jpeg?bucket=urbanclap-prod&quality=90&format=auto'
    }
  ];

  activeCampaignIndex = 1; // Default to Blue 14 mins bathroom campaign shown in screenshot
  liveUserLocation = '';
  private campaignTimer: any;

  get activeCampaign(): Campaign {
    return this.campaigns[this.activeCampaignIndex];
  }

  get currentLocation(): string {
    return this.liveUserLocation || this.activeCampaign?.location || 'GW9W+9P4 Amanora Active Arena - Amanor...';
  }

  // Dynamic rotating search terms
  searchKeywords: string[] = [
    "'AC service'",
    "'Bathroom cleaning'",
    "'Facial'",
    "'Salon for women'",
    "'Electrician'",
    "'Native Water Purifier'",
    "'Full home painting'"
  ];
  currentKeywordIndex = 0;
  displayedSearchText = "Search for 'AC service'";
  private typingTimer: any;

  promoBanners: PromoBanner[] = [
    {
      id: 'promo-1',
      alt: 'Urban Company Offers',
      image: 'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:07:49.210Z/banner-1.jpg',
    },
    {
      id: 'promo-salon',
      alt: 'Salon Luxe',
      image: 'https://cshare-leader-prod-new.s3.ap-south-1.amazonaws.com/2026-08-27T10:11:18.839Z/banner-salon-luxe.jpg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-luxe'
    }
  ];

  ngOnInit(): void {
    this.startSearchAnimation();
    this.triggerRollingMinutes(this.activeCampaign.minutes);
    
    // Auto change campaign every 20 seconds
    this.startAutoRotation();

    // Detect user's current live location
    this.detectUserLiveLocation();
  }

  ngOnDestroy(): void {
    if (this.typingTimer) {
      clearInterval(this.typingTimer);
    }
    if (this.campaignTimer) {
      clearInterval(this.campaignTimer);
    }
  }

  startAutoRotation(): void {
    this.campaignTimer = setInterval(() => {
      this.toggleCampaign();
    }, 20000); // 20 seconds
  }

  async detectUserLiveLocation(): Promise<void> {
    // 1. Instant IP-based lookup (no permission prompt required, instant)
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const data = await ipRes.json();
        if (data.city) {
          const area = data.postal ? `${data.postal}, ${data.city}` : data.city;
          const locStr = `${area}, ${data.region || data.country_name || 'India'}`;
          this.liveUserLocation = locStr;
          this.campaigns.forEach(c => c.location = locStr);
        }
      }
    } catch (e) {
      console.log('IP geocode fallback running...');
    }

    // 2. High precision GPS browser Geolocation
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Fast reverse geocoding via bigdatacloud
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            if (res.ok) {
              const data = await res.json();
              const locality = data.locality || data.principalSubdivision || data.city;
              const city = data.city || data.principalSubdivision || 'Pune';
              if (locality && city) {
                const locStr = locality !== city ? `${locality}, ${city}` : city;
                this.liveUserLocation = locStr;
                this.campaigns.forEach(c => c.location = locStr);
                return;
              }
            }

            // Fallback to OpenStreetMap Nominatim
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            if (nomRes.ok) {
              const nomData = await nomRes.json();
              const area = nomData.address?.suburb || nomData.address?.neighbourhood || nomData.address?.residential || nomData.address?.road;
              const city = nomData.address?.city || nomData.address?.town || nomData.address?.state_district || 'Pune';
              const locStr = area ? `${area}, ${city}` : (nomData.display_name?.split(',').slice(0, 2).join(',') || city);
              this.liveUserLocation = locStr;
              this.campaigns.forEach(c => c.location = locStr);
            }
          } catch (e) {
            console.warn('GPS reverse geocode error:', e);
          }
        },
        (error) => {
          console.log('Location GPS notice:', error.message);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  }

  // Calculate transform for rolling digit slot
  getDigitTransform(digit: number): number {
    return -(digit * 24);
  }

  triggerRollingMinutes(minutes: number): void {
    // Start at 0, then roll to destination digit
    this.digit1 = 0;
    this.digit2 = 0;

    const str = minutes.toString().padStart(2, '0');
    const target1 = parseInt(str[0], 10);
    const target2 = parseInt(str[1], 10);

    setTimeout(() => {
      this.digit1 = target1;
      this.digit2 = target2;
    }, 150);
  }

  // Allow clicking on location row to toggle city campaign & re-roll numbers
  toggleCampaign(): void {
    this.activeCampaignIndex = (this.activeCampaignIndex + 1) % this.campaigns.length;
    this.triggerRollingMinutes(this.activeCampaign.minutes);
  }

  startSearchAnimation(): void {
    let charIndex = this.searchKeywords[0].length;
    let isDeleting = false;

    this.typingTimer = setInterval(() => {
      const currentKeyword = this.searchKeywords[this.currentKeywordIndex];

      if (!isDeleting) {
        // Typing forward
        charIndex++;
        this.displayedSearchText = `Search for ${currentKeyword.substring(0, charIndex)}`;
        if (charIndex >= currentKeyword.length) {
          // Pause at full word before deleting
          isDeleting = true;
          clearInterval(this.typingTimer);
          setTimeout(() => {
            this.typingTimer = setInterval(stepAnimation, 50);
          }, 2000);
        }
      } else {
        // Deleting backward
        charIndex--;
        this.displayedSearchText = `Search for ${currentKeyword.substring(0, charIndex)}`;
        if (charIndex <= 0) {
          isDeleting = false;
          this.currentKeywordIndex = (this.currentKeywordIndex + 1) % this.searchKeywords.length;
          clearInterval(this.typingTimer);
          setTimeout(() => {
            this.typingTimer = setInterval(stepAnimation, 100);
          }, 300);
        }
      }
    }, 100);

    const stepAnimation = () => {
      const currentKeyword = this.searchKeywords[this.currentKeywordIndex];
      if (!isDeleting) {
        charIndex++;
        this.displayedSearchText = `Search for ${currentKeyword.substring(0, charIndex)}`;
        if (charIndex >= currentKeyword.length) {
          isDeleting = true;
          clearInterval(this.typingTimer);
          setTimeout(() => {
            this.typingTimer = setInterval(stepAnimation, 50);
          }, 2000);
        }
      } else {
        charIndex--;
        this.displayedSearchText = `Search for ${currentKeyword.substring(0, charIndex)}`;
        if (charIndex <= 0) {
          isDeleting = false;
          this.currentKeywordIndex = (this.currentKeywordIndex + 1) % this.searchKeywords.length;
          clearInterval(this.typingTimer);
          setTimeout(() => {
            this.typingTimer = setInterval(stepAnimation, 100);
          }, 300);
        }
      }
    };
  }
}
