import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, PincodeOption } from '../../services/auth.service';
import { ASSET_URLS } from '../../constants/urls';

/**
 * login           phone (Get OTP in the box) + OTP → password reset to the OTP in the background → logged in
 * register        phone (Get OTP in the box) + OTP + name → account created (OTP as password) → logged in → address
 * address         register step 2: pincode dropdown (needs the new login's token) → Customer record
 */
type Step =
  | 'login'
  | 'register'
  | 'address'
  | 'success';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;
  isOpen = false;
  currentStep: Step = 'login';

  countryCode = '+91';
  countryMaxLength = 10;
  phoneNumber = '';

  /** Login found no account for the number: offer Register */
  notRegistered = false;

  // Register
  firstName = '';
  lastName = '';
  // Pincode dropdown (the Customer's address)
  pincodeQuery = '';
  pincodeOptions: PincodeOption[] = [];
  pincodeOption: PincodeOption | null = null; // picked option; its value is the masterPincodeId
  pincodeStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  pincodeListOpen = false;
  addressLine = ''; // free-text address (house/flat, street, landmark)
  editingAddress = false; // address step opened from checkout "Edit" (vs. register step 2)
  private editCustomerId = ''; // the customer being edited (checkout "Edit")
  private pincodeTimer?: ReturnType<typeof setTimeout>;

  // Phone OTP (sent from the "Get OTP" button in the login / register phone box)
  otp = '';
  otpSent = false; // signup: a code has been sent to the current phone number
  otpResending = false;
  otpCountdown = 0; // seconds left before "Resend" is allowed again (1 min cooldown)
  private otpTimer?: ReturnType<typeof setInterval>;


  isLoading = false;
  errorMessage = '';
  infoMessage = '';
  successTitle = '';

  private sub = new Subscription();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.sub.add(
      this.authService.modalView$.subscribe((view) => {
        this.isOpen = view !== null;
        if (view) {
          this.resetForm();
          if (view === 'edit-address') {
            this.applyAddressPrefill();
          } else {
            this.currentStep = 'login';
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    clearInterval(this.otpTimer);
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  get isPhoneValid(): boolean {
    return this.phoneNumber.replace(/\D/g, '').length === this.countryMaxLength;
  }

  get canLogin(): boolean {
    return this.isPhoneValid && this.otpSent && /^\d{4,8}$/.test(this.otp.trim()) && !this.isLoading;
  }

  get canRegister(): boolean {
    return (
      this.isPhoneValid &&
      !!this.firstName.trim() &&
      !!this.lastName.trim() &&
      this.otpSent &&
      /^\d{4,8}$/.test(this.otp.trim()) &&
      !this.isLoading
    );
  }

  get canSaveAddress(): boolean {
    return !!this.pincodeOption && !!this.addressLine.trim() && !this.isLoading;
  }

  /** Pincode dropdown: search as the user types (pincode digits or area name) */
  onPincodeSearch(query: string): void {
    this.pincodeQuery = query;
    this.pincodeOption = null; // typing again un-picks the previous choice
    clearTimeout(this.pincodeTimer);
    // Empty box = back to the full first page; otherwise search the API (debounced)
    this.pincodeStatus = 'loading';
    this.pincodeListOpen = true;
    this.pincodeTimer = setTimeout(() => this.loadPincodes(query.trim()), query.trim() ? 300 : 0);
  }

  selectPincode(option: PincodeOption): void {
    this.pincodeOption = option;
    this.pincodeQuery = option.label;
    this.pincodeListOpen = false;
  }

  /** Close the list when focus leaves the field (after a click on an option has landed) */
  onPincodeBlur(): void {
    setTimeout(() => (this.pincodeListOpen = false), 150);
  }

  private async loadPincodes(query: string): Promise<void> {
    try {
      const options = await this.authService.searchPincodes(query);
      if (query !== this.pincodeQuery.trim()) return; // typed on meanwhile
      this.pincodeOptions = options;
      this.pincodeStatus = 'ready';
    } catch {
      if (query === this.pincodeQuery.trim()) this.pincodeStatus = 'error';
    }
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const previous = this.phoneNumber;
    this.phoneNumber = input.value.replace(/\D/g, '').slice(0, this.countryMaxLength);
    input.value = this.phoneNumber;
    if (this.phoneNumber === previous) return;
    // A different number needs a fresh "does it exist?" check (and a fresh OTP)
    this.notRegistered = false;
    this.errorMessage = '';
    this.resetOtp();
  }

  clearPhone(): void {
    this.phoneNumber = '';
    this.notRegistered = false;
    this.errorMessage = '';
    this.resetOtp();
  }

  /**
   * Login: verify the FORGOT_PASSWORD OTP, then (in the background) reset the account's
   * password to that verified OTP and log in with it -- the user only sees phone + OTP.
   */
  async onLogin(): Promise<void> {
    if (!this.canLogin) return;
    await this.run(async () => {
      const otp = this.otp.trim();
      await this.authService.verifyOtp(this.phoneNumber, otp, 'FORGOT_PASSWORD');
      const password = this.passwordFromOtp(otp);
      await this.authService.resetPassword(this.phoneNumber, password);
      await this.authService.login(this.phoneNumber, password);
      this.finish('Logged in successfully!');
    });
  }

  goToRegister(): void {
    this.notRegistered = false;
    this.resetOtp();
    this.goTo('register');
  }

  goToLogin(): void {
    this.notRegistered = false;
    this.resetOtp();
    this.goTo('login');
  }

  /** "Get OTP" in the login / register phone box: send (or resend after the cooldown) */
  get canGetOtp(): boolean {
    return this.isPhoneValid && this.otpCountdown === 0 && !this.otpResending && !this.isLoading;
  }

  get getOtpLabel(): string {
    if (this.otpResending) return 'Sending…';
    if (!this.otpSent) return 'Get OTP';
    return this.otpCountdown > 0 ? `Resend in ${this.otpCountdownText}` : 'Resend OTP';
  }

  /**
   * Login: the number must have an account (else offer Register), then a FORGOT_PASSWORD OTP.
   * Register: the number must be free, then a SIGNUP OTP.
   */
  async getOtp(): Promise<void> {
    if (!this.canGetOtp) return;
    const isLogin = this.currentStep === 'login';
    this.otpResending = true;
    this.errorMessage = '';
    this.infoMessage = '';
    this.notRegistered = false;
    try {
      const exists = await this.authService.phoneExists(this.phoneNumber);
      if (isLogin && !exists) {
        // Not an error: the "You're new here" box offers Register instead
        this.notRegistered = true;
        return;
      }
      if (!isLogin && exists) {
        this.errorMessage = 'This number already has an account. Please log in instead.';
        return;
      }
      await this.authService.sendOtp(this.phoneNumber, isLogin ? 'FORGOT_PASSWORD' : 'SIGNUP');
      this.infoMessage = this.otpSent ? 'A new code has been sent.' : `Code sent to ${this.countryCode} ${this.phoneNumber}.`;
      this.otpSent = true;
      this.startOtpCountdown();
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Could not send the code. Please try again.';
    } finally {
      this.otpResending = false;
    }
  }

  /** Register: validate the OTP, then create the account (the verified OTP is its password), log in, and go to address */
  async onRegister(): Promise<void> {
    if (!this.canRegister) return;
    await this.run(async () => {
      await this.authService.verifyOtp(this.phoneNumber, this.otp);
      await this.authService.register(this.phoneNumber, {
        firstName: this.firstName,
        lastName: this.lastName,
        password: this.passwordFromOtp(this.otp.trim())
      });
      this.goTo('address');
      // Logged in now, so the pincode API (needs the token) can fill the dropdown
      this.pincodeStatus = 'loading';
      this.loadPincodes('');
    });
  }

  /** m:ss left on the resend cooldown, e.g. "1:59" */
  get otpCountdownText(): string {
    const m = Math.floor(this.otpCountdown / 60);
    const s = this.otpCountdown % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * The account password made from the verified OTP. The API needs passwords of 8+ characters
   * and OTPs are shorter, so the OTP is repeated until it is long enough ("193807" → "193807193807").
   */
  private passwordFromOtp(otp: string): string {
    return otp.repeat(Math.ceil(8 / otp.length));
  }

  /** Number changed/cleared or login⇄register switched: the code already sent no longer applies */
  private resetOtp(): void {
    if (!this.otpSent) return;
    this.otpSent = false;
    this.otp = '';
    this.otpCountdown = 0;
    clearInterval(this.otpTimer);
  }

  /** Starts (or restarts) the 1-minute resend cooldown countdown */
  private startOtpCountdown(): void {
    clearInterval(this.otpTimer);
    this.otpCountdown = 60;
    this.otpTimer = setInterval(() => {
      this.otpCountdown = Math.max(0, this.otpCountdown - 1);
      if (this.otpCountdown === 0) clearInterval(this.otpTimer);
    }, 1000);
  }

  /** Register step 2: create the Customer with the picked pincode as its address */
  async onSaveAddress(): Promise<void> {
    const pincode = this.pincodeOption;
    if (!this.canSaveAddress || !pincode) return;
    await this.run(async () => {
      // Editing from checkout: send only the addresses array, no name/phone/email/customerTypeId
      if (this.editingAddress) {
        await this.authService.updateCustomerAddress({
          customerId: this.editCustomerId,
          masterPincodeId: pincode.value,
          pincode: pincode.code,
          address: this.addressLine
        });
        this.authService.notifyAddressUpdated({
          masterPincodeId: pincode.value,
          pincode: pincode.code,
          address: this.addressLine.trim()
        });
        this.finish('Address updated!');
        return;
      }
      await this.authService.createCustomer(this.phoneNumber, {
        firstName: this.firstName,
        lastName: this.lastName,
        address: this.addressLine,
        masterPincodeId: pincode.value,
        pincode: pincode.code
      });
      this.finish('Account created!');
    });
  }

  /** Fill the address step from the record being edited (checkout "Edit") */
  private applyAddressPrefill(): void {
    const prefill = this.authService.addressEditPrefill;
    if (!prefill) {
      this.currentStep = 'login';
      return;
    }
    this.editingAddress = true;
    this.editCustomerId = prefill.customerId;
    this.phoneNumber = prefill.phone;
    this.firstName = prefill.firstName;
    this.lastName = prefill.lastName;
    this.addressLine = prefill.address;
    this.pincodeOption = prefill.pincodeOption;
    this.pincodeQuery = prefill.pincodeOption.label;
    this.pincodeStatus = 'ready';
    this.currentStep = 'address';
  }

  /** Back arrow: one step back, or close from a first step */
  goBack(): void {
    if (this.currentStep === 'register') {
      this.goToLogin();
    } else {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    this.close();
  }

  close(): void {
    this.authService.closeLoginModal();
    this.resetForm();
  }

  /** Runs an API action with the loader on, showing the server's message if it fails */
  private async run(action: () => Promise<void>): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';
    try {
      await action();
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private goTo(step: Step): void {
    this.currentStep = step;
    this.errorMessage = '';
    this.infoMessage = '';
  }

  private finish(title: string): void {
    this.successTitle = title;
    this.goTo('success');
    setTimeout(() => this.close(), 1200);
  }

  private resetForm(): void {
    this.currentStep = 'login';
    this.phoneNumber = '';
    this.notRegistered = false;
    this.firstName = '';
    this.lastName = '';
    this.pincodeQuery = '';
    this.pincodeOptions = [];
    this.pincodeOption = null;
    this.pincodeStatus = 'idle';
    this.pincodeListOpen = false;
    this.addressLine = '';
    this.editingAddress = false;
    this.editCustomerId = '';
    clearTimeout(this.pincodeTimer);
    this.otp = '';
    this.otpSent = false;
    this.otpResending = false;
    this.otpCountdown = 0;
    clearInterval(this.otpTimer);
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = false;
  }
}
