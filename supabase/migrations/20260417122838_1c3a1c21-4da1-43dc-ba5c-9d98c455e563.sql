-- Drop existing restrictive policies on saved_rotulos
DROP POLICY IF EXISTS "Admin/financeiro insert saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Admin/financeiro update saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Admin/financeiro delete saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Admins podem inserir saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Admins podem atualizar saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Admins podem deletar saved_rotulos" ON public.saved_rotulos;

-- Recreate with operational roles allowed for INSERT/UPDATE
CREATE POLICY "Operadores podem inserir saved_rotulos"
ON public.saved_rotulos
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'financeiro'::public.app_role)
  OR public.has_role(auth.uid(), 'lider'::public.app_role)
  OR public.has_role(auth.uid(), 'operador'::public.app_role)
  OR public.has_role(auth.uid(), 'operador_lab'::public.app_role)
);

CREATE POLICY "Operadores podem atualizar saved_rotulos"
ON public.saved_rotulos
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'financeiro'::public.app_role)
  OR public.has_role(auth.uid(), 'lider'::public.app_role)
  OR public.has_role(auth.uid(), 'operador'::public.app_role)
  OR public.has_role(auth.uid(), 'operador_lab'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'financeiro'::public.app_role)
  OR public.has_role(auth.uid(), 'lider'::public.app_role)
  OR public.has_role(auth.uid(), 'operador'::public.app_role)
  OR public.has_role(auth.uid(), 'operador_lab'::public.app_role)
);

-- DELETE remains restricted to admin/financeiro
CREATE POLICY "Admin/financeiro podem deletar saved_rotulos"
ON public.saved_rotulos
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'financeiro'::public.app_role)
);