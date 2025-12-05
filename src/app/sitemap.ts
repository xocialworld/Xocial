import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://xocial.world';

  const now = new Date()
  const route = (path: string, priority = 0.8): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority
  })

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'monthly' as const, priority: 1 },
    route('/auth/login'),
    route('/auth/signup'),
    route('/product/create'),
    route('/product/plan'),
    route('/product/approve'),
    route('/product/collaborate'),
    route('/product/schedule'),
    route('/product/analyze'),
    route('/solutions/brands'),
    route('/solutions/agencies'),
    route('/solutions/multi-location'),
    route('/pricing'),
    route('/blog'),
    route('/resources'),
    route('/resources/guides'),
    route('/resources/templates'),
    route('/resources/calculators'),
    route('/resources/quizzes'),
    route('/customers'),
    route('/start-program'),
    route('/support'),
  ];
}
