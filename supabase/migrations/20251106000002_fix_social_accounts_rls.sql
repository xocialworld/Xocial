-- Fix workspace-scoped RLS to allow workspace owners access without requiring workspace_members rows
-- Idempotent + rerunnable via guarded dynamic SQL

DO $migration$
DECLARE
  tbl RECORD;
  policy_name TEXT;
  ddl TEXT;
BEGIN
  FOR tbl IN
    SELECT *
    FROM (VALUES
      ('social_accounts', ARRAY[
          'Members can view social accounts',
          'Editors can manage social accounts',
          'Users can view social accounts in their workspaces',
          'Workspace owners can manage social accounts',
          'Workspace members can view social accounts',
          'Workspace members can manage social accounts based on role',
          'Owners and members can view social accounts',
          'Owners and editors can manage social accounts'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view social accounts"
              ON public.social_accounts FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and editors can manage social accounts"
              ON public.social_accounts FOR ALL
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                  )
              );$sql$
        ]),
      ('posts', ARRAY[
          'Members can view posts',
          'Editors can create posts',
          'Editors can update posts',
          'Editors can delete posts',
          'Owners and members can view posts',
          'Owners and editors can create posts',
          'Owners and editors can update posts',
          'Owners and editors can delete posts'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view posts"
              ON public.posts FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and editors can create posts"
              ON public.posts FOR INSERT
              WITH CHECK (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and editors can update posts"
              ON public.posts FOR UPDATE
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and editors can delete posts"
              ON public.posts FOR DELETE
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                  )
              );$sql$
        ]),
      ('post_analytics', ARRAY[
          'Members can view post analytics',
          'Owners and members can view post analytics'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view post analytics"
              ON public.post_analytics FOR SELECT
              USING (
                  post_id IN (
                      SELECT id FROM public.posts 
                      WHERE workspace_id IN (
                          SELECT id FROM public.workspaces 
                          WHERE owner_id = auth.uid()
                          UNION
                          SELECT workspace_id FROM public.workspace_members 
                          WHERE user_id = auth.uid()
                      )
                  )
              );$sql$
        ]),
      ('comments', ARRAY[
          'Members can view comments',
          'Owners and members can view comments'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view comments"
              ON public.comments FOR SELECT
              USING (
                  post_id IN (
                      SELECT id FROM public.posts 
                      WHERE workspace_id IN (
                          SELECT id FROM public.workspaces 
                          WHERE owner_id = auth.uid()
                          UNION
                          SELECT workspace_id FROM public.workspace_members 
                          WHERE user_id = auth.uid()
                      )
                  )
              );$sql$
        ]),
      ('ai_generations', ARRAY[
          'Members can view ai generations',
          'Members can create ai generations',
          'Owners and members can view ai generations',
          'Owners and members can create ai generations'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view ai generations"
              ON public.ai_generations FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and members can create ai generations"
              ON public.ai_generations FOR INSERT
              WITH CHECK (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$
        ]),
      ('strategy_recommendations', ARRAY[
          'Members can view strategy recommendations',
          'Owners and members can view strategy recommendations'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view strategy recommendations"
              ON public.strategy_recommendations FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$
        ]),
      ('api_call_logs', ARRAY[
          'Members can view api logs',
          'Owners and members can view api logs'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view api logs"
              ON public.api_call_logs FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$
        ]),
      ('campaigns', ARRAY[
          'Members can view campaigns',
          'Editors can manage campaigns',
          'Owners and members can view campaigns',
          'Owners and editors can manage campaigns'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view campaigns"
              ON public.campaigns FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and editors can manage campaigns"
              ON public.campaigns FOR ALL
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
                  )
              );$sql$
        ]),
      ('media', ARRAY[
          'Users can view media in their workspace',
          'Users can upload media to their workspace',
          'Owners and members can view media',
          'Owners and members can upload media'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view media"
              ON public.media FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and members can upload media"
              ON public.media FOR INSERT
              WITH CHECK (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$
        ]),
      ('post_media', ARRAY[
          'Users can view post media',
          'Users can manage post media',
          'Owners and members can view post media',
          'Owners and editors can manage post media'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view post media"
              ON public.post_media FOR SELECT
              USING (
                  post_id IN (
                      SELECT id FROM public.posts 
                      WHERE workspace_id IN (
                          SELECT id FROM public.workspaces 
                          WHERE owner_id = auth.uid()
                          UNION
                          SELECT workspace_id FROM public.workspace_members 
                          WHERE user_id = auth.uid()
                      )
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and editors can manage post media"
              ON public.post_media FOR ALL
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
              );$sql$
        ]),
      ('templates', ARRAY[
          'Users can view templates in their workspace',
          'Users can create templates',
          'Owners and members can view templates',
          'Owners and members can create templates'
        ], ARRAY[
          $sql$CREATE POLICY "Owners and members can view templates"
              ON public.templates FOR SELECT
              USING (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
                  )
              );$sql$,
          $sql$CREATE POLICY "Owners and members can create templates"
              ON public.templates FOR INSERT
              WITH CHECK (
                  workspace_id IN (
                      SELECT id FROM public.workspaces 
                      WHERE owner_id = auth.uid()
                      UNION
                      SELECT workspace_id FROM public.workspace_members 
                      WHERE user_id = auth.uid()
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
      RAISE NOTICE 'Skipping RLS fix for %, table missing', tbl.table_name;
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

