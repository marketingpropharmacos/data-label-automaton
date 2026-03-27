
-- Tabela de configurações centralizadas do sistema
CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler
CREATE POLICY "Authenticated users can read system_config"
ON public.system_config FOR SELECT
TO authenticated
USING (true);

-- Somente admin pode inserir/atualizar
CREATE POLICY "Admins can insert system_config"
ON public.system_config FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system_config"
ON public.system_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inserir configurações padrão de produção
INSERT INTO public.system_config (key, value) VALUES
  ('api_config', '{"serverUrl": "http://192.168.6.46:5000", "codigoFilial": "279"}'::jsonb),
  ('pharmacy_config', '{"nome": "Pro Pharmacos", "endereco": "Endereco da Farmacia", "telefone": "(00) 0000-0000", "cnpj": "00.000.000/0001-00", "farmaceutico": "Farm. Responsavel", "crf": "CRF-XX 0000"}'::jsonb),
  ('print_stations', '[{"id": "edi", "nome": "PC da Edi", "agentUrl": ""}, {"id": "daniel", "nome": "PC do Daniel", "agentUrl": "https://nonethnical-leaden-veda.ngrok-free.dev"}]'::jsonb),
  ('layout_printer_map', '{"A_PAC_PEQ": "PEQUENO", "A_PAC_GRAN": "AMP GRANDE", "AMP_CX": "AMP CAIXA", "AMP10": "CAIXA GRANDE", "TIRZ": "PEQUENO"}'::jsonb),
  ('layout_station_map', '{"A_PAC_PEQ": "edi", "A_PAC_GRAN": "edi", "AMP_CX": "daniel", "AMP10": "daniel", "TIRZ": "edi"}'::jsonb),
  ('modo_impressao', '"rotutx"'::jsonb);
