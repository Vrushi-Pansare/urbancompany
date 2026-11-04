import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, Subject, map } from 'rxjs';
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

/** Which auth popup is open: the login flow, change password, or editing a saved address */
export type AuthModalView = 'login' | 'change-password' | 'edit-address' | null;

/** Prefill passed to the address dialog when editing an existing address from checkout */
export interface AddressEditPrefill {
  customerId: string;
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  pincodeOption: PincodeOption;
}

/** The address just saved from the edit dialog, so checkout can show it without a re-fetch */
export interface AddressUpdate {
  masterPincodeId: string;
  pincode: string;
  address: string;
}

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
  address: string; // free-text address (house/flat, street, landmark)
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

  /** Prefill for the address dialog when opened in edit mode (checkout "Edit") */
  addressEditPrefill: AddressEditPrefill | null = null;
  private addressUpdatedSubject = new Subject<AddressUpdate>();
  /** Emits the saved address after an edit, so checkout can show it without a re-fetch */
  public addressUpdated$ = this.addressUpdatedSubject.asObservable();

  private userSubject = new BehaviorSubject<UserProfile | null>(this.readStorage<UserProfile>(USER_KEY));
  public currentUser$ = this.userSubject.asObservable();

  private session: AuthSession | null = this.readStorage<AuthSession>(SESSION_KEY);
  private refreshPromise: Promise<string | null> | null = null;

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

  /** Open the address dialog prefilled, to edit an existing saved address */
  openEditAddressModal(prefill: AddressEditPrefill): void {
    this.addressEditPrefill = prefill;
    this.modalViewSubject.next('edit-address');
  }

  /** Called by the address dialog after an edit is saved */
  notifyAddressUpdated(update: AddressUpdate): void {
    this.addressUpdatedSubject.next(update);
  }

  closeLoginModal(): void {
    this.modalViewSubject.next(null);
    this.addressEditPrefill = null;
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

    const refreshToken = data.refreshToken ?? data.tokens?.refreshToken;
    this.session = {
      accessToken,
      refreshToken,
      response: data
    };
    this.writeStorage(SESSION_KEY, this.session);
    // Mirror the refresh token into a cookie so /auth/refresh can read it (fetch can't set a Cookie header)
    if (refreshToken) this.setRefreshCookie(refreshToken);

    const user: UserProfile = {
      phoneNumber: phone.replace(/\D/g, '').slice(-10),
      countryCode: COUNTRY_CODE,
      name,
      isLoggedIn: true
    };
    this.userSubject.next(user);
    this.writeStorage(USER_KEY, user);
  }

  /** Sends a signup OTP to the phone number (also used for "resend") */
  async sendOtp(phone: string, purposeCode = 'SIGNUP'): Promise<void> {
    await this.post(API_URLS.OTP_CREATE, { contact: this.toE164(phone), purposeCode });
  }

  /** Validates the OTP the user entered; throws AuthError with the server message on failure */
  async verifyOtp(phone: string, otp: string, purposeCode = 'SIGNUP'): Promise<void> {
    await this.post(API_URLS.OTP_VALIDATE, { contact: this.toE164(phone), purposeCode, otp: otp.trim() });
  }

  /**
   * Forgot-password: set a new password after the FORGOT_PASSWORD OTP has been verified.
   * Public endpoint (no token) -- the verified OTP is what authorises the reset server-side.
   */
  async resetPassword(phone: string, newPassword: string): Promise<void> {
    await this.post(API_URLS.RESET_PASSWORD, { contact: this.toE164(phone), newPassword });
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
        phoneNumber: phone.replace(/\D/g, '').slice(-10), // 10 digits only, no country code
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
        addresses: [{ masterPincodeId: details.masterPincodeId, pincode: details.pincode, address: details.address.trim() }]
      },
      this.authHeader()
    );
  }

  /** Update the primary address on the logged-in user's Customer record (checkout "Edit") */
  async updateCustomerAddress(details: { customerId: string; masterPincodeId: string; pincode: string; address: string }): Promise<void> {
    await this.patch(
      `${CUSTOMER_CREATE_URL}/${encodeURIComponent(details.customerId)}`,
      {
        primaryAddressPatch: {
          masterPincodeId: details.masterPincodeId,
          pincode: details.pincode,
          address: details.address.trim()
        }
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
    const url = `${PINCODES_URL}?${new URLSearchParams(params)}`;
    const fetchOnce = (token: string) =>
      fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });

    let res: Response;
    try {
      if (!this.session?.accessToken) throw new AuthError('Please log in again.', 401);
      res = await fetchOnce(this.session.accessToken);
      // Access token expired: refresh once and retry
      if (res.status === 401) {
        const newToken = await this.refreshAccessToken();
        if (newToken) res = await fetchOnce(newToken);
      }
    } catch (err) {
      if (err instanceof AuthError) throw err;
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
    this.clearRefreshCookie();
  }

  /**
   * Refreshes the access token via POST /auth/refresh (sends the netrax_refresh_token cookie).
   * Concurrent callers share one in-flight request. Returns the new token, or null (and logs out).
   */
  refreshAccessToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async doRefresh(): Promise<string | null> {
    let res: Response;
    try {
      res = await fetch(API_URLS.REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include', // send the netrax_refresh_token cookie
        body: JSON.stringify({ refreshToken: this.session?.refreshToken ?? '' })
      });
    } catch {
      return null; // network error: don't log out, let the caller surface it
    }
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.success === false) {
      this.logout();
      return null;
    }
    const data = body?.data ?? body ?? {};
    const token = data.accessToken ?? data.token ?? data.tokens?.accessToken ?? data.access_token;
    if (!token) {
      this.logout();
      return null;
    }
    const refreshToken = data.refreshToken ?? data.tokens?.refreshToken ?? this.session?.refreshToken;
    this.session = { accessToken: token, refreshToken, response: this.session?.response ?? data };
    this.writeStorage(SESSION_KEY, this.session);
    if (refreshToken) this.setRefreshCookie(refreshToken);
    return token;
  }

  private setRefreshCookie(token: string): void {
    try {
      // 14 days; readable so same-origin /api requests forward it through the proxy
      document.cookie = `netrax_refresh_token=${token}; path=/; max-age=1209600; SameSite=Lax`;
    } catch {
      /* SSR / no document */
    }
  }

  private clearRefreshCookie(): void {
    try {
      document.cookie = 'netrax_refresh_token=; path=/; max-age=0; SameSite=Lax';
    } catch {
      /* SSR / no document */
    }
  }

  /** POST JSON; throws AuthError with the server's message on failure */
  private post(url: string, payload: unknown, headers: Record<string, string> = {}): Promise<any> {
    return this.sendJson('POST', url, payload, headers);
  }

  /** PATCH JSON; throws AuthError with the server's message on failure */
  private patch(url: string, payload: unknown, headers: Record<string, string> = {}): Promise<any> {
    return this.sendJson('PATCH', url, payload, headers);
  }

  private async sendJson(
    method: 'POST' | 'PATCH',
    url: string,
    payload: unknown,
    headers: Record<string, string> = {},
    retried = false
  ): Promise<any> {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new AuthError('Network error. Check your connection and try again.', 0);
    }

    const body = await res.json().catch(() => null);
    if (res.ok && body?.success !== false) return body;

    // Access token expired on an authenticated call: refresh once and retry
    if (res.status === 401 && !retried && headers['Authorization']) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return this.sendJson(method, url, payload, { ...headers, Authorization: `Bearer ${newToken}` }, true);
      }
    }

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
