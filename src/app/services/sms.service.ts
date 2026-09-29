import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SmsService {
  // Fast2SMS API Key (Aap apna real Fast2SMS API key yahan daal sakte hain)
  private fast2smsApiKey = '';

  constructor() {
    // Request native browser/OS notification permission on load
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  /**
   * Free Mode SMS & System Alert Dispatcher
   */
  async sendOtpSms(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const smsMessage = `<#> ${otp} is your MyGenie ACCOUNT LOGIN verification code. DO NOT SHARE this code with anyone for account safety. gEcqWzJu2Pl`;

    // 1. If real Fast2SMS API Key is present, call Fast2SMS API
    if (this.fast2smsApiKey) {
      try {
        const response = await fetch(
          `https://www.fast2sms.com/dev/bulkV2?authorization=${this.fast2smsApiKey}&route=otp&variables_values=${otp}&numbers=${cleanNumber}`
        );
        const data = await response.json();
        if (data.return === true) {
          console.log(`[SmsService] Fast2SMS delivered to +91${cleanNumber}:`, data);
          return { success: true, message: 'SMS Sent Successfully' };
        }
      } catch (err) {
        console.warn('[SmsService] Fast2SMS network error:', err);
      }
    }

    // 2. Free Instant Delivery via Native Desktop/Mobile OS System Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('💬 SMS • MyGenie', {
          body: smsMessage,
          icon: 'https://www.urbancompany.com/favicon.ico'
        });
      } else {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('💬 SMS • MyGenie', {
              body: smsMessage
            });
          }
        });
      }
    }

    // 3. Log to browser console
    console.log(`%c[MyGenie SMS to +91${cleanNumber}]`, 'color: #2563eb; font-weight: bold; font-size: 14px;');
    console.log(smsMessage);

    return {
      success: true,
      message: 'OTP processed successfully'
    };
  }

  /**
   * Free Instant Delivery via WhatsApp Web/App
   */
  sendWhatsAppOtp(phoneNumber: string, otp: string): void {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const message = `<#> ${otp} is your MyGenie ACCOUNT LOGIN verification code.\n\nDO NOT SHARE this code with anyone for account safety.\ngEcqWzJu2Pl`;
    const waUrl = `https://api.whatsapp.com/send?phone=91${cleanNumber}&text=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }
  }
}
