ALTER TABLE public.saved_rotulos
ADD COLUMN IF NOT EXISTS layout_type text;

UPDATE public.saved_rotulos
SET layout_type = 'LEGACY'
WHERE layout_type IS NULL;

ALTER TABLE public.saved_rotulos
ALTER COLUMN layout_type SET NOT NULL;

ALTER TABLE public.saved_rotulos
DROP CONSTRAINT IF EXISTS saved_rotulos_nr_requisicao_item_id_key;

ALTER TABLE public.saved_rotulos
ADD CONSTRAINT saved_rotulos_nr_requisicao_item_id_layout_type_key
UNIQUE (nr_requisicao, item_id, layout_type);

CREATE INDEX IF NOT EXISTS idx_saved_rotulos_req_item_layout
ON public.saved_rotulos (nr_requisicao, item_id, layout_type);

CREATE INDEX IF NOT EXISTS idx_saved_rotulos_req_layout
ON public.saved_rotulos (nr_requisicao, layout_type);