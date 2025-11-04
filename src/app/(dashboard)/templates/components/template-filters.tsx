'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedPlatforms: string[];
  onPlatformsChange: (platforms: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'educational', label: 'Educational' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'general', label: 'General' },
];

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
];

export function TemplateFilters({
  selectedCategory,
  onCategoryChange,
  selectedPlatforms,
  onPlatformsChange,
  searchQuery,
  onSearchChange,
}: TemplateFiltersProps) {
  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  const clearFilters = () => {
    onCategoryChange('all');
    onPlatformsChange([]);
    onSearchChange('');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedPlatforms.length > 0 || searchQuery !== '';

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Platforms */}
        <div className="space-y-2">
          <Label>Platforms</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <Badge
                key={platform.value}
                variant={selectedPlatforms.includes(platform.value) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => togglePlatform(platform.value)}
              >
                {platform.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

