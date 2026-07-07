/**
 * Servicio de idioma: detecta el idioma del dispositivo, lo persiste en
 * localStorage y expone un signal reactivo con el idioma activo.
 *
 * Idiomas soportados: es (por defecto), ca, en, pt, fr, it.
 * Usa ngx-translate v18 (sin setDefaultLang / addLangs).
 */
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLang = 'es' | 'ca' | 'en' | 'pt' | 'fr' | 'it';

const SUPPORTED: SupportedLang[] = ['es', 'ca', 'en', 'pt', 'fr', 'it'];
const DEFAULT: SupportedLang = 'es';
const STORAGE_KEY = 'rs-lang';

export const LANG_LABELS: Record<SupportedLang, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  it: 'Italiano',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly _current = signal<SupportedLang>(DEFAULT);

  /** Idioma activo (señal reactiva). */
  readonly current = this._current.asReadonly();

  /**
   * Inicializa ngx-translate, detecta el idioma del dispositivo y aplica el
   * guardado en localStorage si existe. Se llama UNA sola vez desde App.ngOnInit.
   * Espera a que se carguen las traducciones antes de resolver.
   */
  async init(): Promise<void> {
    const saved = this.getSaved();
    const detected = this.detectBrowser();
    const lang = saved ?? detected ?? DEFAULT;
    await this.applyAsync(lang);
  }

  /** Cambia el idioma y lo persiste. */
  use(lang: SupportedLang): void {
    this.apply(lang);
  }

  readonly supported = SUPPORTED;

  private apply(lang: SupportedLang): void {
    this.translate.use(lang);
    this._current.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage no disponible (SSR / modo privado estricto) */
    }
  }

  private async applyAsync(lang: SupportedLang): Promise<void> {
    await this.translate.use(lang).toPromise();
    this._current.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage no disponible (SSR / modo privado estricto) */
    }
  }

  private getSaved(): SupportedLang | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as SupportedLang;
      return SUPPORTED.includes(v) ? v : null;
    } catch {
      return null;
    }
  }

  /** Detecta el primer idioma del navegador que esté en nuestra lista. */
  private detectBrowser(): SupportedLang | null {
    if (typeof navigator === 'undefined') return null;
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language ?? ''];
    for (const lang of langs) {
      const code = lang.split('-')[0].toLowerCase() as SupportedLang;
      if (SUPPORTED.includes(code)) return code;
    }
    return null;
  }
}

