-- ============================================================================
-- 031: register_delivery_v2 - Entregas parciales que PERSISTEN cantidades
-- ============================================================================
-- Bug corregido: la RPC vieja register_partial_delivery(p_order_id,
-- p_delivery_data) solo hacia UPDATE orders SET status='PARCIAL'. Nunca
-- tocaba quantityDelivered dentro del JSONB orders.items, por lo que las
-- entregas registradas desde "Hoja de Ruta" no avanzaban el progreso y se
-- perdian al recargar.
--
-- Esta version atomica:
--   1. Valida tenant del pedido (patron 005: profiles -> company_id).
--   2. Rechaza pedidos CANCELLED.
--   3. Aplica las entregas sobre orders.items matcheando item->>'id' +
--      variacion->>'id'; suma cantidades duplicadas y clampea a
--      [0..quantityOrdered]. De paso normaliza quantityDelivered en todas
--      las variaciones alcanzadas.
--   4. Recalcula status: DELIVERED si se entrego todo, PARTIAL si algo,
--      PENDING si nada. No toca estados fuera de PENDING/PARTIAL/DELIVERED.
--   5. Adjunta p_log_entry al activity_log dentro de la misma transaccion.
--
-- Frontend: useOrderStore.registerPartialDelivery llama esta RPC y hace
-- fallback client-side (un solo UPDATE calculado) si la funcion no existe
-- todavia. Idempotente: re-aplicar con CREATE OR REPLACE es seguro.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_delivery_v2(
  p_order_id uuid,
  p_deliveries jsonb,
  p_log_entry jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  caller_company_id uuid;
  order_company_id uuid;
  v_status text;
  v_items jsonb;
  v_new_items jsonb := '[]'::jsonb;
  v_ordered_total int := 0;
  v_delivered_total int := 0;
  v_new_status text;
  v_item jsonb;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: no company associated with your profile.';
  END IF;

  SELECT company_id, status, items INTO order_company_id, v_status, v_items
  FROM orders WHERE id = p_order_id;
  IF order_company_id IS NULL THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF order_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: order belongs to another company.';
  END IF;
  IF v_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'No se puede entregar un pedido cancelado.';
  END IF;
  IF jsonb_typeof(COALESCE(v_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Formato de items invalido.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    DECLARE
      v_item_id text := COALESCE(v_item->>'id', '');
      v_vars jsonb := CASE WHEN jsonb_typeof(COALESCE(v_item->'variations', '[]'::jsonb)) = 'array'
                           THEN COALESCE(v_item->'variations', '[]'::jsonb)
                           ELSE '[]'::jsonb END;
      v_out jsonb := '[]'::jsonb;
      v_var jsonb;
      d jsonb;
    BEGIN
      FOR v_var IN SELECT * FROM jsonb_array_elements(v_vars)
      LOOP
        DECLARE
          v_var_id text := COALESCE(v_var->>'id', '');
          v_ordered int := GREATEST(COALESCE((v_var->>'quantityOrdered')::int, 0), 0);
          v_delivered int := GREATEST(COALESCE((v_var->>'quantityDelivered')::int, 0), 0);
          v_pending_qty int := 0;
        BEGIN
          FOR d IN SELECT * FROM jsonb_array_elements(p_deliveries)
          LOOP
            IF COALESCE(d->>'itemId', '') = v_item_id AND COALESCE(d->>'variationId', '') = v_var_id THEN
              v_pending_qty := v_pending_qty + GREATEST(COALESCE((d->>'quantity')::int, 0), 0);
            END IF;
          END LOOP;

          IF v_pending_qty > 0 THEN
            v_delivered := GREATEST(0, LEAST(v_ordered, v_delivered + v_pending_qty));
          END IF;
          -- clamp defensivo incluso sin entrega nueva
          v_delivered := GREATEST(0, LEAST(v_ordered, v_delivered));

          v_ordered_total := v_ordered_total + v_ordered;
          v_delivered_total := v_delivered_total + v_delivered;
          v_out := v_out || jsonb_set(v_var, '{quantityDelivered}', to_jsonb(v_delivered));
        END;
      END LOOP;

      v_new_items := v_new_items || (v_item || jsonb_build_object('variations', v_out));
    END;
  END LOOP;

  v_new_status := CASE
    WHEN v_ordered_total > 0 AND v_delivered_total >= v_ordered_total THEN 'DELIVERED'
    WHEN v_delivered_total > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END;

  UPDATE orders SET
    items = v_new_items,
    status = CASE WHEN v_status IN ('PENDING', 'PARTIAL', 'DELIVERED') THEN v_new_status ELSE v_status END,
    activity_log = CASE
      WHEN p_log_entry IS NOT NULL THEN COALESCE(activity_log, '[]'::jsonb) || p_log_entry
      ELSE activity_log
    END
  WHERE id = p_order_id;
END;
$$;
