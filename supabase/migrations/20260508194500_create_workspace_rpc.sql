-- Cria workspace no servidor com SECURITY DEFINER para não depender de RLS
-- no INSERT/RETURNING do cliente (evita erro ao ler a linha nova antes do trigger de membership).

CREATE OR REPLACE FUNCTION public.create_workspace(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  IF btrim(p_name) = '' THEN
    RAISE EXCEPTION 'name required' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.workspaces (name, created_by)
  VALUES (btrim(p_name), v_uid)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace(text) TO authenticated;
