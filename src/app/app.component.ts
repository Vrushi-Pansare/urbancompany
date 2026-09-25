import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './modules/header/header.component';
import { FooterComponent } from './modules/footer/footer.component';
import { LoginComponent } from './modules/login/login.component';
import { LocationGateComponent } from './modules/location-gate/location-gate.component';
import { ServiceUnavailableComponent } from './modules/service-unavailable/service-unavailable.component';
import { LocationService } from './services/location.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe, NgIf, HeaderComponent, FooterComponent, LoginComponent, LocationGateComponent, ServiceUnavailableComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Urban Company';
  isBlocked$ = this.locationService.isBlocked$;
  status$ = this.locationService.status$;

  constructor(private locationService: LocationService) {}
}
