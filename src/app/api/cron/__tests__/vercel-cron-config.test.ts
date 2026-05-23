import fs from 'fs';
import path from 'path';

describe('vercel cron configuration', () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')
  );

  it('does not cache API responses that trigger side effects', () => {
    expect(config.headers).toContainEqual({
      source: '/api/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, max-age=0',
        },
      ],
    });
  });
});
