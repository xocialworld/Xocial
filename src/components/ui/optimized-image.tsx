/**
 * Optimized Image Component
 * Wrapper around Next.js Image with best practices
 * Based on SRS Section 8.2
 */

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImage Component
 * Features:
 * - Automatic WebP/AVIF conversion
 * - Lazy loading by default
 * - Blur placeholder support
 * - Responsive sizes
 * - Loading states
 * - Error handling
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  objectFit = 'cover',
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Default responsive sizes if not provided
  const defaultSizes = fill
    ? '100vw'
    : width
    ? `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`
    : '100vw';

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Error state
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100',
          fill ? 'absolute inset-0' : '',
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const imageProps = {
    src,
    alt,
    quality,
    priority,
    sizes: sizes || defaultSizes,
    placeholder: blurDataURL ? ('blur' as const) : placeholder,
    blurDataURL,
    onLoad: handleLoad,
    onError: handleError,
    className: cn(
      'transition-opacity duration-300',
      isLoading ? 'opacity-0' : 'opacity-100',
      className
    ),
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
        style={{ objectFit }}
      />
    );
  }

  if (!width || !height) {
    console.warn('[OptimizedImage] Width and height should be provided for non-fill images');
  }

  return (
    <Image
      {...imageProps}
      width={width}
      height={height}
      style={{ objectFit }}
    />
  );
}

/**
 * Avatar Image Component
 * Optimized for user avatars
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      objectFit="cover"
      quality={90}
      sizes={`${size}px`}
    />
  );
}

/**
 * Card Image Component
 * Optimized for card thumbnails
 */
export function CardImage({
  src,
  alt,
  aspectRatio = '16/9',
  className,
}: {
  src: string;
  alt: string;
  aspectRatio?: '1/1' | '4/3' | '16/9' | '21/9';
  className?: string;
}) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ aspectRatio }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        objectFit="cover"
        quality={85}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}

/**
 * Hero Image Component
 * Optimized for above-the-fold hero images
 */
export function HeroImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority // Load immediately (above the fold)
        objectFit="cover"
        quality={90}
        sizes="100vw"
      />
    </div>
  );
}

/**
 * Generate blur data URL from image
 * This would typically be done at build time or server-side
 */
export function generateBlurDataURL(width: number = 8, height: number = 8): string {
  // Simple gray blur placeholder
  // In production, use sharp or similar to generate from actual image
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#e5e7eb"/>
    </svg>`
  ).toString('base64')}`;
}

export default OptimizedImage;

