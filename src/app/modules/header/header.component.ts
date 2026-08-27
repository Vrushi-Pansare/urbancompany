import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ASSET_URLS } from '../../constants/urls';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  logoUrl = ASSET_URLS.LOGO;
  currentLocation = 'R-6/569, Chainsukh Rd- Vishal Nagar (East)- Latur- Maharashtra 413531- India';
}
