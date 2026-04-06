
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Authenticated users can insert saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Authenticated users can update saved_rotulos" ON public.saved_rotulos;
DROP POLICY IF EXISTS "Authenticated users can delete saved_rotulos" ON public.saved_rotulos;

-- Create new permissive policies for all authenticated users
CREATE POLICY "Authenticated users can read saved_rotulos"
ON public.saved_rotulos FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert saved_rotulos"
ON public.saved_rotulos FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update saved_rotulos"
ON public.saved_rotulos FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete saved_rotulos"
ON public.saved_rotulos FOR DELETE TO authenticated
USING (true);
