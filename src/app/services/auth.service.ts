import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserProfile {
  phoneNumber: string;
  countryCode: string;
  name?: string;
  isLoggedIn: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loginModalOpenSubject = new BehaviorSubject<boolean>(false);
  public isLoginModalOpen$ = this.loginModalOpenSubject.asObservable();

  private userSubject = new BehaviorSubject<UserProfile | null>(this.getInitialUser());
  public currentUser$ = this.userSubject.asObservable();

  private getInitialUser(): UserProfile | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('uc_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  openLoginModal(): void {
    this.loginModalOpenSubject.next(true);
  }

  closeLoginModal(): void {
    this.loginModalOpenSubject.next(false);
  }

  login(phoneNumber: string, countryCode = '+91'): void {
    const user: UserProfile = {
      phoneNumber,
      countryCode,
      name: 'UC Customer',
      isLoggedIn: true
    };
    this.userSubject.next(user);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('uc_user', JSON.stringify(user));
    }
    this.closeLoginModal();
  }

  logout(): void {
    this.userSubject.next(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('uc_user');
    }
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value?.isLoggedIn;
  }
}
