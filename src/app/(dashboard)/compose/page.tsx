'use client';

import { useState } from 'react';
import { PostComposer } from './components/post-composer';
import { PageHeader } from '@/components/shared/page-header';

export default function ComposePage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Create Post"
        description="Compose and schedule posts across all your social media platforms"
      />
      
      <div className="mt-8">
        <PostComposer />
      </div>
    </div>
  );
}

