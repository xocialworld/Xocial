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
            expect(getPlatformGradient('instagram')).toContain('from-[#F58529]');
            expect(getPlatformGradient('facebook')).toContain('from-[#1877F2]');
            expect(getPlatformGradient('twitter')).toContain('from-[#1DA1F2]');
            expect(getPlatformGradient('linkedin')).toContain('from-[#0A66C2]');
            expect(getPlatformGradient('tiktok')).toContain('from-[#000000]');
            expect(getPlatformGradient('youtube')).toContain('from-[#FF0000]');
        });

        it('should return default gradient for unknown platform', () => {
            expect(getPlatformGradient('unknown' as Platform)).toContain('from-gray-600');
        });
    });

    describe('getPlatformBadgeColor', () => {
        it('should return badge color class for each platform', () => {
            expect(getPlatformBadgeColor('instagram')).toContain('bg-pink-500');
            expect(getPlatformBadgeColor('facebook')).toContain('bg-blue-600');
            expect(getPlatformBadgeColor('twitter')).toContain('bg-sky-500');
            expect(getPlatformBadgeColor('linkedin')).toContain('bg-blue-700');
            expect(getPlatformBadgeColor('tiktok')).toContain('bg-gray-900');
            expect(getPlatformBadgeColor('youtube')).toContain('bg-red-600');
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
            expect(getCharacterLimit('unknown' as Platform)).toBe(280);
        });
    });

    describe('getCharacterCountColor', () => {
        it('should return green for low usage (< 90%)', () => {
            const color = getCharacterCountColor(100, 280); // 35% usage
            expect(color).toContain('text-green');
        });

        it('should return yellow for medium usage (90-100%)', () => {
            const color = getCharacterCountColor(255, 280); // 91% usage
            expect(color).toContain('text-yellow');
        });

        it('should return red for over limit (> 100%)', () => {
            const color = getCharacterCountColor(281, 280); // Over limit
            expect(color).toContain('text-red');
        });
    });

    describe('platformNames', () => {
        it('should have names for all platforms', () => {
            expect(platformNames.instagram).toBe('Instagram');
            expect(platformNames.facebook).toBe('Facebook');
            expect(platformNames.twitter).toBe('Twitter');
            expect(platformNames.linkedin).toBe('LinkedIn');
            expect(platformNames.tiktok).toBe('TikTok');
            expect(platformNames.youtube).toBe('YouTube');
        });
    });
});
