-- 027_seed_pla_colors.sql
-- Varios colores de PLA en stock 0 para que el dueño los edite luego.
-- cost_per_kg = 19000 (igual que el PLA Natural ya cargado).
-- Idempotente: no inserta si ya hay >= 12 rollos PLA en MI EMPRESA.

DO $$
DECLARE
  cid uuid := '6a27dfca-2834-4291-ab54-631f80bd2f7f';
BEGIN
  IF (SELECT count(*) FROM public.print_filaments WHERE company_id = cid AND material = 'PLA') >= 12 THEN
    RETURN;
  END IF;

  INSERT INTO public.print_filaments
    (company_id, brand, material, color_name, spool_weight_g, remaining_g, cost_per_kg, min_stock_g)
  VALUES
    (cid, 'Generica', 'PLA', 'Negro',    1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Blanco',   1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Rojo',     1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Azul',     1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Verde',    1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Amarillo', 1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Naranja',  1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Violeta',  1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Rosa',     1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Celeste',  1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Gris',     1000, 0, 19000, 250),
    (cid, 'Generica', 'PLA', 'Marron',   1000, 0, 19000, 250);
END $$;
