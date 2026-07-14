import { TestBed } from '@angular/core/testing';
import { MoneyPipe } from './money.pipe';
import { CurrencyService } from './currency.service';

describe('MoneyPipe', () => {
  let pipe: MoneyPipe;
  let currencyService: CurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    pipe = TestBed.runInInjectionContext(() => new MoneyPipe());
    currencyService = TestBed.inject(CurrencyService);
  });

  it('formatea con símbolo por defecto (€) y dos decimales', () => {
    expect(pipe.transform(6.5)).toBe('€6.50');
    expect(pipe.transform(14)).toBe('€14.00');
    expect(pipe.transform(0)).toBe('€0.00');
  });

  it('usa el símbolo de moneda configurado por el admin', () => {
    currencyService.symbol.set('€');
    expect(pipe.transform(6.5)).toBe('€6.50');
    expect(pipe.transform(14)).toBe('€14.00');
  });

  it('admite símbolos de varios caracteres (R$, S/, CHF…)', () => {
    currencyService.symbol.set('R$');
    expect(pipe.transform(10)).toBe('R$10.00');
    currencyService.symbol.set('S/');
    expect(pipe.transform(9.9)).toBe('S/9.90');
  });
});
