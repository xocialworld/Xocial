import { extractCalendarEntries } from '../use-calendar-posts';

describe('extractCalendarEntries', () => {
  const entry = {
    id: 'post-1',
    source: 'legacy',
    calendarDate: '2026-05-24T10:00:00.000Z',
    status: 'published',
    platforms: ['instagram'],
    createdAt: '2026-05-24T10:00:00.000Z',
    workspaceId: 'workspace-1',
  };

  it('reads entries from the standard API success envelope', () => {
    expect(
      extractCalendarEntries({
        success: true,
        data: {
          entries: [entry],
          count: 1,
          meta: { workspaceId: 'workspace-1' },
        },
      })
    ).toEqual([entry]);
  });

  it('keeps compatibility with unwrapped calendar responses', () => {
    expect(
      extractCalendarEntries({
        entries: [entry],
        count: 1,
        meta: { workspaceId: 'workspace-1' },
      })
    ).toEqual([entry]);
  });
});
