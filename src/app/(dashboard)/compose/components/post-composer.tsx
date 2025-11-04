'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlatformSelector } from './platform-selector';
import { ContentEditor } from './content-editor';
import { MediaUploader } from './media-uploader';
import { PreviewPanel } from './preview-panel';
import { SchedulePicker } from './schedule-picker';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function PostComposer() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!workspace) return;

      const { data } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('status', 'active');

      setAccounts(data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  const getCharacterLimit = (platform: string): number => {
    const limits: Record<string, number> = {
      twitter: 280,
      facebook: 63206,
      instagram: 2200,
      linkedin: 3000,
      youtube: 5000,
      tiktok: 2200,
    };
    return limits[platform.toLowerCase()] || 5000;
  };

  const isContentValid = () => {
    if (!content.trim()) return false;
    if (selectedPlatforms.length === 0) return false;
    
    // Check character limits for each platform
    for (const platform of selectedPlatforms) {
      if (content.length > getCharacterLimit(platform)) {
        return false;
      }
    }
    
    return true;
  };

  const handlePublish = async (isDraft = false) => {
    if (!isContentValid() && !isDraft) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsPublishing(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!workspace) {
        toast.error('Workspace not found');
        return;
      }

      // Build content object for each platform
      const postContent: Record<string, any> = {};
      selectedPlatforms.forEach(platform => {
        postContent[platform] = {
          text: content,
          // Add platform-specific formatting if needed
        };
      });

      // Create post
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          workspace_id: workspace.id,
          content: postContent,
          platforms: selectedPlatforms,
          status: isDraft ? 'draft' : (scheduledAt ? 'scheduled' : 'published'),
          scheduled_at: scheduledAt?.toISOString(),
          published_at: !scheduledAt && !isDraft ? new Date().toISOString() : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload media if any
      if (mediaFiles.length > 0 && post) {
        // TODO: Implement media upload
        console.log('Media upload not yet implemented');
      }

      toast.success(
        isDraft
          ? 'Draft saved'
          : scheduledAt
          ? 'Post scheduled successfully'
          : 'Post published successfully'
      );

      // Reset form
      setContent('');
      setSelectedPlatforms([]);
      setMediaFiles([]);
      setScheduledAt(null);

      // Navigate to calendar if scheduled, otherwise to accounts page
      if (scheduledAt) {
        router.push('/o');
      } else if (!isDraft) {
        router.push('/x');
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish post');
    } finally {
      setIsPublishing(false);
    }
  };

  const activeTab = selectedPlatforms[0] || 'preview';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Editor */}
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Select Platforms
          </h3>
          <PlatformSelector
            accounts={accounts}
            selected={selectedPlatforms}
            onChange={setSelectedPlatforms}
            loading={loading}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Content
          </h3>
          <ContentEditor
            value={content}
            onChange={setContent}
            platforms={selectedPlatforms}
            getCharacterLimit={getCharacterLimit}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Media (Optional)
          </h3>
          <MediaUploader
            files={mediaFiles}
            onChange={setMediaFiles}
            maxFiles={10}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Schedule (Optional)
          </h3>
          <SchedulePicker
            value={scheduledAt}
            onChange={setScheduledAt}
          />
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={() => handlePublish(true)}
            variant="secondary"
            disabled={isPublishing || !content.trim()}
            className="flex-1"
          >
            Save Draft
          </Button>
          
          <Button
            onClick={() => handlePublish(false)}
            disabled={isPublishing || !isContentValid()}
            className="flex-1"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : scheduledAt ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Schedule Post
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right Column - Preview */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Preview
          </h3>
          
          {selectedPlatforms.length > 0 ? (
            <Tabs value={activeTab} onValueChange={(value) => {}}>
              <TabsList>
                {selectedPlatforms.map(p => (
                  <TabsTrigger key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {selectedPlatforms.map(p => (
                <TabsContent key={p} value={p}>
                  <p className="text-gray-500 text-center py-4">
                    Preview for {p.charAt(0).toUpperCase() + p.slice(1)}
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Select platforms to see preview
            </p>
          )}

          <div className="mt-6">
            <PreviewPanel
              platform={activeTab}
              content={content}
              mediaFiles={mediaFiles}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

