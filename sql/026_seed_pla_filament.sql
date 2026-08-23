-- 026_seed_pla_filament.sql
-- El inventario de filamentos estaba vacío: la calculadora no tenía precio de
-- material y el total daba $0 al llegar desde el repositorio/G-code.
-- Datos reales informados por el dueño (ago 2026): PLA $19.000 ARS/kg.

INSERT INTO public.print_filaments
  (company_id, brand, material, color_name, spool_weight_g, remaining_g, cost_per_kg, min_stock_g)
VALUES
  ('6a27dfca-2834-4291-ab54-631f80bd2f7f', 'Generica', 'PLA', 'Natural', 1000, 1000, 19000, 250);
