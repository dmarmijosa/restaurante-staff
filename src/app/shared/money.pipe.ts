/**
 * Formatea importes como en el diseño original: `$6.50`.
 *
 * ¿Por qué un pipe propio y no CurrencyPipe? El diseño usa siempre dos
 * decimales y símbolo pegado, sin depender del locale del navegador; un pipe
 * puro de una línea es más barato y determinista para las pruebas.
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number): string {
    return '$' + value.toFixed(2);
  }
}
