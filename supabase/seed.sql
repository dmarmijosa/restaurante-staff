-- ============================================================================
-- Restaurante Staff · Datos de ejemplo (los mismos del diseño original)
-- ============================================================================

insert into public.categories (name, position) values
  ('Entradas', 1), ('Principales', 2), ('Postres', 3), ('Bebidas', 4);

insert into public.products (name, description, price, category_id, available) values
  ('Tostadas de tinga', 'Pollo deshebrado, crema ácida y aguacate.', 6.50, 1, true),
  ('Sopa de tortilla', 'Caldo de jitomate, chile pasilla y queso fresco.', 7.00, 1, true),
  ('Croquetas de elote', 'Con alioli de chipotle ahumado.', 5.00, 1, false),
  ('Pollo al carbón con mole', 'Media pieza, arroz rojo y tortillas de maíz.', 14.50, 2, true),
  ('Tacos de costilla', 'Tres piezas, salsa tatemada y cebollitas.', 11.00, 2, true),
  ('Risotto de hongos', 'Hongos de temporada y parmesano.', 13.00, 2, true),
  ('Pesca del día a la brasa', 'Con verduras rostizadas y limón quemado.', 16.50, 2, true),
  ('Flan de la casa', 'Caramelo oscuro y crema batida.', 5.50, 3, true),
  ('Tarta de elote', 'Con helado de vainilla de vaina.', 6.00, 3, true),
  ('Agua fresca de jamaica', 'Endulzada con piloncillo.', 3.00, 4, true),
  ('Limonada de hierbabuena', 'Mineral o natural.', 3.50, 4, true);

insert into public.tables (number, x, y, seats, shape, status) values
  (1, 40, 40, 4, 'sq', 'libre'),
  (2, 230, 60, 2, 'rd', 'ocupada'),
  (3, 400, 40, 4, 'sq', 'ocupada'),
  (4, 590, 80, 4, 'sq', 'ocupada'),
  (5, 70, 230, 6, 'sq', 'reservada'),
  (6, 330, 250, 4, 'rd', 'ocupada'),
  (7, 600, 280, 2, 'rd', 'ocupada'),
  (8, 160, 410, 8, 'sq', 'libre');

update public.restaurant_settings
set season_start = '2026-03-15', season_end = '2026-09-15'
where id = 1;
