-- 030: agrega campo bool is_supplier a clientes (proveedor como categoria separada del type)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_supplier boolean NOT NULL DEFAULT false;
