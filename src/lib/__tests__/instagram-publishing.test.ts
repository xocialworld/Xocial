import {
  isInstagramPostType,
  nearlyNineSixteen,
  normalizeInstagramPostType,
  parseCommaList,
} from '../instagram-publishing';

describe('instagram publishing helpers', () => {
  it('normalizes explicit post types', () => {
    expect(normalizeInstagramPostType({ postType: 'story' })).toBe('story');
    expect(normalizeInstagramPostType({ postType: 'reel' })).toBe('reel');
  });

  it('keeps legacy media type compatibility', () => {
    expect(normalizeInstagramPostType({ mediaType: 'REELS' })).toBe('reel');
    expect(normalizeInstagramPostType({ mediaType: 'STORIES' })).toBe('story');
    expect(normalizeInstagramPostType({ mediaType: 'CAROUSEL_ALBUM' })).toBe('carousel');
    expect(normalizeInstagramPostType({ mediaCount: 2 })).toBe('carousel');
    expect(normalizeInstagramPostType({ mediaCount: 1 })).toBe('feed');
  });

  it('validates supported post type ids', () => {
    expect(isInstagramPostType('feed')).toBe(true);
    expect(isInstagramPostType('highlight')).toBe(false);
  });

  it('parses comma-separated advanced fields', () => {
    expect(parseCommaList('one, two,, three')).toEqual(['one', 'two', 'three']);
    expect(parseCommaList(['one', ' two '])).toEqual(['one', 'two']);
  });

  it('detects near 9:16 videos', () => {
    expect(nearlyNineSixteen(1080, 1920)).toBe(true);
    expect(nearlyNineSixteen(1920, 1080)).toBe(false);
  });
});
