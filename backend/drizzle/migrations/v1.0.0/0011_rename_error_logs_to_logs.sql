-- Renomear tabela error_logs para logs
ALTER TABLE IF EXISTS "error_logs" RENAME TO "logs";

-- Renomear Foreign Key constraint se existir
DO $$ BEGIN
  ALTER TABLE "logs" RENAME CONSTRAINT "error_logs_user_id_profiles_id_fk" TO "logs_user_id_profiles_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Atualizar RLS Policies
ALTER TABLE IF EXISTS "logs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_logs_admin_policy" ON "logs";
DROP POLICY IF EXISTS "logs_admin_policy" ON "logs";

CREATE POLICY "logs_admin_policy" ON "logs"
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
