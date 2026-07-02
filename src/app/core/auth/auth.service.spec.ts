/**
 * Pruebas del estado de sesión con el repositorio demo: login por rol,
 * restauración de sesión y matriz de permisos por área.
 */
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { AuthRepository } from '../domain/repositories/repositories';
import { DemoAuthRepository } from '../data/demo/demo-repositories';

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthRepository, useClass: DemoAuthRepository }],
    });
    auth = TestBed.inject(AuthService);
  });

  it('inicia sesión con usuario y contraseña y expone el rol', async () => {
    const user = await auth.signIn('admin@demo.dev', 'admin123');
    expect(user.role).toBe('admin');
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('rechaza credenciales inválidas', async () => {
    await expect(auth.signIn('admin@demo.dev', 'mala')).rejects.toThrow();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('el admin accede a todas las áreas; los demás solo a la suya', async () => {
    await auth.signIn('admin@demo.dev', 'admin123');
    expect(auth.canAccess('admin')).toBe(true);
    expect(auth.canAccess('mesero')).toBe(true);
    expect(auth.canAccess('cocina')).toBe(true);

    await auth.signOut();
    await auth.signIn('mesero@demo.dev', 'mesero123');
    expect(auth.canAccess('mesero')).toBe(true);
    expect(auth.canAccess('admin')).toBe(false);
    expect(auth.canAccess('cocina')).toBe(false);
  });

  it('restaura la sesión persistida y cierra sesión limpiamente', async () => {
    await auth.signIn('cocina@demo.dev', 'cocina123');
    await auth.restoreSession();
    expect(auth.ready()).toBe(true);
    expect(auth.role()).toBe('cocina');

    await auth.signOut();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.role()).toBeNull();
  });

  it('en modo demo ya existe un admin (registro inicial deshabilitado)', async () => {
    expect(await auth.adminExists()).toBe(true);
    await expect(
      auth.signUpFirstAdmin({ fullName: 'X', email: 'x@x.dev', password: 'password1' }),
    ).rejects.toThrow();
  });
});
