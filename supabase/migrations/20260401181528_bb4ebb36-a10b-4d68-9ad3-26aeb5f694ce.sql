
CREATE TABLE public.saved_rotulos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nr_requisicao TEXT NOT NULL,
  item_id TEXT NOT NULL,
  texto_livre TEXT NOT NULL,
  saved_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nr_requisicao, item_id)
);

ALTER TABLE public.saved_rotulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read saved_rotulos"
  ON public.saved_rotulos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert saved_rotulos"
  ON public.saved_rotulos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update saved_rotulos"
  ON public.saved_rotulos FOR UPDATE
  TO authenticated
  USING (true);
