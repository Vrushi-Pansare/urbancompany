import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LocationService, LocationStatus } from '../../services/location.service';
import { ASSET_URLS } from '../../constants/urls';

type Platform = 'ios' | 'android' | 'mac' | 'windows' | 'other';
type Browser = 'chrome' | 'edge' | 'safari' | 'firefox' | 'samsung' | 'other';

@Component({
  selector: 'app-location-gate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-gate.component.html',
  styleUrl: './location-gate.component.scss'
})
export class LocationGateComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;
  status: LocationStatus = 'checking';
  retryFailed = false;
  // Location is optional: once the user closes the sheet it stays hidden until they ask again.
  dismissed = false;

  benefits = [
    'See services and offers available in your area',
    'Get accurate slot timings and arrival estimates',
    'Help our professional reach your exact address'
  ];

  // Background states only surface if they take noticeably long
  private showSlowState = false;
  private slowStateTimer: any;

  private platform: Platform = 'other';
  private browser: Browser = 'other';
  private retrying = false;
  private sub = new Subscription();

  constructor(private locationService: LocationService) {}

  ngOnInit(): void {
    this.detectEnvironment();

    this.sub.add(
      this.locationService.status$.subscribe((status) => {
        // Flag a retry that came back with the same failure
        if (this.retrying && (status === 'denied' || status === 'unavailable')) {
          this.retryFailed = true;
          this.retrying = false;
        } else if (status !== 'requesting' && status !== 'checking') {
          this.retryFailed = false;
          this.retrying = false;
        }

        const wasVisible = this.isVisible;
        this.status = status;
        this.updateSlowState(wasVisible);
        // A confirmed area closes the sheet for good; otherwise let the user reopen it later.
        if (status === 'serviceable' || status === 'unserviceable') {
          this.dismissed = false;
        }
      })
    );

    // Reopen the sheet when the app asks (e.g. "Enable location" banner / add-to-cart).
    this.sub.add(
      this.locationService.openGate$.subscribe(() => {
        this.dismissed = false;
        this.retryFailed = false;
        this.retrying = false;
      })
    );

    this.locationService.init();
  }

  /** Close the (optional) location sheet — the app stays fully browsable. */
  dismiss(): void {
    this.dismissed = true;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    clearTimeout(this.slowStateTimer);
    document.body.style.overflow = '';
  }

  get isBackgroundState(): boolean {
    return this.status === 'checking' || this.status === 'verifying';
  }

  get isVisible(): boolean {
    if (this.dismissed) return false;
    if (this.status === 'serviceable' || this.status === 'unserviceable') return false;
    return !this.isBackgroundState || this.showSlowState;
  }

  get browserName(): string {
    const names: Record<Browser, string> = {
      chrome: 'Chrome',
      edge: 'Edge',
      safari: 'Safari',
      firefox: 'Firefox',
      samsung: 'Samsung Internet',
      other: 'your browser'
    };
    return names[this.browser];
  }

  get deviceName(): string {
    const names: Record<Platform, string> = {
      ios: 'iPhone',
      android: 'phone',
      mac: 'Mac',
      windows: 'PC',
      other: 'device'
    };
    return names[this.platform];
  }

  /** Steps to un-block location for this site in the current browser */
  get blockedSteps(): string[] {
    const { platform, browser } = this;

    if (platform === 'ios') {
      if (browser === 'safari') {
        return [
          'Tap <strong>aA</strong> in the address bar, then <strong>Website Settings</strong>.',
          'Set <strong>Location</strong> to <strong>Allow</strong>.',
          'Still off? Open <strong>Settings → Privacy &amp; Security → Location Services → Safari Websites</strong> and choose <strong>While Using the App</strong>.'
        ];
      }
      return [
        `Open your iPhone <strong>Settings</strong> and tap <strong>${this.browserName}</strong>.`,
        'Tap <strong>Location</strong> and choose <strong>While Using the App</strong>.',
        `Come back to ${this.browserName} and tap <strong>Try again</strong>.`
      ];
    }

    if (platform === 'android') {
      return [
        'Tap the <strong>settings icon</strong> to the left of the web address.',
        'Tap <strong>Permissions</strong> and turn on <strong>Location</strong>.',
        'Come back here and tap <strong>Try again</strong>.'
      ];
    }

    if (browser === 'safari') {
      return [
        'In the menu bar, open <strong>Safari → Settings → Websites</strong>.',
        'Select <strong>Location</strong> and set this website to <strong>Allow</strong>.',
        'Come back here and click <strong>Try again</strong>.'
      ];
    }

    if (browser === 'firefox') {
      return [
        'Click the <strong>permissions icon</strong> to the left of the web address.',
        'Next to <strong>Access your location</strong>, click <strong>×</strong> to remove the block.',
        'Click <strong>Try again</strong> and choose <strong>Allow</strong>.'
      ];
    }

    return [
      'Click the <strong>site settings icon</strong> to the left of the web address.',
      'Turn on <strong>Location</strong> (or set it to <strong>Allow</strong>).',
      'Come back here and click <strong>Try again</strong>.'
    ];
  }

  /** Steps to switch on device-level location services */
  get deviceSteps(): string[] {
    switch (this.platform) {
      case 'ios':
        return [
          'Open <strong>Settings → Privacy &amp; Security → Location Services</strong>.',
          'Make sure <strong>Location Services</strong> is on.'
        ];
      case 'android':
        return [
          'Swipe down from the top of the screen.',
          'Tap <strong>Location</strong> to turn it on.'
        ];
      case 'mac':
        return [
          'Open <strong>System Settings → Privacy &amp; Security → Location Services</strong>.',
          `Turn on Location Services and allow <strong>${this.browserName}</strong>.`
        ];
      case 'windows':
        return [
          'Open <strong>Settings → Privacy &amp; security → Location</strong>.',
          'Turn on <strong>Location services</strong>.'
        ];
      default:
        return ['Turn on location services in your device settings.'];
    }
  }

  onEnableLocation(): void {
    this.retrying = this.status === 'denied' || this.status === 'unavailable';
    this.locationService.requestLocation();
  }

  onRetryVerify(): void {
    this.locationService.retryVerify();
  }

  private updateSlowState(wasVisible: boolean): void {
    clearTimeout(this.slowStateTimer);
    if (!this.isBackgroundState) {
      this.showSlowState = false;
      return;
    }
    // Keep the dialog up if it was already showing (e.g. right after the user tapped Allow)
    this.showSlowState = wasVisible;
    if (!wasVisible) {
      this.slowStateTimer = setTimeout(() => (this.showSlowState = true), 700);
    }
  }

  onReload(): void {
    window.location.reload();
  }

  private detectEnvironment(): void {
    const ua = navigator.userAgent;
    const isIpadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;

    if (/iPhone|iPad|iPod/.test(ua) || isIpadOs) this.platform = 'ios';
    else if (/Android/.test(ua)) this.platform = 'android';
    else if (/Macintosh/.test(ua)) this.platform = 'mac';
    else if (/Windows/.test(ua)) this.platform = 'windows';

    if (/SamsungBrowser/.test(ua)) this.browser = 'samsung';
    else if (/Edg(e|A|iOS)?\//.test(ua)) this.browser = 'edge';
    else if (/Firefox|FxiOS/.test(ua)) this.browser = 'firefox';
    else if (/Chrome|CriOS/.test(ua)) this.browser = 'chrome';
    else if (/Safari/.test(ua)) this.browser = 'safari';
  }
}
