import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthError, AuthService } from '../../services/auth.service';
import { ASSET_URLS } from '../../constants/urls';

/**
 * login           phone + password (checks the number exists first)
 * register        phone + name + password → account created → logged in
 * change-password logged-in users, opened from the profile menu
 */
type Step = 'login' | 'register' | 'change-password' | 'success';

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
  newPassword = '';
  confirmPassword = '';

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
          this.currentStep = view === 'change-password' ? 'change-password' : 'login';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
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
    return this.isPhoneValid && !!this.firstName.trim() && !!this.lastName.trim() && this.passwordsReady && !this.isLoading;
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

  /** Register: create the account (unless the number already has one), then log in */
  async onRegister(): Promise<void> {
    if (!this.canRegister || !this.checkPasswordsMatch()) return;
    await this.run(async () => {
      if (await this.authService.phoneExists(this.phoneNumber)) {
        this.errorMessage = 'This number already has an account. Please log in instead.';
        return;
      }
      await this.authService.register(this.phoneNumber, {
        firstName: this.firstName,
        lastName: this.lastName,
        password: this.newPassword
      });
      this.finish('Account created!');
    });
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
    this.newPassword = '';
    this.confirmPassword = '';
    this.currentPassword = '';
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = false;
  }
}
