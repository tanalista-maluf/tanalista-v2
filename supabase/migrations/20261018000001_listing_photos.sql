-- Até 5 fotos por anúncio do marketplace, a primeira é a principal.
--
-- photo_urls guarda a lista; photo_url continua sendo a principal (a primeira),
-- que é o que o site já mostra. As fotos ficam no bucket público
-- listing-photos, com até 4MB cada. O app grava nele por um link de envio
-- assinado que o servidor gera depois de conferir quem é a pessoa e o tamanho
-- (a foto não passa pela Vercel, que limita o corpo da requisição a 4,5MB).

ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_photo_urls_max;
ALTER TABLE marketplace_listings
  ADD CONSTRAINT marketplace_listings_photo_urls_max CHECK (cardinality(photo_urls) <= 5);

-- Anúncios que já tinham uma foto passam a tê-la também na lista
UPDATE marketplace_listings
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND photo_url <> '' AND cardinality(photo_urls) = 0;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  4194304, -- 4MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket público: qualquer um vê as fotos (como os avatares). Sem policy de
-- escrita: só com o link assinado do servidor.
DROP POLICY IF EXISTS "Public listing photo read" ON storage.objects;
CREATE POLICY "Public listing photo read" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-photos');
