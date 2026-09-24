import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationService, SERVICEABLE_CITIES, UserArea } from '../../services/location.service';
import { FooterComponent } from '../footer/footer.component';
import { ASSET_URLS } from '../../constants/urls';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './service-unavailable.component.html',
  styleUrl: './service-unavailable.component.scss'
})
export class ServiceUnavailableComponent {
  logoUrl = ASSET_URLS.LOGO;
  cities = SERVICEABLE_CITIES;
  area$ = this.locationService.area$;
  isChecking = false;

  constructor(private locationService: LocationService) {}

  locationText(area: UserArea): string {
    return area.state && area.state !== area.city ? `${area.label}, ${area.state}` : area.label;
  }

  async onCheckAgain(): Promise<void> {
    this.isChecking = true;
    // Fresh position; this page is removed automatically if the new location is serviceable
    await this.locationService.requestLocation(false, true);
    this.isChecking = false;
  }
}
