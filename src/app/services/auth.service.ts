import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { API_URLS, COMPANY_SUBDOMAIN, CUSTOMER_CREATE_URL, CUSTOMER_ROLE_ID, CUSTOMER_TYPE_ID, PINCODES_URL } from '../constants/urls';

export interface UserProfile {
  phoneNumber: string;
  countryCode: string;
  name?: string;
  isLoggedIn: boolean;
}

/** What the login API returned, kept for authenticated calls */
interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  response: unknown;
}

/** Which auth popup is open: the login flow, or change password (logged-in users) */
export type AuthModalView = 'login' | 'change-password' | null;

export interface RegisterDetails {
  firstName: string;
  lastName: string;
  password: string;
}

/** What the Customer record is created from (register step 2) */
export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  pincode: string; // 6 digits, e.g. "380009"
  masterPincodeId: string; // the picked pincode option's value
}

/** A master pincode record, e.g. { value: "6a7af8e2…", label: "380001 — Raipur (Ahmedabad), Ahmedabad(GJ)", code: "380001" } */
export interface PincodeOption {
  value: string;
  label: string;
  code: string;
}

/** API failure. `invalidCredentials` = wrong password (or current password, on change-password) */
export class AuthError extends Error {
  constructor(message: string, readonly status: number, readonly invalidCredentials = false) {
    super(message);
  }
}

const USER_KEY = 'uc_user';
const SESSION_KEY = 'uc_session';
const COUNTRY_CODE = '+91';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private modalViewSubject = new BehaviorSubject<AuthModalView>(null);
  public modalView$ = this.modalViewSubject.asObservable();
  public isLoginModalOpen$ = this.modalView$.pipe(map((view) => view !== null));

  private userSubject = new BehaviorSubject<UserProfile | null>(this.readStorage<UserProfile>(USER_KEY));
  public currentUser$ = this.userSubject.asObservable();

  private session: AuthSession | null = this.readStorage<AuthSession>(SESSION_KEY);

  constructor() {
    // Users saved by the old OTP mock have no token — make them log in for real
    if (this.userSubject.value && !this.session?.accessToken) this.logout();
  }

  openLoginModal(): void {
    this.modalViewSubject.next('login');
  }

  openChangePasswordModal(): void {
    this.modalViewSubject.next('change-password');
  }

  closeLoginModal(): void {
    this.modalViewSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value?.isLoggedIn;
  }

  /** Bearer token for the authenticated module-config APIs (null when logged out) */
  get accessToken(): string | null {
    return this.session?.accessToken ?? null;
  }

  /** The logged-in user right now (the value currentUser$ last emitted) */
  get currentUser(): UserProfile | null {
    return this.userSubject.value;
  }
  /** "9876543210" -> "+919876543210", the format the user APIs use for username/phone/contact */
  toE164(phone: string): string {
    return `${COUNTRY_CODE}${phone.replace(/\D/g, '').slice(-10)}`;
  }

  /** Is there a MyGenie account for this 10-digit number? */
  async phoneExists(phone: string): Promise<boolean> {
    const digits = phone.replace(/\D/g, '').slice(-10);
    const body = await this.post(API_URLS.PUBLIC_LISTING, {
      moduleCode: 'user',
      filters: [{ recordPath: 'phoneNumber', value: digits }],
      page: 1,
      limit: 10
    });
    // The filter is a partial match ("987" matches any number containing it), so compare exactly
    const users: Array<{ phoneNumber?: string }> = Array.isArray(body?.data) ? body.data : [];
    return users.some((u) => (u.phoneNumber ?? '').replace(/\D/g, '').slice(-10) === digits);
  }

  async login(phone: string, password: string): Promise<void> {
    const body = await this.post(API_URLS.LOGIN, {
      username: this.toE164(phone),
      password,
      companySubdomain: COMPANY_SUBDOMAIN
    });

    const data = body?.data ?? body ?? {};
    const accessToken = data.accessToken ?? data.token ?? data.tokens?.accessToken ?? data.access_token;
    if (!accessToken) {
      throw new AuthError('Login failed. Please try again.', 200);
    }
    const apiUser = data.user ?? {};
    const name = apiUser.fullName || [apiUser.firstName, apiUser.lastName].filter(Boolean).join(' ') || undefined;

    this.session = {
      accessToken,
      refreshToken: data.refreshToken ?? data.tokens?.refreshToken,
      response: data
    };
    this.writeStorage(SESSION_KEY, this.session);

    const user: UserProfile = {
      phoneNumber: phone.replace(/\D/g, '').slice(-10),
      countryCode: COUNTRY_CODE,
      name,
      isLoggedIn: true
    };
    this.userSubject.next(user);
    this.writeStorage(USER_KEY, user);
  }

  /**
   * Register step 1: creates the user account (public API), then logs in -- the pincode
   * dropdown and the customers API in step 2 both need the token.
   */
  async register(phone: string, details: RegisterDetails): Promise<void> {
    const e164 = this.toE164(phone);
    const firstName = details.firstName.trim();
    const lastName = details.lastName.trim();
    await this.post(API_URLS.PUBLIC_CREATE, {
      moduleCode: 'user',
      data: {
        username: e164,
        fullName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phoneNumber: e164,
        roleId: CUSTOMER_ROLE_ID,
        password: details.password
      }
    });

    await this.login(phone, details.password);
  }

  /**
   * Register step 2: the logged-in user's Customer record, with the address picked in the
   * pincode dropdown -- booking reads the customer and address from it.
   */
  async createCustomer(phone: string, details: CustomerDetails): Promise<void> {
    await this.post(
      CUSTOMER_CREATE_URL,
      {
        firstName: details.firstName.trim(),
        lastName: details.lastName.trim(),
        phoneNumber: phone.replace(/\D/g, '').slice(-10), // 10 digits, as the Customer API stores it
        email: details.email.trim(),
        customerTypeId: CUSTOMER_TYPE_ID,
        addresses: [{ masterPincodeId: details.masterPincodeId, pincode: details.pincode }]
      },
      this.authHeader()
    );
  }

  /**
   * Pincode dropdown options (first page when `search` is empty). Each option's value is the
   * masterPincodeId. Needs the user's token, so the register popup shows it after signup.
   */
  async searchPincodes(search: string): Promise<PincodeOption[]> {
    const params: Record<string, string> = { page: '1', limit: '25' };
    if (search) params['search'] = search;
    let res: Response;
    try {
      res = await fetch(`${PINCODES_URL}?${new URLSearchParams(params)}`, {
        headers: { Accept: 'application/json', ...this.authHeader() }
      });
    } catch {
      throw new AuthError('Network error. Check your connection and try again.', 0);
    }
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.success === false) throw new AuthError('Could not load pincodes. Please try again.', res.status);

    const list: any[] = [body?.data, body?.data?.data, body?.data?.items, body?.data?.options].find(Array.isArray) ?? [];
    if (isDevMode()) console.log('[auth] pincodes', { results: list.length, itemKeys: Object.keys(list[0] ?? {}) });
    return list
      .map((o) => {
        const code = String(o?.code ?? o?.pincode ?? '');
        const area = o?.areaName ?? o?.area ?? o?.name ?? o?.city ?? '';
        const label = String(o?.label ?? (area ? `${code} — ${area}` : code));
        return { value: o?.value ?? o?.id ?? o?._id, label, code: code || (label.match(/^\d{6}/)?.[0] ?? '') };
      })
      .filter((o) => typeof o.value === 'string' && !!o.value);
  }

  private authHeader(): Record<string, string> {
    if (!this.session?.accessToken) throw new AuthError('Please log in again.', 401);
    return { Authorization: `Bearer ${this.session.accessToken}` };
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.session?.accessToken) {
      this.logout();
      throw new AuthError('Your session has expired. Please log in again.', 401);
    }
    await this.post(
      API_URLS.CHANGE_PASSWORD,
      { currentPassword, newPassword },
      { Authorization: `Bearer ${this.session.accessToken}` }
    );
  }

  logout(): void {
    this.session = null;
    this.userSubject.next(null);
    this.removeStorage(USER_KEY);
    this.removeStorage(SESSION_KEY);
  }

  /** POST JSON; throws AuthError with the server's message on failure */
  private async post(url: string, payload: unknown, headers: Record<string, string> = {}): Promise<any> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new AuthError('Network error. Check your connection and try again.', 0);
    }

    const body = await res.json().catch(() => null);
    if (res.ok && body?.success !== false) return body;

    const error = body?.error;
    const message: string =
      (typeof error === 'string' ? error : error?.message) || body?.message || 'Something went wrong. Please try again.';
    const invalidCredentials =
      res.status === 401 || /invalid credential|incorrect password|wrong password|invalid password/i.test(message);
    throw new AuthError(message, res.status, invalidCredentials);
  }

  private readStorage<T>(key: string): T | null {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked (private mode) — the session just won't survive a reload
    }
  }

  private removeStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
