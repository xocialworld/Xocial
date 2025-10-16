"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, RefreshCw, Save, Calendar } from "lucide-react";
import { toast } from "sonner";

const platforms = ["facebook", "instagram", "twitter", "linkedin", "youtube"];
const contentTypes = ["promotional", "educational", "entertaining", "inspirational", "community"];
const tones = ["professional", "casual", "humorous", "motivational", "friendly"];

export default function CPage() {
  const [brief, setBrief] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);
  const [contentType, setContentType] = useState("promotional");
  const [tone, setTone] = useState("professional");
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("instagram");

  const handleGenerate = async () => {
    if (!brief.trim()) {
      toast.error("Please enter a content brief");
      return;
    }

    setIsGenerating(true);

    // Simulate AI generation (in production, this would call an AI API)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const content: Record<string, string> = {};
    selectedPlatforms.forEach((platform) => {
      content[platform] = generateMockContent(platform, brief, contentType, tone);
    });

    setGeneratedContent(content);
    setIsGenerating(false);
    toast.success("Content generated successfully!");
  };

  const generateMockContent = (
    platform: string,
    brief: string,
    type: string,
    tone: string
  ): string => {
    return `🚀 ${brief}\n\nThis is AI-generated ${type} content with a ${tone} tone for ${platform}!\n\n✨ Key highlights:\n• Engaging and relevant\n• Optimized for ${platform}\n• ${tone.charAt(0).toUpperCase() + tone.slice(1)} approach\n\n#SocialMedia #ContentCreation #AI #Marketing`;
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">
          AI Content Assistant
        </h1>
        <p className="mt-2 text-secondary-600">
          Describe your idea and let AI help you create engaging content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Input Section */}
        <div className="lg:col-span-2">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Content Brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brief Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe your content idea
                </label>
                <textarea
                  className="w-full min-h-32 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 'Summer product launch for water bottles'"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-secondary-500 mt-1">
                  {brief.length}/500 characters
                </p>
              </div>

              {/* Platform Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Target Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`
                        px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                        ${selectedPlatforms.includes(platform)
                          ? "bg-primary-600 text-white"
                          : "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
                        }
                      `}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Content Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                >
                  {contentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone of Voice */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tone of Voice
                </label>
                <select
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  {tones.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !brief.trim() || selectedPlatforms.length === 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview Section */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Content</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(generatedContent).length === 0 ? (
                <div className="text-center py-12 text-secondary-500">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-secondary-400" />
                  <p>Generate content to see AI-powered suggestions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Platform Tabs */}
                  <div className="flex gap-2 border-b border-secondary-200">
                    {selectedPlatforms.map((platform) => (
                      <button
                        key={platform}
                        onClick={() => setActiveTab(platform)}
                        className={`
                          px-4 py-2 font-medium text-sm transition-colors
                          ${activeTab === platform
                            ? "border-b-2 border-primary-600 text-primary-600"
                            : "text-secondary-600 hover:text-secondary-900"
                          }
                        `}
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Content Preview */}
                  <div className="space-y-4">
                    <div className="bg-secondary-50 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-secondary-900 font-sans">
                        {generatedContent[activeTab]}
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleGenerate()}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleCopy(generatedContent[activeTab])}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      <Button variant="secondary">
                        <Save className="mr-2 h-4 w-4" />
                        Save as Draft
                      </Button>
                      <Button>
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Refine Section */}
          {Object.keys(generatedContent).length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Refine & Optimize</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {["Add emoji", "Add urgency", "Add call-to-action", "More casual", "More formal", "Optimize for engagement"].map(
                    (suggestion) => (
                      <Badge
                        key={suggestion}
                        className="cursor-pointer hover:bg-primary-700 transition-colors"
                        onClick={() => toast.info(`Applying: ${suggestion}`)}
                      >
                        {suggestion}
                      </Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

