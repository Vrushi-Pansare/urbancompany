import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SmsService } from '../../services/sms.service';
import { ASSET_URLS } from '../../constants/urls';

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
  currentStep: 'phone' | 'otp' | 'success' = 'phone';

  phoneNumber = '';
  countryCode = '+91';
  countryMaxLength = 10;
  isLoading = false;

  // Cloudflare Turnstile verification state
  showCaptcha = false;
  isCaptchaVerified = false;
  isCaptchaLoading = false;

  // OTP State (6 Digits)
  otpValue = '';
  isOtpFocused = true;
  countdown = 28;
  generatedOtp = '';
  private countdownTimer: any;
  private sub = new Subscription();

  constructor(
    private authService: AuthService,
    private smsService: SmsService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.authService.isLoginModalOpen$.subscribe((open) => {
        this.isOpen = open;
        if (open) {
          this.resetForm();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.clearCountdown();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  get isPhoneValid(): boolean {
    const cleanNumber = this.phoneNumber.replace(/\D/g, '');
    return cleanNumber.length === this.countryMaxLength;
  }

  get isContinueEnabled(): boolean {
    return this.isPhoneValid && this.isCaptchaVerified && !this.isLoading;
  }

  get isOtpValid(): boolean {
    return this.otpValue.length === 6;
  }

  get formattedCountdown(): string {
    const secs = this.countdown < 10 ? '0' + this.countdown : this.countdown.toString();
    return `00:${secs}`;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value.replace(/\D/g, '');
    const clean = rawValue.slice(0, this.countryMaxLength);
    this.phoneNumber = clean;

    if (clean.length === this.countryMaxLength) {
      this.loadVerification();
    } else {
      this.showCaptcha = false;
      this.isCaptchaVerified = false;
      this.isCaptchaLoading = false;
    }
  }

  loadVerification(): void {
    this.showCaptcha = true;
    this.isCaptchaLoading = true;
    this.isCaptchaVerified = false;

    // Simulate Cloudflare Turnstile automatic verification on 10 digits
    setTimeout(() => {
      this.isCaptchaLoading = false;
      this.isCaptchaVerified = true;
    }, 700);
  }

  toggleCaptcha(): void {
    if (this.isCaptchaVerified) return;
    this.loadVerification();
  }

  async onSendOtp(): Promise<void> {
    if (!this.isContinueEnabled) return;
    this.isLoading = true;
    this.otpValue = '';

    // Generate 6-digit OTP
    this.generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Call Fast2SMS / Alert API
    await this.smsService.sendOtpSms(this.phoneNumber, this.generatedOtp);

    // Transition to OTP step
    setTimeout(() => {
      this.isLoading = false;
      this.currentStep = 'otp';
      this.startCountdown();
      setTimeout(() => this.focusOtpInput(), 100);
    }, 800);
  }

  focusOtpInput(): void {
    const input = document.getElementById('real-otp-input') as HTMLInputElement;
    if (input) {
      input.focus();
      this.isOtpFocused = true;
    }
  }

  onOtpChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 6);
    this.otpValue = clean;
    input.value = clean;
  }

  goToPhoneStep(): void {
    this.currentStep = 'phone';
    this.clearCountdown();
    this.otpValue = '';
  }

  startCountdown(): void {
    this.clearCountdown();
    this.countdown = 28;
    this.countdownTimer = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.clearCountdown();
      }
    }, 1000);
  }

  clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  clearPhone(): void {
    this.phoneNumber = '';
    this.showCaptcha = false;
    this.isCaptchaVerified = false;
    this.isCaptchaLoading = false;
  }

  async resendVia(type: 'sms' | 'whatsapp' = 'sms'): Promise<void> {
    this.generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpValue = '';

    if (type === 'whatsapp') {
      this.smsService.sendWhatsAppOtp(this.phoneNumber, this.generatedOtp);
    } else {
      await this.smsService.sendOtpSms(this.phoneNumber, this.generatedOtp);
    }

    this.startCountdown();
    setTimeout(() => this.focusOtpInput(), 100);
  }

  resendOtp(): void {
    this.resendVia('sms');
  }

  onVerifyOtp(): void {
    if (!this.isOtpValid || this.isLoading) return;
    this.isLoading = true;

    // Simulate OTP verification & login
    setTimeout(() => {
      this.isLoading = false;
      this.currentStep = 'success';
      setTimeout(() => {
        this.authService.login(this.phoneNumber, this.countryCode);
        this.close();
      }, 1000);
    }, 700);
  }

  onBackdropClick(event: MouseEvent): void {
    this.close();
  }

  close(): void {
    this.authService.closeLoginModal();
    this.resetForm();
  }

  private resetForm(): void {
    this.currentStep = 'phone';
    this.phoneNumber = '';
    this.otpValue = '';
    this.showCaptcha = false;
    this.isCaptchaVerified = false;
    this.isCaptchaLoading = false;
    this.clearCountdown();
  }
}
