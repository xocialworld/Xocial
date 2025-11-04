"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { Select, SelectOption } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, RefreshCw, Copy, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

const platforms: SelectOption[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

const tones: SelectOption[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'informative', label: 'Informative' },
];

export default function CPage() {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('casual');
  const [addEmojis, setAddEmojis] = useState(true);
  const [addHashtags, setAddHashtags] = useState(true);
  const [addCTA, setAddCTA] = useState(true);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          prompt,
          tone,
          addEmojis,
          addHashtags,
          addCTA,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate content');

      const data = await response.json();
      setGeneratedContent(data.data.text);
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">
          AI Content Generator
        </h1>
        <p className="mt-2 text-secondary-600">
          Create engaging social media content with AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Content Brief
            </h2>

            {/* Platform Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                Platform
              </label>
              <Select
                options={platforms}
                value={selectedPlatform}
                onChange={setSelectedPlatform}
              />
            </div>

            {/* Prompt */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                What do you want to post about?
              </label>
              <TextArea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Announce our new product launch, share tips about productivity, promote upcoming webinar..."
                rows={4}
              />
            </div>

            {/* Tone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-900 mb-2">
                Tone
              </label>
              <Select
                options={tones}
                value={tone}
                onChange={setTone}
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addEmojis}
                  onChange={(e) => setAddEmojis(e.target.checked)}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">Add Emojis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addHashtags}
                  onChange={(e) => setAddHashtags(e.target.checked)}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">Add Hashtags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addCTA}
                  onChange={(e) => setAddCTA(e.target.checked)}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">Add Call-to-Action</span>
              </label>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-6"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-secondary-900">
                Generated Content
              </h2>
              {generatedContent && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-xs"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                </div>
              )}
            </div>

            {generatedContent ? (
              <>
                <div className="mb-4 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-secondary-900">
                    {generatedContent}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-secondary-200">
                  <div className="text-xs text-secondary-600">
                    {generatedContent.length} characters
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary">
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Refine
                    </Button>
                    <Button size="sm">
                      <Calendar className="mr-1 h-3 w-3" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-12 w-12 text-secondary-300 mb-4" />
                <p className="text-secondary-600">
                  Generated content will appear here
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
