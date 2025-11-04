'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateTemplateInput } from '../hooks/useTemplates';
import { Loader2 } from 'lucide-react';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  category: z.string().min(1, 'Category is required'),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  tags: z.string().optional(),
  is_public: z.boolean().default(false),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateTemplateInput) => Promise<any>;
}

const CATEGORIES = [
  { value: 'promotional', label: 'Promotional' },
  { value: 'educational', label: 'Educational' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'general', label: 'General' },
];

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
];

export function CreateTemplateDialog({ open, onOpenChange, onCreate }: CreateTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      is_public: false,
      platforms: [],
    },
  });

  const category = watch('category');
  const isPublic = watch('is_public');

  const togglePlatform = (platformId: string) => {
    const newPlatforms = selectedPlatforms.includes(platformId)
      ? selectedPlatforms.filter((p) => p !== platformId)
      : [...selectedPlatforms, platformId];
    
    setSelectedPlatforms(newPlatforms);
    setValue('platforms', newPlatforms);
  };

  const onSubmit = async (data: TemplateFormData) => {
    try {
      setLoading(true);
      
      const tags = data.tags
        ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

      const input: CreateTemplateInput = {
        name: data.name,
        description: data.description,
        content: { text: data.content }, // Store as structured content
        category: data.category,
        platforms: data.platforms,
        tags,
        is_public: data.is_public,
      };

      await onCreate(input);
      reset();
      setSelectedPlatforms([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Create template error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Save a reusable content template for future posts
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Weekly Product Launch"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of this template"
              {...register('description')}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={(value) => setValue('category', value)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label>
              Platforms <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => (
                <div key={platform.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform.id}
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <Label htmlFor={platform.id} className="cursor-pointer">
                    {platform.label}
                  </Label>
                </div>
              ))}
            </div>
            {errors.platforms && (
              <p className="text-sm text-destructive">{errors.platforms.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Template Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Write your template content here..."
              rows={8}
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., product, launch, announcement"
              {...register('tags')}
            />
            <p className="text-xs text-muted-foreground">
              Add tags to make your template easier to find
            </p>
          </div>

          {/* Is Public */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_public"
              checked={isPublic}
              onCheckedChange={(checked) => setValue('is_public', checked as boolean)}
            />
            <Label htmlFor="is_public" className="cursor-pointer">
              Make this template public (visible to team members)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

