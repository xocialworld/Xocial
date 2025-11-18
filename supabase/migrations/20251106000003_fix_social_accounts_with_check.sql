DO $migration$
DECLARE
  tbl RECORD;
  policy_name TEXT;
  ddl TEXT;
BEGIN
  FOR tbl IN
    SELECT *
    FROM (VALUES
      ('social_accounts', ARRAY['Owners and editors can manage social accounts'], ARRAY[
        $sql$CREATE POLICY "Owners and editors can manage social accounts"
            ON public.social_accounts
            FOR ALL
            USING (
                workspace_id IN (
                    SELECT id FROM public.workspaces
                    WHERE owner_id = auth.uid()
                    UNION
                    SELECT workspace_id FROM public.workspace_members
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                )
            )
            WITH CHECK (
                workspace_id IN (
                    SELECT id FROM public.workspaces
                    WHERE owner_id = auth.uid()
                    UNION
                    SELECT workspace_id FROM public.workspace_members
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                )
            );$sql$
      ]),
      ('campaigns', ARRAY['Owners and editors can manage campaigns'], ARRAY[
        $sql$CREATE POLICY "Owners and editors can manage campaigns"
            ON public.campaigns
            FOR ALL
            USING (
                workspace_id IN (
                    SELECT id FROM public.workspaces
                    WHERE owner_id = auth.uid()
                    UNION
                    SELECT workspace_id FROM public.workspace_members
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                )
            )
            WITH CHECK (
                workspace_id IN (
                    SELECT id FROM public.workspaces
                    WHERE owner_id = auth.uid()
                    UNION
                    SELECT workspace_id FROM public.workspace_members
                    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                )
            );$sql$
      ]),
      ('post_media', ARRAY['Owners and editors can manage post media'], ARRAY[
        $sql$CREATE POLICY "Owners and editors can manage post media"
            ON public.post_media
            FOR ALL
            USING (
                post_id IN (
                    SELECT id FROM public.posts
                    WHERE workspace_id IN (
                        SELECT id FROM public.workspaces
                        WHERE owner_id = auth.uid()
                        UNION
                        SELECT workspace_id FROM public.workspace_members
                        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                    )
                )
            )
            WITH CHECK (
                post_id IN (
                    SELECT id FROM public.posts
                    WHERE workspace_id IN (
                        SELECT id FROM public.workspaces
                        WHERE owner_id = auth.uid()
                        UNION
                        SELECT workspace_id FROM public.workspace_members
                        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                    )
                )
            );$sql$
      ])
    ) AS t(table_name, drop_policies, create_statements)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl.table_name
    ) THEN
      RAISE NOTICE 'Skipping policy fix for %, table missing', tbl.table_name;
      CONTINUE;
    END IF;

    FOREACH policy_name IN ARRAY tbl.drop_policies LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_name, tbl.table_name);
    END LOOP;

    FOREACH ddl IN ARRAY tbl.create_statements LOOP
      EXECUTE ddl;
    END LOOP;
  END LOOP;
END;
$migration$;

