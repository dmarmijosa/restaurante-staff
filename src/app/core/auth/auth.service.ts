/**
 * Estado de sesión de la app.
 *
 * ¿Por qué un servicio con signals? Los guards, la barra de roles y el footer
 * de la home necesitan reaccionar al mismo estado de sesión; un signal único
 * evita repetir llamadas a Supabase y hace el estado predecible y testeable.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthRepository, type SessionUser } from '../domain/repositories/repositories';
import type { StaffRole } from '../domain/entities/entities';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private repo = inject(AuthRepository);

  private readonly _user = signal<SessionUser | null>(null);
  private readonly _ready = signal(false);

  /** Usuario autenticado o null (el cliente QR navega sin sesión). */
  readonly user = this._user.asReadonly();
  /** true cuando ya se restauró (o descartó) la sesión persistida. */
  readonly ready = this._ready.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed<StaffRole | null>(() => this._user()?.role ?? null);

  /**
   * Restaura la sesión guardada al arrancar. Se llama una sola vez desde el
   * componente raíz; los guards esperan a `ready` para no redirigir de más.
   */
  async restoreSession(): Promise<void> {
    try {
      this._user.set(await this.repo.getCurrentUser());
    } finally {
      this._ready.set(true);
    }
  }

  /** Login con email y contraseña contra Supabase Auth (o demo). */
  async signIn(email: string, password: string): Promise<SessionUser> {
    const user = await this.repo.signIn(email, password);
    this._user.set(user);
    return user;
  }

  /** ¿Ya hay un administrador? Gobierna la visibilidad del registro inicial. */
  adminExists(): Promise<boolean> {
    return this.repo.adminExists();
  }

  /**
   * Registro del primer administrador. Si devuelve sesión, queda autenticado;
   * si devuelve null, el proyecto exige confirmar el correo antes de entrar.
   */
  async signUpFirstAdmin(input: { fullName: string; email: string; password: string }): Promise<SessionUser | null> {
    const user = await this.repo.signUpFirstAdmin(input);
    if (user) this._user.set(user);
    return user;
  }

  async signOut(): Promise<void> {
    await this.repo.signOut();
    this._user.set(null);
  }

  /** ¿Puede el usuario actual entrar a una vista del rol dado? El admin entra a todas. */
  canAccess(required: StaffRole): boolean {
    const role = this.role();
    return role === 'admin' || role === required;
  }
}
