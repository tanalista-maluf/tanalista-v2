-- Fotos de evento no Supabase Storage, no lugar do Cloudinary (que nunca foi
-- configurado em produção). Bucket público event-photos, até 4MB por foto,
-- caminho <evento>/<pessoa>/<arquivo>. Sem policy de escrita: o servidor
-- confere quem pode enviar (organizador ou inscrito confirmado, até 250MB por
-- evento) e devolve um link de envio assinado. Fotos antigas que estejam no
-- Cloudinary continuam como estão (event_photos.storage_key sem o prefixo
-- "storage:").

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-photos',
  'event-photos',
  true,
  4194304, -- 4MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public event photo read" ON storage.objects;
CREATE POLICY "Public event photo read" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');
