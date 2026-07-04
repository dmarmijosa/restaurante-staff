/**
 * Estado de sesión de la app.
 *
 * ¿Por qué un servicio con signals? Los guards, la barra de roles y el footer
 * de la home necesitan reaccionar al mismo estado de sesión; un signal único
 * evita repetir llamadas a Supabase y hace el estado predecible y testeable.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthRepository, RestaurantRepository, type SessionUser } from '../domain/repositories/repositories';
import type { StaffRole } from '../domain/entities/entities';
import { RestaurantContextService } from '../application/restaurant-context.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private repo = inject(AuthRepository);
  private restaurantRepo = inject(RestaurantRepository);
  private context = inject(RestaurantContextService);

  private readonly _user = signal<SessionUser | null>(null);
  private readonly _ready = signal(false);

  /** Usuario autenticado o null (el cliente QR navega sin sesión). */
  readonly user = this._user.asReadonly();
  /** true cuando ya se restauró (o descartó) la sesión persistida. */
  readonly ready = this._ready.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed<StaffRole | null>(() => this._user()?.role ?? null);
  /** UUID del restaurante del usuario autenticado. */
  readonly restaurantId = computed(() => this._user()?.restaurantId ?? null);

  /**
   * Restaura la sesión guardada al arrancar. Se llama una sola vez desde el
   * componente raíz; los guards esperan a `ready` para no redirigir de más.
   */
  async restoreSession(): Promise<void> {
    try {
      const user = await this.repo.getCurrentUser();
      this._user.set(user);
      if (user?.restaurantId) this.context.set(user.restaurantId);
    } finally {
      this._ready.set(true);
    }
  }

  /** Login con email y contraseña contra Supabase Auth (o demo). */
  async signIn(email: string, password: string): Promise<SessionUser> {
    const user = await this.repo.signIn(email, password);
    this._user.set(user);
    if (user.restaurantId) this.context.set(user.restaurantId);
    return user;
  }

  /** ¿Ya hay un administrador para el restaurante indicado? */
  adminExists(restaurantId?: string): Promise<boolean> {
    return this.repo.adminExists(restaurantId);
  }

  /**
   * Crea un nuevo restaurante (tenant) y devuelve su UUID.
   * Se llama antes de signUpFirstAdmin en el flujo de bootstrap.
   */
  createRestaurant(name: string, slug: string): Promise<string> {
    return this.restaurantRepo.create(name, slug);
  }

  /**
   * Registro del primer administrador de un restaurante.
   * Si devuelve sesión, queda autenticado; si null, el proyecto exige confirmar el correo.
   */
  async signUpFirstAdmin(input: {
    fullName: string;
    email: string;
    password: string;
    restaurantId: string;
  }): Promise<SessionUser | null> {
    const user = await this.repo.signUpFirstAdmin(input);
    if (user) {
      this._user.set(user);
      this.context.set(user.restaurantId);
    }
    return user;
  }

  async signOut(): Promise<void> {
    await this.repo.signOut();
    this._user.set(null);
    this.context.clear();
  }

  /** ¿Puede el usuario actual entrar a una vista del rol dado? El admin entra a todas. */
  canAccess(required: StaffRole): boolean {
    const role = this.role();
    return role === 'admin' || role === required;
  }
}
