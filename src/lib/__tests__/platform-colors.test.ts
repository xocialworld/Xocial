/**
 * Platform Colors Utility Tests
 * Tests for platform-specific branding, colors, and character limits
 */

import {
    getPlatformColor,
    getPlatformGradient,
    getPlatformBadgeColor,
    getCharacterLimit,
    getCharacterCountColor,
    platformNames,
    type Platform,
} from '../platform-colors';

describe('Platform Colors Utility', () => {
    describe('getPlatformColor', () => {
        it('should return correct color for each platform', () => {
            expect(getPlatformColor('instagram')).toBe('#E4405F');
            expect(getPlatformColor('facebook')).toBe('#1877F2');
            expect(getPlatformColor('twitter')).toBe('#1DA1F2');
            expect(getPlatformColor('linkedin')).toBe('#0A66C2');
            expect(getPlatformColor('tiktok')).toBe('#000000');
            expect(getPlatformColor('youtube')).toBe('#FF0000');
        });

        it('should return default color for unknown platform', () => {
            expect(getPlatformColor('unknown' as Platform)).toBe('#6B7280');
        });
    });

    describe('getPlatformGradient', () => {
        it('should return gradient class for each platform', () => {
            expect(getPlatformGradient('instagram')).toContain('from-pink-500');
            expect(getPlatformGradient('facebook')).toContain('from-blue-600');
            expect(getPlatformGradient('twitter')).toContain('from-sky-500');
            expect(getPlatformGradient('linkedin')).toContain('from-blue-700');
            expect(getPlatformGradient('tiktok')).toContain('from-black');
            expect(getPlatformGradient('youtube')).toContain('from-red-600');
        });

        it('should return default gradient for unknown platform', () => {
            expect(getPlatformGradient('unknown' as Platform)).toContain('from-gray-500');
        });
    });

    describe('getPlatformBadgeColor', () => {
        it('should return badge color class for each platform', () => {
            expect(getPlatformBadgeColor('instagram')).toContain('bg-pink-100');
            expect(getPlatformBadgeColor('facebook')).toContain('bg-blue-100');
            expect(getPlatformBadgeColor('twitter')).toContain('bg-sky-100');
            expect(getPlatformBadgeColor('linkedin')).toContain('bg-blue-100');
            expect(getPlatformBadgeColor('tiktok')).toContain('bg-gray-100');
            expect(getPlatformBadgeColor('youtube')).toContain('bg-red-100');
        });
    });

    describe('getCharacterLimit', () => {
        it('should return correct character limits', () => {
            expect(getCharacterLimit('twitter')).toBe(280);
            expect(getCharacterLimit('instagram')).toBe(2200);
            expect(getCharacterLimit('facebook')).toBe(63206);
            expect(getCharacterLimit('linkedin')).toBe(3000);
            expect(getCharacterLimit('tiktok')).toBe(2200);
            expect(getCharacterLimit('youtube')).toBe(5000);
        });

        it('should return default limit for unknown platform', () => {
            expect(getCharacterLimit('unknown' as Platform)).toBe(2200);
        });
    });

    describe('getCharacterCountColor', () => {
        it('should return green for low usage (< 80%)', () => {
            const color = getCharacterCountColor(100, 280); // 35% usage
            expect(color).toContain('text-green');
        });

        it('should return yellow for medium usage (80-95%)', () => {
            const color = getCharacterCountColor(240, 280); // 85% usage
            expect(color).toContain('text-yellow');
        });

        it('should return red for high usage (> 95%)', () => {
            const color = getCharacterCountColor(270, 280); // 96% usage
            expect(color).toContain('text-red');
        });

        it('should return red for over limit', () => {
            const color = getCharacterCountColor(300, 280); // Over limit
            expect(color).toContain('text-red');
        });
    });

    describe('platformNames', () => {
        it('should have names for all platforms', () => {
            expect(platformNames.instagram).toBe('Instagram');
            expect(platformNames.facebook).toBe('Facebook');
            expect(platformNames.twitter).toBe('Twitter / X');
            expect(platformNames.linkedin).toBe('LinkedIn');
            expect(platformNames.tiktok).toBe('TikTok');
            expect(platformNames.youtube).toBe('YouTube');
        });

        it('should have all platforms defined', () => {
            const platforms: Platform[] = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];
            platforms.forEach(platform => {
                expect(platformNames[platform]).toBeDefined();
                expect(platformNames[platform].length).toBeGreaterThan(0);
            });
        });
    });
});
