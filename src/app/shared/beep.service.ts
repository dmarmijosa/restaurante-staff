/**
 * Aviso sonoro breve (Web Audio API), usado en cocina cuando entra una comanda.
 *
 * ¿Por qué Web Audio y no un <audio src>? No requiere archivos ni red y genera
 * un tono corto en el momento. El AudioContext solo puede sonar tras un gesto
 * del usuario (política de autoplay), así que se crea de forma perezosa y se
 * "despierta" en la primera interacción. Un flag de silencio se persiste.
 *
 * Flujo de autoplay:
 *   1. Llega una comanda → beep() se llama.
 *   2. Si el AudioContext está suspendido (aún no hubo gesto), se marca
 *      pendingBeep = true y se intenta resume() en silencio.
 *   3. En cuanto el usuario toca la pantalla (pointerdown → prime()), el
 *      contexto se reactiva y el tono pendiente se dispara de inmediato.
 */
import { Injectable, signal } from '@angular/core';

const MUTE_KEY = 'rs-cocina-mute';

@Injectable({ providedIn: 'root' })
export class BeepService {
  private ctx: AudioContext | null = null;

  /** Estado de silencio (persistido) para mostrarlo en la UI. */
  readonly muted = signal<boolean>(this.readMuted());

  /**
   * true cuando llegó una comanda pero el AudioContext estaba suspendido y el
   * tono no pudo sonar; se limpia en cuanto el usuario interactúa (prime).
   */
  readonly pendingBeep = signal(false);

  private readMuted(): boolean {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  }

  toggleMuted(): void {
    const value = !this.muted();
    this.muted.set(value);
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      /* almacenamiento no disponible */
    }
  }

  /**
   * Prepara/despierta el AudioContext tras un gesto del usuario.
   * Si había un beep pendiente (comanda que llegó con el contexto suspendido),
   * lo reproduce en cuanto el contexto reanuda.
   */
  prime(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    ctx.resume().then(() => {
      if (this.pendingBeep() && !this.muted()) {
        this._play(ctx);
        this.pendingBeep.set(false);
      }
    });
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) this.ctx = new Ctor();
    return this.ctx;
  }

  /**
   * Reproduce dos tonos cortos tipo "campana".
   *
   * Si el AudioContext está suspendido (política de autoplay aún no satisfecha),
   * encola el tono en pendingBeep para dispararlo en el próximo prime().
   */
  beep(): void {
    if (this.muted()) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      // El navegador bloqueó el AudioContext hasta un gesto: encolar.
      this.pendingBeep.set(true);
      // Intento preventivo de resume; si falla, prime() lo resolverá.
      ctx.resume().then(() => {
        if (this.pendingBeep() && !this.muted()) {
          this._play(ctx);
          this.pendingBeep.set(false);
        }
      });
      return;
    }
    this._play(ctx);
  }

  private _play(ctx: AudioContext): void {
    this.pendingBeep.set(false);
    const play = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.24);
    };
    play(880, 0);
    play(1174, 0.16);
  }
}
