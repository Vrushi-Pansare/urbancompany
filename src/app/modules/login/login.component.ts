import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthError, AuthService, PincodeOption } from '../../services/auth.service';
import { ASSET_URLS } from '../../constants/urls';

/**
 * login           phone + password (checks the number exists first)
 * register        phone + name + email + password → account created → logged in → address
 * address         register step 2: pincode dropdown (needs the new login's token) → Customer record
 * change-password logged-in users, opened from the profile menu
 */
type Step = 'login' | 'register' | 'otp' | 'address' | 'change-password' | 'success';

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
  password = '';
  showPassword = false;

  /** Login found no account for the number: offer Register */
  notRegistered = false;

  // Register
  firstName = '';
  lastName = '';
  email = '';
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
  newPassword = '';
  confirmPassword = '';

  // Phone OTP (signup verification step, between register and address)
  otp = '';
  otpResending = false;
  otpCountdown = 0; // seconds left before "Resend" is allowed again (2 min cooldown)
  private otpTimer?: ReturnType<typeof setInterval>;

  // Change password
  currentPassword = '';

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
          if (view === 'change-password') {
            this.currentStep = 'change-password';
          } else if (view === 'edit-address') {
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
    return this.isPhoneValid && !!this.password && !this.isLoading;
  }

  get canRegister(): boolean {
    return (
      this.isPhoneValid &&
      !!this.firstName.trim() &&
      !!this.lastName.trim() &&
      this.isEmailValid &&
      this.passwordsReady &&
      !this.isLoading
    );
  }

  get canSaveAddress(): boolean {
    return !!this.pincodeOption && !!this.addressLine.trim() && !this.isLoading;
  }

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
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

  get canChangePassword(): boolean {
    return !!this.currentPassword && this.passwordsReady && !this.isLoading;
  }

  /** New password typed twice */
  get passwordsReady(): boolean {
    return !!this.newPassword && !!this.confirmPassword;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.phoneNumber = input.value.replace(/\D/g, '').slice(0, this.countryMaxLength);
    input.value = this.phoneNumber;
    // A different number needs a fresh "does it exist?" check
    this.notRegistered = false;
    this.errorMessage = '';
  }

  clearPhone(): void {
    this.phoneNumber = '';
    this.notRegistered = false;
    this.errorMessage = '';
  }

  /** Login: check the number exists, then log in with the password */
  async onLogin(): Promise<void> {
    if (!this.canLogin) return;
    await this.run(async () => {
      if (!(await this.authService.phoneExists(this.phoneNumber))) {
        // Not an error: the "You're new here" box offers Register instead
        this.notRegistered = true;
        return;
      }
      try {
        await this.authService.login(this.phoneNumber, this.password);
      } catch (err) {
        if (err instanceof AuthError && err.invalidCredentials) {
          this.errorMessage = "That password doesn't match this number. Please check it and try again.";
          return;
        }
        throw err;
      }
      this.finish('Logged in successfully!');
    });
  }

  goToRegister(): void {
    this.newPassword = this.password; // keep what they already typed
    this.confirmPassword = '';
    this.notRegistered = false;
    this.goTo('register');
  }

  goToLogin(): void {
    this.notRegistered = false;
    this.goTo('login');
  }

  /** Register step 1: verify the number is free, send an OTP, then go to the OTP step */
  async onRegister(): Promise<void> {
    if (!this.canRegister || !this.checkPasswordsMatch()) return;
    await this.run(async () => {
      if (await this.authService.phoneExists(this.phoneNumber)) {
        this.errorMessage = 'This number already has an account. Please log in instead.';
        return;
      }
      await this.authService.sendOtp(this.phoneNumber);
      this.otp = '';
      this.startOtpCountdown();
      this.goTo('otp');
    });
  }

  get canVerifyOtp(): boolean {
    return /^\d{4,8}$/.test(this.otp.trim()) && !this.isLoading;
  }

  /** OTP step: validate the code, then create the account, log in, and go to address */
  async onVerifyOtp(): Promise<void> {
    if (!this.canVerifyOtp) return;
    await this.run(async () => {
      await this.authService.verifyOtp(this.phoneNumber, this.otp);
      await this.authService.register(this.phoneNumber, {
        firstName: this.firstName,
        lastName: this.lastName,
        password: this.newPassword
      });
      this.goTo('address');
      // Logged in now, so the pincode API (needs the token) can fill the dropdown
      this.pincodeStatus = 'loading';
      this.loadPincodes('');
    });
  }

  get canResendOtp(): boolean {
    return this.otpCountdown === 0 && !this.otpResending && !this.isLoading;
  }

  /** m:ss left on the resend cooldown, e.g. "1:59" */
  get otpCountdownText(): string {
    const m = Math.floor(this.otpCountdown / 60);
    const s = this.otpCountdown % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** Resend the signup OTP (allowed once the 2-minute cooldown elapses) */
  async resendOtp(): Promise<void> {
    if (!this.canResendOtp) return;
    this.otpResending = true;
    this.errorMessage = '';
    try {
      await this.authService.sendOtp(this.phoneNumber);
      this.infoMessage = 'A new code has been sent.';
      this.startOtpCountdown();
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Could not resend the code. Please try again.';
    } finally {
      this.otpResending = false;
    }
  }

  /** Starts (or restarts) the 2-minute resend cooldown countdown */
  private startOtpCountdown(): void {
    clearInterval(this.otpTimer);
    this.otpCountdown = 120;
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
        email: this.email,
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
    this.email = prefill.email;
    this.addressLine = prefill.address;
    this.pincodeOption = prefill.pincodeOption;
    this.pincodeQuery = prefill.pincodeOption.label;
    this.pincodeStatus = 'ready';
    this.currentStep = 'address';
  }

  async onChangePassword(): Promise<void> {
    if (!this.canChangePassword || !this.checkPasswordsMatch()) return;
    await this.run(async () => {
      try {
        await this.authService.changePassword(this.currentPassword, this.newPassword);
      } catch (err) {
        if (err instanceof AuthError && err.invalidCredentials) {
          this.errorMessage = "Your current password doesn't match. Please try again.";
          return;
        }
        throw err;
      }
      this.finish('Password changed!');
    });
  }

  /** Back arrow: one step back, or close from a first step */
  goBack(): void {
    if (this.currentStep === 'register') {
      this.goToLogin();
    } else if (this.currentStep === 'otp') {
      this.goTo('register');
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

  private checkPasswordsMatch(): boolean {
    if (this.newPassword === this.confirmPassword) return true;
    this.errorMessage = 'Passwords do not match.';
    return false;
  }

  private goTo(step: Step): void {
    this.currentStep = step;
    this.errorMessage = '';
    this.infoMessage = '';
    this.showPassword = false;
  }

  private finish(title: string): void {
    this.successTitle = title;
    this.goTo('success');
    setTimeout(() => this.close(), 1200);
  }

  private resetForm(): void {
    this.currentStep = 'login';
    this.phoneNumber = '';
    this.password = '';
    this.showPassword = false;
    this.notRegistered = false;
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.pincodeQuery = '';
    this.pincodeOptions = [];
    this.pincodeOption = null;
    this.pincodeStatus = 'idle';
    this.pincodeListOpen = false;
    this.addressLine = '';
    this.editingAddress = false;
    this.editCustomerId = '';
    clearTimeout(this.pincodeTimer);
    this.newPassword = '';
    this.confirmPassword = '';
    this.currentPassword = '';
    this.otp = '';
    this.otpResending = false;
    this.otpCountdown = 0;
    clearInterval(this.otpTimer);
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = false;
  }
}
