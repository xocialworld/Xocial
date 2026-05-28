import {
  LEARNING_EVENT_SCHEMA_VERSION,
  buildLearningEventKey,
  recordLearningEvent,
  recordLearningEvents,
  validateLearningEventInput,
} from '../learning';

function createSupabaseMock(error: any = null) {
  const insert = jest.fn().mockResolvedValue({ error });
  const from = jest.fn(() => ({ insert }));
  return { supabase: { from } as any, from, insert };
}

describe('learning events', () => {
  it('adds a consistent metadata envelope when recording events', async () => {
    const { from, insert, supabase } = createSupabaseMock();

    await recordLearningEvent(supabase, {
      workspaceId: 'workspace-1',
      actorUserId: 'user-1',
      source: 'user',
      eventType: 'post_content_edited',
      entityType: 'post',
      entityId: 'post-1',
      platform: 'instagram',
      signalStrength: 0.6,
      metadata: {
        changedFields: ['content'],
      },
    });

    expect(from).toHaveBeenCalledWith('learning_events');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'workspace-1',
        actor_user_id: 'user-1',
        source: 'user',
        event_type: 'post_content_edited',
        entity_type: 'post',
        entity_id: 'post-1',
        platform: 'instagram',
        signal_strength: 0.6,
        event_key: null,
        metadata: expect.objectContaining({
          schemaVersion: LEARNING_EVENT_SCHEMA_VERSION,
          source: 'user',
          entityType: 'post',
          entityId: 'post-1',
          platform: 'instagram',
          changedFields: ['content'],
        }),
      })
    );
  });

  it('records event batches without failing on null entries', async () => {
    const { insert, supabase } = createSupabaseMock();

    await recordLearningEvents(supabase, [
      {
        workspaceId: 'workspace-1',
        eventType: 'platform_variant_created',
        entityType: 'post',
        entityId: 'post-1',
      },
      null,
      undefined,
    ]);

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the intelligence table is missing', async () => {
    const { supabase } = createSupabaseMock({ code: '42P01', message: 'missing table' });

    await expect(
      recordLearningEvent(supabase, {
        workspaceId: 'workspace-1',
        eventType: 'post_created',
      })
    ).resolves.toMatchObject({ recorded: false });
  });

  it('validates contracts and builds stable idempotency keys', () => {
    const validation = validateLearningEventInput({
      workspaceId: 'workspace-1',
      eventType: 'publish_succeeded',
      entityType: 'post',
      entityId: 'post-1',
      source: 'scheduler',
    });

    expect(validation.warnings).toContain('missing_required_platform');
    expect(
      buildLearningEventKey({
        workspaceId: 'workspace-1',
        eventType: 'metric_synced',
        entityType: 'post',
        entityId: 'post-1',
        platform: 'Instagram',
        discriminator: 'hour-1',
      })
    ).toBe('workspace-1:metric_synced:post:post-1:instagram:hour-1');
  });
});
