import { Injectable, NgZone, isDevMode } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
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

type GeoResult = { area: UserArea; serviceable: boolean };

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

  /**
   * The gate is still deciding (permission / geocoding). Location is optional, so this no
   * longer blocks the UI — it's kept for any caller that wants to know we're still resolving.
   */
  public isResolving$ = this.status$.pipe(
    map((status) => status !== 'serviceable' && status !== 'unserviceable')
  );

  /** Prices and add-to-cart/purchase are only available inside a serviceable area. */
  public canTransact$ = this.status$.pipe(map((status) => status === 'serviceable'));

  /** Area confirmed but outside our serviceable cities — browse-only mode. */
  public isUnserviceable$ = this.status$.pipe(map((status) => status === 'unserviceable'));

  /**
   * No usable, serviceable location yet (permission not granted, blocked, or lookup failed).
   * Location is optional — the app stays browsable — so this only drives the "turn it on" prompts.
   */
  public needsLocation$ = this.status$.pipe(
    map(
      (status) =>
        status === 'prompt' ||
        status === 'denied' ||
        status === 'unavailable' ||
        status === 'unsupported' ||
        status === 'verify-failed'
    )
  );

  /** Fires when the app wants to (re)open the location prompt (e.g. add-to-cart without a location). */
  private openGateSubject = new Subject<void>();
  public openGate$ = this.openGateSubject.asObservable();

  private locationSubject = new BehaviorSubject<UserLocation | null>(null);
  public location$ = this.locationSubject.asObservable();

  private areaSubject = new BehaviorSubject<UserArea | null>(null);
  public area$ = this.areaSubject.asObservable();

  private permission: PermissionStatus | null = null;
  private initialized = false;
  private ipLookup?: Promise<GeoResult | null>;

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

    const t0 = performance.now();
    return new Promise((resolve) => {
      let done = false;
      const settle = (apply: () => void) => {
        if (done) return;
        done = true;
        this.zone.run(() => {
          apply();
          resolve();
        });
      };

      // Approximate, permission-free location from the visitor's IP — started in parallel so it's
      // ready to use the moment GPS is slow or fails.
      const ipPromise = this.getIpLocation();

      // When we're not waiting on the browser prompt (permission already granted), don't make the
      // user sit through the full GPS timeout — use the IP result after a short grace period.
      const graceTimer =
        silent || quiet
          ? setTimeout(() => {
              ipPromise.then((ip) => {
                if (ip) settle(() => this.applyGeo(ip, `IP (GPS slow, ${Math.round(performance.now() - t0)}ms)`));
              });
            }, 2500)
          : null;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (graceTimer) clearTimeout(graceTimer);
          if (done) return;
          done = true;
          if (isDevMode()) console.log(`[location] GPS fix in ${Math.round(performance.now() - t0)}ms (accuracy ${Math.round(position.coords.accuracy)}m)`);
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          this.zone.run(async () => {
            this.locationSubject.next(location);
            await this.verifyArea(location, quiet);
            resolve();
          });
        },
        (error) => {
          if (graceTimer) clearTimeout(graceTimer);
          if (isDevMode()) console.log(`[location] GPS error after ${Math.round(performance.now() - t0)}ms: ${error.message} (code ${error.code})`);

          if (error.code === error.PERMISSION_DENIED) {
            // 'prompt' = user closed the prompt without choosing, so the browser will ask again.
            settle(() => this.statusSubject.next(this.permission?.state === 'prompt' ? 'prompt' : 'denied'));
            return;
          }

          // Position unavailable / timed out — fall back to IP so the app still resolves.
          ipPromise.then((ip) => {
            if (ip) settle(() => this.applyGeo(ip, 'IP (GPS failed)'));
            else settle(() => this.statusSubject.next('unavailable'));
          });
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: quiet ? 0 : 5 * 60 * 1000 }
      );
    });
  }

  /** Apply a resolved area to the app state (used by both the GPS and IP paths). */
  private applyGeo(result: GeoResult, source: string): void {
    if (isDevMode()) console.log(`[location] resolved via ${source} → ${result.area.label} (${result.serviceable ? 'serviceable' : 'unserviceable'})`);
    this.areaSubject.next(result.area);
    this.statusSubject.next(result.serviceable ? 'serviceable' : 'unserviceable');
  }

  /** Approximate location from the visitor's IP (cached for the session; retried if it failed). */
  private getIpLocation(): Promise<GeoResult | null> {
    if (!this.ipLookup) {
      this.ipLookup = this.lookupByIp();
      this.ipLookup.then((result) => {
        if (!result) this.ipLookup = undefined;
      });
    }
    return this.ipLookup;
  }

  private async lookupByIp(): Promise<GeoResult | null> {
    return (await this.ipLookupFrom('https://ipwho.is/')) ?? (await this.ipLookupFrom('https://ipapi.co/json/'));
  }

  private async ipLookupFrom(url: string): Promise<GeoResult | null> {
    const data = await this.fetchJson(url, 5000);
    if (!data || data.error || data.success === false) return null;
    const names: (string | undefined)[] = [data.city, data.region, data.country_name || data.country];
    const city = this.matchServiceableCity(names) || data.city || data.region || '';
    if (!city) return null;
    return {
      area: { label: city, city, state: data.region || '' },
      serviceable: data.country_code === 'IN' && this.isServiceable(names)
    };
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

  /** Invite the user to turn on location — reopens the gate and re-asks the browser when possible. */
  promptEnable(): void {
    this.openGateSubject.next();
    const status = this.statusSubject.value;
    if (status === 'prompt' || status === 'checking' || status === 'requesting') {
      this.requestLocation();
    }
  }

  private async verifyArea(location: UserLocation, quiet = false): Promise<void> {
    if (!quiet) {
      this.statusSubject.next('verifying');
    }

    const t0 = performance.now();
    const result = await this.reverseGeocode(location);
    if (isDevMode()) console.log(`[location] reverse-geocode in ${Math.round(performance.now() - t0)}ms → ${result ? result.area.label : 'failed'}`);

    this.zone.run(() => {
      if (!result) {
        this.statusSubject.next('verify-failed');
        return;
      }
      this.areaSubject.next(result.area);
      this.statusSubject.next(result.serviceable ? 'serviceable' : 'unserviceable');
    });
  }

  /**
   * BigDataCloud is the primary geocoder; Nominatim only joins in if BigDataCloud is slow
   * (>1.2s) or fails. A healthy primary means we return as soon as it answers and never touch
   * Nominatim's rate-limited endpoint. When it stalls, both race and the first result wins.
   */
  private async reverseGeocode(location: UserLocation): Promise<GeoResult | null> {
    const primary = this.lookupBigDataCloud(location);
    const primaryOrSlow = await Promise.race([primary, this.after(1200, 'slow' as const)]);

    if (primaryOrSlow && primaryOrSlow !== 'slow') return primaryOrSlow;

    // Primary was slow or came back empty — bring in the fallback and take whoever answers first.
    return this.firstNonNull([primary, this.lookupNominatim(location)]);
  }

  private after<T>(ms: number, value: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms));
  }

  /** Resolves with the first non-null result, or null once every promise has resolved null. */
  private firstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
    return new Promise((resolve) => {
      let remaining = promises.length;
      let done = false;
      const settle = (val: T | null) => {
        if (done) return;
        if (val) { done = true; resolve(val); }
        else if (--remaining === 0) resolve(null);
      };
      for (const p of promises) p.then(settle, () => settle(null));
    });
  }

  /** Fetch + parse JSON with a hard timeout so a slow/hung geocoder can't stall the gate. */
  private async fetchJson(url: string, timeoutMs = 6000): Promise<any | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res.ok ? await res.json() : null;
    } catch {
      return null; // network error or aborted (timed out)
    } finally {
      clearTimeout(timer);
    }
  }

  private async lookupBigDataCloud(
    { latitude, longitude }: UserLocation
  ): Promise<{ area: UserArea; serviceable: boolean } | null> {
    try {
      const data = await this.fetchJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      if (!data?.countryCode) return null;

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
      const data = await this.fetchJson(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const address = data?.address;
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
