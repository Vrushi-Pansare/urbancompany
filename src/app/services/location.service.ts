import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export type LocationStatus =
  | 'checking'      // resolving permission / fetching a previously-granted position
  | 'requesting'    // browser permission prompt is showing
  | 'prompt'        // user dismissed the browser prompt without choosing — can be asked again
  | 'denied'        // user blocked location for this site — must be changed in browser settings
  | 'unavailable'   // permission granted but the device could not get a position
  | 'unsupported'
  | 'verifying'     // position found, checking whether we serve that area
  | 'verify-failed' // could not look up the area (network / geocoder error)
  | 'serviceable'
  | 'unserviceable';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UserArea {
  label: string; // short display label, e.g. "Sector 18, Noida"
  city: string;
  state: string;
}

/** Cities we currently serve (matched against every place name the geocoder returns) */
export const SERVICEABLE_CITIES = ['Delhi', 'Gurugram', 'Noida', 'Ahmedabad'];
const SERVICEABLE_KEYWORDS = ['delhi', 'gurugram', 'gurgaon', 'noida', 'ahmedabad'];

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private statusSubject = new BehaviorSubject<LocationStatus>('checking');
  public status$ = this.statusSubject.asObservable();
  public isBlocked$ = this.status$.pipe(map((status) => status !== 'serviceable'));

  private locationSubject = new BehaviorSubject<UserLocation | null>(null);
  public location$ = this.locationSubject.asObservable();

  private areaSubject = new BehaviorSubject<UserArea | null>(null);
  public area$ = this.areaSubject.asObservable();

  private permission: PermissionStatus | null = null;
  private initialized = false;

  constructor(private zone: NgZone) {}

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.statusSubject.next('unsupported');
      return;
    }

    try {
      this.permission = await navigator.permissions.query({ name: 'geolocation' });
    } catch {
      // Permissions API not available — fall through and ask directly
    }

    if (this.permission) {
      const permission = this.permission;
      // Unblock automatically when the user flips the setting in browser site settings
      permission.onchange = () => {
        this.zone.run(() => {
          if (permission.state === 'granted') {
            this.requestLocation();
          } else if (permission.state === 'denied') {
            this.statusSubject.next('denied');
          }
        });
      };

      if (permission.state === 'denied') {
        this.statusSubject.next('denied');
        return;
      }
      if (permission.state === 'granted') {
        this.requestLocation(true);
        return;
      }
    }

    this.requestLocation();
  }

  /**
   * @param silent show the background "checking" state instead of the permission prompt state
   * @param quiet  keep the current status until a result is known (used by the unserviceable page)
   */
  requestLocation(silent = false, quiet = false): Promise<void> {
    if (!quiet) {
      this.statusSubject.next(silent ? 'checking' : 'requesting');
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.zone.run(async () => {
            const location: UserLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            this.locationSubject.next(location);
            await this.verifyArea(location, quiet);
            resolve();
          });
        },
        (error) => {
          this.zone.run(() => {
            if (error.code !== error.PERMISSION_DENIED) {
              this.statusSubject.next('unavailable');
            } else if (this.permission?.state === 'prompt') {
              // Prompt was closed without a choice, so the browser will ask again
              this.statusSubject.next('prompt');
            } else {
              this.statusSubject.next('denied');
            }
            resolve();
          });
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: quiet ? 0 : 5 * 60 * 1000 }
      );
    });
  }

  /** Re-run the area check for the last known position */
  retryVerify(): void {
    const location = this.locationSubject.value;
    if (location) {
      this.verifyArea(location);
    } else {
      this.requestLocation();
    }
  }

  private async verifyArea(location: UserLocation, quiet = false): Promise<void> {
    if (!quiet) {
      this.statusSubject.next('verifying');
    }

    const result =
      (await this.lookupBigDataCloud(location)) ??
      (await this.lookupNominatim(location));

    this.zone.run(() => {
      if (!result) {
        this.statusSubject.next('verify-failed');
        return;
      }
      this.areaSubject.next(result.area);
      this.statusSubject.next(result.serviceable ? 'serviceable' : 'unserviceable');
    });
  }

  private async lookupBigDataCloud(
    { latitude, longitude }: UserLocation
  ): Promise<{ area: UserArea; serviceable: boolean } | null> {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.countryCode) return null;

      const names: string[] = [
        data.city,
        data.locality,
        data.principalSubdivision,
        ...(data.localityInfo?.administrative ?? []).map((a: { name: string }) => a.name)
      ];
      const city = this.matchServiceableCity(names) || data.city || data.locality || data.principalSubdivision || '';
      const locality = data.locality && data.locality !== city ? `${data.locality}, ` : '';

      return {
        area: { label: `${locality}${city}`, city, state: data.principalSubdivision || '' },
        serviceable: data.countryCode === 'IN' && this.isServiceable(names)
      };
    } catch {
      return null;
    }
  }

  private async lookupNominatim(
    { latitude, longitude }: UserLocation
  ): Promise<{ area: UserArea; serviceable: boolean } | null> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      if (!res.ok) return null;
      const data = await res.json();
      const address = data.address;
      if (!address?.country_code) return null;

      const names: string[] = [
        address.city,
        address.town,
        address.village,
        address.suburb,
        address.city_district,
        address.state_district,
        address.county,
        address.state
      ];
      const city = this.matchServiceableCity(names) || address.city || address.town || address.state_district || address.state || '';
      const area = address.suburb || address.neighbourhood;

      return {
        area: { label: area ? `${area}, ${city}` : city, city, state: address.state || '' },
        serviceable: address.country_code === 'in' && this.isServiceable(names)
      };
    } catch {
      return null;
    }
  }

  private isServiceable(names: (string | undefined)[]): boolean {
    return !!this.matchServiceableCity(names);
  }

  /** Returns the canonical serviceable city name if any place name matches */
  private matchServiceableCity(names: (string | undefined)[]): string | null {
    const haystack = names.filter(Boolean).map((n) => n!.toLowerCase());
    for (const keyword of SERVICEABLE_KEYWORDS) {
      if (haystack.some((name) => name.includes(keyword))) {
        return keyword === 'gurgaon' ? 'Gurugram' : SERVICEABLE_CITIES.find((c) => c.toLowerCase() === keyword)!;
      }
    }
    return null;
  }
}
