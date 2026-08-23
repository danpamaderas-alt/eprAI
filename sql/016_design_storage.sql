-- Bucket privado para imágenes de diseños de sublimación.
-- Las referencias se guardan como "{company_id}/{uuid}.{ext}" en sublimation_designs.imagen
-- y el frontend genera URLs firmadas on-demand (cacheadas ~45 min).

insert into storage.buckets (id, name, public)
values ('design-images', 'design-images', false)
on conflict (id) do nothing;

drop policy if exists "design_images_select" on storage.objects;
drop policy if exists "design_images_insert" on storage.objects;
drop policy if exists "design_images_update" on storage.objects;
drop policy if exists "design_images_delete" on storage.objects;

create policy "design_images_select"
on storage.objects for select
to authenticated
using (bucket_id = 'design-images');

create policy "design_images_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'design-images');

create policy "design_images_update"
on storage.objects for update
to authenticated
using (bucket_id = 'design-images');

create policy "design_images_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'design-images');
