import { Injectable, NgZone } from '@angular/core';

// The Web Speech API isn't in TypeScript's DOM lib, so only the parts used
// here are typed. Chrome, Edge and Safari support it (Chrome/Edge as
// webkitSpeechRecognition); Firefox doesn't, so the mic button is hidden there.
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognition;

/** Why listening stopped early; null when it simply finished. */
export type VoiceError = 'blocked' | 'no-mic' | 'unavailable' | null;

export interface VoiceSession {
  lang: string;
  // After the visitor has spoken, this long without a new word ends the
  // session and reports `finishedBySilence` so the caller can auto-send.
  silenceMs: number;
  // Called with the full text the box should show: whatever was typed before
  // the mic was tapped, plus everything heard so far (live, as you speak).
  onText: (text: string) => void;
  // finishedBySilence: speech was heard and then the visitor went quiet for
  // silenceMs. False when stopped by hand, on error, or if nothing was said.
  onEnd: (error: VoiceError, finishedBySilence: boolean) => void;
}

// Fallback for when no words ever arrive. Browsers normally end a silent
// session themselves (~8s, 'no-speech'), but continuous mode doesn't always.
const NOTHING_HEARD_MS = 10_000;

/**
 * Speech-to-text for the chat box. Runs entirely in the browser's speech
 * engine, so it costs no Gemini requests. Note that Chrome and Edge send the
 * audio to their own cloud service to transcribe it.
 */
@Injectable({
  providedIn: 'root'
})
export class VoiceInputService {
  readonly supported: boolean;

  private readonly Recognition: SpeechRecognitionCtor | null;
  private recognition: SpeechRecognition | null = null;

  constructor(private zone: NgZone) {
    const w = typeof window === 'undefined' ? null : (window as unknown as Record<string, unknown>);
    this.Recognition = (w?.['SpeechRecognition'] ?? w?.['webkitSpeechRecognition'] ?? null) as SpeechRecognitionCtor | null;
    this.supported = this.Recognition !== null;
  }

  get listening(): boolean {
    return this.recognition !== null;
  }

  start(existingText: string, session: VoiceSession): void {
    if (!this.Recognition) return;
    this.stop();

    const recognition = new this.Recognition();
    recognition.lang = session.lang;
    // Continuous, because in single-shot mode the browser ends the session
    // after only ~1–2s of quiet. We decide when the visitor has finished
    // (silenceMs with no new words) with our own timer below. Interim results
    // make the words appear while they're still talking.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const prefix = existingText.trim();
    let error: VoiceError = null;
    let heardAnything = false;
    let finishedBySilence = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Restart the countdown: silenceMs once speech has started, a longer
    // fallback before the first word. When it runs out, stop listening.
    const armTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          finishedBySilence = heardAnything;
          recognition.stop();
        },
        heardAnything ? session.silenceMs : NOTHING_HEARD_MS,
      );
    };

    recognition.addEventListener('result', (event) => {
      const results = (event as SpeechRecognitionEvent).results;
      let finals = '';
      let interim = '';
      for (let i = 0; i < results.length; i++) {
        const part = results[i][0].transcript.trim();
        if (!part) continue;
        if (!results[i].isFinal) {
          interim = join(interim, part);
        } else if (finals && part.toLowerCase().startsWith(finals.toLowerCase())) {
          // Chrome on Android repeats the whole sentence in each new final
          // result in continuous mode; take the longer one, don't append.
          finals = part;
        } else {
          finals = join(finals, part);
        }
      }
      const heard = join(finals, interim);
      if (!heard) return;

      heardAnything = true;
      armTimer(); // every new word restarts the silence countdown
      this.zone.run(() => session.onText(join(prefix, heard)));
    });

    recognition.addEventListener('error', (event) => {
      const code = (event as SpeechRecognitionErrorEvent).error;
      // 'no-speech' and 'aborted' just mean nothing was said / we stopped it.
      if (code === 'not-allowed' || code === 'service-not-allowed') error = 'blocked';
      else if (code === 'audio-capture') error = 'no-mic';
      else if (code === 'network' || code === 'language-not-supported') error = 'unavailable';
    });

    recognition.addEventListener('end', () => {
      clearTimeout(timer);
      if (this.recognition === recognition) this.recognition = null;
      this.zone.run(() => session.onEnd(error, finishedBySilence && !error));
    });

    this.recognition = recognition;
    try {
      recognition.start();
      armTimer();
    } catch {
      // start() throws if a previous session is still shutting down.
      this.recognition = null;
      session.onEnd('unavailable', false);
    }
  }

  /** Stop listening and keep what was heard (fires onEnd, without auto-send). */
  stop(): void {
    this.recognition?.stop();
  }
}

function join(a: string, b: string): string {
  return a && b ? `${a} ${b}` : a || b;
}
