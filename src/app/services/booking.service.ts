import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BOOKING_URLS, ASSIGNEE_ROLE_ID } from '../constants/urls';
import { AuthService } from './auth.service';

export interface CustomerAddress {
  masterPincodeId: string;
  address: string;
  formattedAddress: string;
}

/** The logged-in user's Customer record, in the field names the Inquiry Call API expects */
export interface BookingCustomer {
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhoneNumber: string;
  addresses: CustomerAddress[];
}

export interface BookingSlot {
  id: string;
  label: string;
}

export interface CallProduct {
  customerProductId: null;
  categoryId: string;
  groupId: string;
  productId: string;
  unitPrice: number;
}

export interface CreateCallPayload {
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhoneNumber: string;
  addressMasterPincodeId: string;
  formattedAddress: string;
  address: string;
  callProducts: CallProduct[];
  userAssignments: { userId: string }[];
  slots: string;
}

/** One Inquiry Call as read back from the calls API (only the fields the UI uses) */
export interface BookingCall {
  id: string;
  code?: string;
  status?: string;
  createdAt?: string;
  formattedAddress?: string;
  address?: string;
  slotLabel?: string;
  products: { productId: string; name?: string; unitPrice: number }[];
  total: number;
  raw: any;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** API failure; `message` is the server's message when it sent one */
export class BookingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** The logged-in user's Customer, loaded on login so checkout already has it */
export interface CustomerState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  customer: BookingCustomer | null; // null when ready = no Customer record for this phone
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  // Slots rarely change -- one request per page load, shared by every checkout visit
  private slotsRequest?: Promise<BookingSlot[]>;
  private productRequests = new Map<string, Promise<CallProduct>>();

  private customerSubject = new BehaviorSubject<CustomerState>({ status: 'idle', customer: null });
  public customer$ = this.customerSubject.asObservable();
  private customerPhone: string | null = null;

  constructor(private auth: AuthService) {
    // Drop the loaded Customer on logout / user switch; checkout loads it again
    this.auth.currentUser$.subscribe((user) => {
      if ((user?.phoneNumber ?? null) === this.customerPhone) return;
      this.customerPhone = null;
      this.customerSubject.next({ status: 'idle', customer: null });
    });
  }

  /** Loads the logged-in user's Customer (called by checkout on open, and by its Retry) */
  async loadCustomer(): Promise<void> {
    const phone = this.auth.currentUser?.phoneNumber ?? null;
    if (!phone) return;
    this.customerPhone = phone;
    this.customerSubject.next({ status: 'loading', customer: null });

    try {
      const customer = await this.getCustomer(phone);
      if (phone !== this.customerPhone) return; // logged out / switched user meanwhile
      this.customerSubject.next({ status: 'ready', customer });
    } catch (err) {
      if (phone !== this.customerPhone) return;
      const error = err instanceof BookingError ? err.message : 'Could not load your details.';
      this.customerSubject.next({ status: 'error', customer: null, error });
    }
  }

  /**
   * 1. GET reference-options?search=<phone> -> the matching option's `value` is the customerId
   * 2. GET reference-options/{customerId}    -> the Customer's data
   */
  private async getCustomer(phone: string): Promise<BookingCustomer | null> {
    const digits = phone.replace(/\D/g, '').slice(-10);
    const body = await this.get(BOOKING_URLS.CUSTOMER_OPTIONS, { page: 1, limit: 25, search: digits });
    const options = this.optionList(body);
    // Labels look like "First Last — 06352328542": take the option whose number matches, else the top result
    const option = options.find((o) => o.label.replace(/\D/g, '').slice(-10) === digits) ?? options[0];
    if (isDevMode()) {
      console.log('[booking] customer search', { results: options.length, customerId: option?.value ?? null, responseShape: this.shape(body) });
    }
    if (!option) return null;

    const customerId = option.value;
    const detail = await this.get(`${BOOKING_URLS.CUSTOMER_OPTIONS}/${encodeURIComponent(customerId)}`);
    if (isDevMode()) console.log('[booking] customer detail', { responseShape: this.shape(detail) });
    const ref = detail?.data ?? {};
    const record = ref.data && typeof ref.data === 'object' ? ref.data : ref;
    const masterPincodeId = this.refId(record.masterPincodeId);
    return {
      customerId: ref.value ?? customerId,
      customerFirstName: record.firstName ?? '',
      customerLastName: record.lastName ?? '',
      customerPhoneNumber: record.phoneNumber ?? '',
      // The reference record carries the customer's first address
      addresses: masterPincodeId
        ? [
            {
              masterPincodeId,
              address: record.address ?? '',
              formattedAddress: record.formattedAddress || record.address || ''
            }
          ]
        : []
    };
  }

  /**
   * Step 4: one callProducts[] row for a cart product id (the cart already has the id, so step 3's
   * product list isn't needed). Cached per id, so checkout's load and the booking share one request.
   */
  getCallProduct(productId: string): Promise<CallProduct> {
    let request = this.productRequests.get(productId);
    if (!request) {
      request = this.fetchCallProduct(productId).catch((err) => {
        this.productRequests.delete(productId); // allow a retry after failure
        throw err;
      });
      this.productRequests.set(productId, request);
    }
    return request;
  }

  private async fetchCallProduct(productId: string): Promise<CallProduct> {
    const body = await this.get(`${BOOKING_URLS.PRODUCT_OPTIONS}/${encodeURIComponent(productId)}`);
    const ref = body?.data ?? {};
    const record = ref.data ?? {};
    // 0 is a valid price; a missing one isn't (Number(null) and Number('') are also 0, so check first)
    const rawPrice = record.unitPrice;
    const unitPrice = rawPrice === null || rawPrice === undefined || rawPrice === '' ? NaN : Number(rawPrice);
    const categoryId = this.refId(record.categoryId);
    const groupId = this.refId(record.groupId);
    if (!categoryId || !groupId || !Number.isFinite(unitPrice)) {
      throw new BookingError('One of the services in your cart is no longer available.', 0);
    }
    return {
      customerProductId: null,
      categoryId,
      groupId,
      productId: ref.value ?? productId,
      unitPrice
    };
  }

  /** Bookable time slots, in the configured sort order */
  getSlots(): Promise<BookingSlot[]> {
    if (!this.slotsRequest) {
      this.slotsRequest = this.fetchSlots().catch((err) => {
        this.slotsRequest = undefined; // allow a retry after failure
        throw err;
      });
    }
    return this.slotsRequest;
  }

  /**
   * Picks a random eligible professional for this address PIN (Service Engineer role only; no
   * category). null when nobody covers it -- the call is then created with no assignment.
   */
  async pickAssignee(masterPincodeId: string): Promise<string | null> {
    const body = await this.get(BOOKING_URLS.CALL_CREATE_CONTEXT, {
      assignmentPurpose: 'create',
      roleId: ASSIGNEE_ROLE_ID,
      addressMasterPincodeId: masterPincodeId,
      page: 1,
      limit: 25
    });
    const ids = this.assigneeIds(body?.data ?? body);
    return ids.length ? ids[Math.floor(Math.random() * ids.length)] : null;
  }

  /**
   * Creates the Inquiry Call. Pass the same idempotencyKey when retrying one submission,
   * so a request that reached the server but whose response was lost isn't booked twice.
   */
  async createCall(payload: CreateCallPayload, idempotencyKey: string): Promise<BookingCall> {
    const body = await this.request('POST', BOOKING_URLS.CALLS, payload, { 'Idempotency-Key': idempotencyKey });
    return this.toCall(body?.data ?? body);
  }

  /** The user's active bookings, newest first */
  async listCalls(page = 1, limit = 25): Promise<{ calls: BookingCall[]; pagination: Pagination | null }> {
    const body = await this.get(BOOKING_URLS.CALLS, {
      page,
      limit,
      status: 'ACTIVE',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    const records: any[] = Array.isArray(body?.data) ? body.data : [];
    return { calls: records.map((r) => this.toCall(r)), pagination: body?.meta?.pagination ?? null };
  }

  async getCall(callId: string): Promise<BookingCall> {
    const body = await this.get(`${BOOKING_URLS.CALLS}/${encodeURIComponent(callId)}`);
    return this.toCall(body?.data ?? body);
  }

  /** New key per submission; crypto.randomUUID needs a secure context (https / localhost) */
  newIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async fetchSlots(): Promise<BookingSlot[]> {
    const body = await this.get(BOOKING_URLS.SLOT_RECORDS, {
      page: 1,
      limit: 25,
      sortBy: 'sortOrder',
      sortOrder: 'asc'
    });
    // `slots` must be sent the record id, never the label
    const slots = this.findList(body, (r) => ({
      id: r?.id ?? r?._id,
      label: String(r?.label ?? r?.name ?? r?.data?.label ?? r?.data?.name ?? '')
    })).filter((s) => s.label);
    if (isDevMode()) console.log('[booking] slots', { results: slots.length, responseShape: this.shape(body) });
    return slots.map(({ id, label }) => ({ id, label }));
  }

  /** The options list in a reference-options response */
  private optionList(body: any): Array<{ id: string; value: string; label: string }> {
    return this.findList(body, (o) => ({ id: o?.value ?? o?.id, label: String(o?.label ?? '') })).map((o) => ({
      ...o,
      value: o.id
    }));
  }

  /**
   * The first list in a response, wherever it's nested (data[], data.data[], data.options[], ...),
   * mapped by `pick`; items without a string id are dropped.
   */
  private findList<T extends { id: unknown }>(body: any, pick: (item: any) => T): Array<T & { id: string }> {
    const queue: any[] = [body];
    for (let visited = 0; queue.length && visited < 50; visited++) {
      const node = queue.shift();
      if (Array.isArray(node)) {
        const items = node.map(pick).filter((i): i is T & { id: string } => typeof i.id === 'string' && !!i.id);
        if (items.length) return items;
      } else if (node && typeof node === 'object') {
        queue.push(...Object.values(node));
      }
    }
    return [];
  }

  /**
   * Reference fields come back as { value, label, code } objects (e.g. masterPincodeId);
   * the APIs take only the id, so use `value`. Plain id strings pass through.
   */
  private refId(field: any): string {
    const id = field && typeof field === 'object' ? field.value ?? field.id : field;
    return typeof id === 'string' ? id : '';
  }

  /** Keys/types only -- for dev logs, so no customer data reaches the console */
  private shape(value: any, depth = 0): any {
    if (Array.isArray(value)) return value.length ? [this.shape(value[0], depth + 1)] : [];
    if (value && typeof value === 'object' && depth < 4) {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.shape(v, depth + 1)]));
    }
    return value === null ? 'null' : typeof value;
  }

  /**
   * Eligible professionals from create-context: data.assignment.candidates.items[].userId.
   * The backend already applied the serviceable-area rules; no candidates = empty list, no fallback.
   */
  private assigneeIds(data: any): string[] {
    const items: any[] = data?.assignment?.candidates?.items ?? [];
    return items.map((u) => u?.userId).filter((id): id is string => typeof id === 'string' && !!id);
  }

  private toCall(r: any): BookingCall {
    const products: any[] = Array.isArray(r?.callProducts) ? r.callProducts : [];
    const mapped = products.map((p) => ({
      productId: p.productId,
      name: p.product?.label ?? p.product?.name,
      unitPrice: Number(p.unitPrice) || 0
    }));
    const slot = r?.slots;
    return {
      id: r?.id,
      code: r?.code,
      status: r?.status,
      createdAt: r?.createdAt,
      formattedAddress: r?.formattedAddress,
      address: r?.address,
      slotLabel: typeof slot === 'object' && slot ? slot.label ?? slot.name : undefined,
      products: mapped,
      total: mapped.reduce((sum, p) => sum + p.unitPrice, 0),
      raw: r
    };
  }

  private get(url: string, params: Record<string, string | number> = {}): Promise<any> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return this.request('GET', query ? `${url}?${query}` : url);
  }

  /** Authenticated JSON request; throws BookingError with the server's message on failure */
  private async request(
    method: 'GET' | 'POST',
    url: string,
    payload?: unknown,
    headers: Record<string, string> = {}
  ): Promise<any> {
    const token = this.auth.accessToken;
    if (!token) throw new BookingError('Please log in to continue.', 401);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers
        },
        body: payload !== undefined ? JSON.stringify(payload) : undefined
      });
    } catch {
      throw new BookingError('Network error. Check your connection and try again.', 0);
    }

    const body = await res.json().catch(() => null);
    if (res.ok && body?.success !== false) return body;

    if (res.status === 401) {
      // Token expired / revoked -- same handling as AuthService.changePassword
      this.auth.logout();
      throw new BookingError('Your session has expired. Please log in again.', 401);
    }
    const error = body?.error;
    const message: string =
      (typeof error === 'string' ? error : error?.message) || body?.message || 'Something went wrong. Please try again.';
    throw new BookingError(message, res.status);
  }
}
