import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BeautyService {
  id: string;
  name: string;
  image: string;
  badge?: string;
  link?: string;
}

interface TrustMarker {
  id: string;
  value: string;
  label: string;
  image: string;
}

interface SpotlightBanner {
  id: string;
  title: string;
  image: string;
  link: string;
}

@Component({
  selector: 'app-beauty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './beauty.component.html',
  styleUrl: './beauty.component.scss'
})
export class BeautyComponent implements OnInit {
  services: BeautyService[] = [
    {
      id: 'salon-women',
      name: 'Salon for Women',
      image: 'assets/beauty/salon-women.jpeg',
      badge: '44 mins'
    },
    {
      id: 'spa-women',
      name: 'Spa for Women',
      image: 'assets/beauty/spa-women.jpeg'
    },
    {
      id: 'hair-studio',
      name: 'Hair Studio for Women',
      image: 'assets/beauty/hair-studio.jpeg',
      link: 'https://www.urbancompany.com/delhi-ncr-women-hair-services'
    },
    {
      id: 'makeup-styling',
      name: 'Makeup, Saree & Styling',
      image: 'assets/beauty/makeup-styling.jpeg',
      link: 'https://www.urbancompany.com/delhi-ncr-party-makeup-artist'
    },
    {
      id: 'salon-men',
      name: 'Salon for Men',
      image: 'assets/beauty/salon-men.jpeg',
      badge: '44 mins'
    },
    {
      id: 'massage-men',
      name: 'Massage for Men',
      image: 'assets/beauty/massage-men.jpeg',
      badge: '44 mins'
    }
  ];

  trustMarkers: TrustMarker[] = [
    {
      id: 'rating',
      value: '4.8',
      label: 'Service Rating*',
      image: 'assets/beauty/trust-rating.jpeg'
    },
    {
      id: 'customers',
      value: '12M+',
      label: 'Customers Globally*',
      image: 'assets/beauty/trust-customers.jpeg'
    }
  ];

  heroImage: string = 'assets/beauty/beauty-hero.jpeg';

  spotlightBanners: SpotlightBanner[] = [
    {
      id: 'salon-luxe',
      title: 'Salon Luxe',
      image: 'assets/beauty/spotlight-salon-luxe.jpeg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-luxe'
    },
    {
      id: 'salon-prime',
      title: 'Salon Prime',
      image: 'assets/beauty/spotlight-salon-prime.jpeg',
      link: 'https://www.urbancompany.com/delhi-ncr-salon-at-home'
    },
    {
      id: 'spa-prime',
      title: 'Spa Prime',
      image: 'assets/beauty/spotlight-spa-prime.jpeg',
      link: 'https://www.urbancompany.com/delhi-ncr-thai-massage-for-women'
    }
  ];

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }
}
