/**
 * Formatea importes con el símbolo de moneda configurado por el admin.
 *
 * ¿Por qué un pipe propio y no CurrencyPipe? El diseño usa siempre dos
 * decimales y símbolo pegado, sin depender del locale del navegador; un pipe
 * ligero es más barato y determinista para las pruebas.
 *
 * La moneda activa viene de CurrencyService (signal global actualizado por el
 * RestaurantStore). El pipe es `pure: false` para reaccionar al cambio de
 * símbolo sin que los templates tengan que pasar el valor explícitamente.
 */
import { inject, Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from './currency.service';

@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly currency = inject(CurrencyService);

  transform(value: number): string {
    return this.currency.symbol() + value.toFixed(2);
  }
}
