import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';

const STORAGE_KEY = 'uc_cookie_consent';

export type ConsentChoice = 'granted' | 'denied';

/** Reads the saved cookie choice — check this before loading any analytics/ads script. */
export function getCookieConsent(): ConsentChoice | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw).choice as ConsentChoice) : null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [NgIf],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.scss',
})
export class CookieConsentComponent implements OnInit {
  visible = false;
  closing = false;

  ngOnInit(): void {
    if (typeof window === 'undefined') return;
    this.visible = !getCookieConsent();
  }

  accept(): void {
    this.save('granted');
  }

  reject(): void {
    this.save('denied');
  }

  private save(choice: ConsentChoice): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    } catch {
      // Storage blocked (private mode etc.) — the choice still applies to this visit.
    }
    this.closing = true;
    setTimeout(() => (this.visible = false), 200);
  }
}
