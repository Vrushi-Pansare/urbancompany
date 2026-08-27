import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  badge?: string;
}

interface ServiceOffer {
  title: string;
  subtitle: string;
  discount: string;
  bgGradient: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
