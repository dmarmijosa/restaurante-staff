import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ToastComponent } from './shared/toast/toast.component';

/**
 * Raíz de la app: restaura la sesión persistida una sola vez y pinta el toast
 * global sobre cualquier vista.
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

  ngOnInit(): void {
    void this.auth.restoreSession();
  }
}
