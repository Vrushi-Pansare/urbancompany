import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NativeBanner {
  id: string;
  image: string;
  alt: string;
}

interface NativeAdvantage {
  id: string;
  image: string;
  alt: string;
}

@Component({
  selector: 'app-native',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './native.component.html',
  styleUrl: './native.component.scss'
})
export class NativeComponent implements OnInit {
  // Desktop Section 1 (Frame 2 Banners)
  banners: NativeBanner[] = [
    {
      id: 'banner-0',
      image: 'assets/native/banner-1.jpeg',
      alt: 'Urban Company Banner 0'
    },
    {
      id: 'banner-1',
      image: 'assets/native/banner-2.jpeg',
      alt: 'Urban Company Banner 1'
    }
  ];

  // Desktop Section 2: UC app service advantages
  advantages: NativeAdvantage[] = [
    {
      id: 'advantage-0',
      image: 'assets/native/advantage-1.jpeg',
      alt: 'Urban Company Banner 0'
    },
    {
      id: 'advantage-1',
      image: 'assets/native/advantage-2.jpeg',
      alt: 'Urban Company Banner 1'
    },
    {
      id: 'advantage-2',
      image: 'assets/native/advantage-3.jpeg',
      alt: 'Urban Company Banner 2'
    }
  ];

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }
}
