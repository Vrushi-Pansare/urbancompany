import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { ListingItem } from '../../services/listing.service';
import { LocationService } from '../../services/location.service';
import { AssistantKnowledgeService, ServiceGroup, VisitorLocation } from '../../services/assistant-knowledge.service';
import { AssistantError, ChatTurn, GeminiChatService } from '../../services/gemini-chat.service';
import { VoiceError, VoiceInputService } from '../../services/voice-input.service';
import { productImage, toTitleCase } from '../../constants/listing-display';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  services?: ListingItem[];
  groups?: ServiceGroup[];
  // Local notices (throttling, errors) are shown but never sent back to the
  // model as history.
  notice?: boolean;
}

// Static, so opening the popup costs no Gemini request.
const WELCOME =
  "Hi! I'm the MyGenie Assistant. Ask me about our services and prices, which cities we serve, or how booking works — I can take you straight to the right page.";

const SUGGESTIONS = [
  'AC repair price?',
  'Which cities do you serve?',
  'Popular services',
  'Fridge not cooling',
  'Cancellation policy',
];

const MAX_QUESTION_LENGTH = 400;

// Voice input: this long without a new word after speaking sends the question.
// Tapping the mic to stop (or closing the popup) keeps the text unsent.
const VOICE_SILENCE_MS = 3000;
const MOBILE_QUERY = '(max-width: 768px)';

/**
 * Floating "Ask AI" button + chat popup, mounted once in AppComponent so the
 * conversation survives page changes. Answers come from Gemini, grounded in
 * the listing data AssistantKnowledgeService loads at startup.
 */
@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.scss',
})
export class AiAssistantComponent implements OnInit, OnDestroy {
  @ViewChild('thread') private thread?: ElementRef<HTMLElement>;
  @ViewChild('input') private input?: ElementRef<HTMLInputElement>;

  readonly suggestions = SUGGESTIONS;
  readonly maxLength = MAX_QUESTION_LENGTH;

  open = false;
  sending = false;
  draft = '';
  messages: ChatMessage[] = [{ role: 'assistant', text: WELCOME }];
  // Mic button: speech is written into the box; the visitor still taps send.
  listening = false;

  private location: VisitorLocation = { area: null, serviceable: null };
  private sub = new Subscription();

  constructor(
    readonly knowledge: AssistantKnowledgeService,
    private gemini: GeminiChatService,
    private locationService: LocationService,
    private router: Router,
    private voice: VoiceInputService
  ) {}

  get voiceSupported(): boolean {
    return this.voice.supported;
  }

  get aiAvailable(): boolean {
    return this.gemini.available;
  }

  get browseOnly(): boolean {
    return this.location.serviceable === false;
  }

  ngOnInit(): void {
    this.sub.add(
      combineLatest([this.locationService.area$, this.locationService.status$]).subscribe(([area, status]) => {
        this.location = {
          area,
          serviceable: status === 'serviceable' ? true : status === 'unserviceable' ? false : null,
        };
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.voice.stop();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.toggle(false);
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    // Closing the popup turns the mic off; nobody expects a hidden recorder.
    if (!this.open && this.listening) this.voice.stop();
    if (this.open) {
      // Normally loaded by AppComponent already; this covers a failed first try.
      this.knowledge.preload();
      setTimeout(() => {
        this.scrollToEnd();
        // Phones would pop the keyboard over the conversation; desktop gets focus.
        if (!window.matchMedia(MOBILE_QUERY).matches) this.input?.nativeElement.focus();
      });
    }
  }

  toggleVoice(): void {
    if (this.listening) {
      this.voice.stop();
      return;
    }
    this.listening = true;
    this.voice.start(this.draft, {
      // Indian English: best fit for Indian accents, place and appliance names.
      lang: 'en-IN',
      silenceMs: VOICE_SILENCE_MS,
      onText: (text) => (this.draft = text.slice(0, MAX_QUESTION_LENGTH)),
      onEnd: (error, finishedBySilence) => {
        this.listening = false;
        if (error) {
          this.pushNotice(this.voiceErrorText(error));
        } else if (finishedBySilence && this.open) {
          // The visitor spoke, then paused: treat the pause as "send".
          this.ask(this.draft);
        }
      },
    });
  }

  ask(question: string): void {
    const text = question.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!text || this.sending) return;
    // Sending mid-sentence: stop the mic so late words don't refill the box.
    if (this.listening) this.voice.stop();

    if (!this.knowledge.ready()) {
      this.pushNotice(
        this.knowledge.failed()
          ? "I can't load our services right now. Please try again in a moment."
          : 'Still loading our services — ask again in a moment.'
      );
      this.knowledge.preload();
      return;
    }

    // History = real exchanges only, captured before this question is added.
    const history: ChatTurn[] = this.messages
      .slice(1)
      .filter((m) => !m.notice)
      .map((m) => ({ role: m.role, text: m.text }));

    this.messages = [...this.messages, { role: 'user', text }];
    this.draft = '';
    this.sending = true;
    this.scrollToEnd();

    // Answers mention prices / availability, which depend on the visitor's
    // area, so cached answers are kept per area.
    const scope = `${this.location.area?.city ?? ''}:${this.location.serviceable}`;

    this.gemini
      .ask(this.knowledge.buildContext(this.location), history, text, scope)
      .then((reply) => {
        const services = reply.serviceIds
          .map((id) => this.knowledge.itemById(id))
          .filter((item): item is ListingItem => !!item);
        // A group already reachable through one of its service cards would
        // just repeat the same link.
        const groups = reply.groupKeys
          .map((key) => this.knowledge.groupByKey(key))
          .filter((group): group is ServiceGroup => !!group)
          .filter((group) => !services.some((s) => `${s.category.code}/${s.group.code}` === group.key));
        this.messages = [...this.messages, { role: 'assistant', text: reply.reply, services, groups }];
      })
      .catch((error: unknown) => {
        // A throttled question was never answered, so put it back in the box.
        if (error instanceof AssistantError && error.code === 'throttled') {
          this.messages = this.messages.slice(0, -1);
          this.draft = text;
        }
        this.pushNotice(this.errorText(error));
      })
      .finally(() => {
        this.sending = false;
        this.scrollToEnd();
      });
  }

  openService(item: ListingItem): void {
    this.navigate(['/services', item.category.code, item.group.code], { service: item.id });
  }

  openGroup(group: ServiceGroup): void {
    this.navigate(group.route);
  }

  serviceTitle(item: ListingItem): string {
    return toTitleCase(item.name);
  }

  serviceSubtitle(item: ListingItem): string {
    return toTitleCase(item.group.label);
  }

  serviceImage(item: ListingItem): string | undefined {
    return productImage(item);
  }

  formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private navigate(route: string[], queryParams?: Record<string, string>): void {
    this.router.navigate(route, { queryParams });
    // On phones the popup covers the page, so get out of the way; on desktop
    // it sits in a corner and the visitor can keep chatting.
    if (window.matchMedia(MOBILE_QUERY).matches) this.toggle(false);
  }

  private voiceErrorText(error: NonNullable<VoiceError>): string {
    switch (error) {
      case 'blocked':
        return 'Microphone access is blocked. Allow it in your browser’s site settings to speak your question, or just type it.';
      case 'no-mic':
        return 'I couldn’t find a microphone. Please type your question instead.';
      default:
        return 'Voice input isn’t available right now. Please type your question instead.';
    }
  }

  private pushNotice(text: string): void {
    this.messages = [...this.messages, { role: 'assistant', text, notice: true }];
    this.scrollToEnd();
  }

  private errorText(error: unknown): string {
    const code = error instanceof AssistantError ? error.code : 'failed';
    const seconds = error instanceof AssistantError ? Math.ceil(error.retryInMs / 1000) : 0;
    switch (code) {
      case 'no-key':
        return 'The assistant is unavailable right now. You can still search for any service at the top of the page.';
      case 'throttled':
        return `One moment — ask again in ${seconds}s.`;
      case 'rate-limited':
        return `Lots of people are asking right now. Please try again in about ${Math.max(seconds, 1)}s.`;
      case 'daily-limit':
        return "That's all the questions I can take today. You can still search for any service at the top of the page.";
      default:
        // Only reached when every Gemini attempt failed (network/server), never
        // for an off-topic or unknown question; the model answers those itself.
        return 'Sorry, I lost my connection for a moment. Please ask again.';
    }
  }

  private scrollToEnd(): void {
    setTimeout(() => {
      const el = this.thread?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
