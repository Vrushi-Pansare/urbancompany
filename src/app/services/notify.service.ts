import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Minimal transient toast/snackbar shown at the app root. */
@Injectable({
  providedIn: 'root'
})
export class NotifyService {
  private messageSubject = new BehaviorSubject<string | null>(null);
  public message$ = this.messageSubject.asObservable();

  private timer?: ReturnType<typeof setTimeout>;

  show(message: string, duration = 3500): void {
    this.messageSubject.next(message);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.messageSubject.next(null), duration);
  }

  clear(): void {
    clearTimeout(this.timer);
    this.messageSubject.next(null);
  }
}
