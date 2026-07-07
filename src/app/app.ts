import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { LanguageService } from './core/i18n/language.service';
import { ToastComponent } from './shared/toast/toast.component';

/**
 * Raíz de la app: restaura la sesión persistida, inicializa el idioma y
 * pinta el toast global sobre cualquier vista.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toast />
  `,
})
export class App implements OnInit {
  private auth = inject(AuthService);
  private lang = inject(LanguageService);

  ngOnInit(): void {
    // Esperar a que se carguen las traducciones antes de continuar
    void this.lang.init().then(() => {
      void this.auth.restoreSession();
    });
  }
}
