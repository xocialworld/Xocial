'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Copy } from 'lucide-react';
import { ContentIdea } from '../hooks/useStrategy';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ContentIdeasGridProps {
  ideas: ContentIdea[];
}

export function ContentIdeasGrid({ ideas }: ContentIdeasGridProps) {
  const router = useRouter();

  const handleUseIdea = (idea: ContentIdea) => {
    // Store the idea in sessionStorage to prefill the composer
    sessionStorage.setItem('contentIdea', JSON.stringify(idea));
    toast.success('Opening composer with this idea...');
    router.push('/compose');
  };

  const handleCopyIdea = (idea: ContentIdea) => {
    const text = `${idea.title}\n\n${idea.description}`;
    navigator.clipboard.writeText(text);
    toast.success('Content idea copied to clipboard');
  };

  if (ideas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Content Ideas
          </CardTitle>
          <CardDescription>
            Get inspired with AI-generated content suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No content ideas available yet. Check back later for fresh suggestions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Content Ideas
        </CardTitle>
        <CardDescription>
          Get inspired with AI-generated content suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {ideas.map((idea) => (
            <div key={idea.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold leading-tight">{idea.title}</h4>
                {idea.trending && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Trending
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{idea.description}</p>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {idea.topic}
                </Badge>
                {idea.platforms.map((platform) => (
                  <Badge key={platform} variant="secondary" className="text-xs capitalize">
                    {platform}
                  </Badge>
                ))}
              </div>

              {idea.estimatedEngagement && (
                <div className="text-xs text-muted-foreground">
                  Est. Engagement: {idea.estimatedEngagement}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleUseIdea(idea)}
                >
                  Use This Idea
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleCopyIdea(idea)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

