'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Copy, Trash2, ExternalLink } from 'lucide-react';
import { Template } from '../hooks/useTemplates';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface TemplateGridProps {
  templates: Template[];
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  promotional: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  educational: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  engagement: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  announcement: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function TemplateGrid({ templates, onDelete, onRefresh }: TemplateGridProps) {
  const router = useRouter();

  const handleUseTemplate = (template: Template) => {
    // Store template in sessionStorage for the composer
    sessionStorage.setItem('template', JSON.stringify(template));
    toast.success('Opening composer with this template...');
    router.push('/c');
  };

  const handleCopyTemplate = (template: Template) => {
    const text = JSON.stringify(template.content, null, 2);
    navigator.clipboard.writeText(text);
    toast.success('Template content copied to clipboard');
  };

  const handleDelete = async (template: Template) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      await onDelete(template.id);
    }
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No templates found.</p>
            <p className="text-sm text-muted-foreground">
              Create your first template to reuse content across platforms.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.description && (
                  <CardDescription className="mt-1">{template.description}</CardDescription>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Use Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCopyTemplate(template)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Content
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(template)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general}>
                {template.category}
              </Badge>
              {template.is_public && (
                <Badge variant="secondary">Public</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {template.platforms.map((platform) => (
                <Badge key={platform} variant="secondary" className="text-xs capitalize">
                  {platform}
                </Badge>
              ))}
            </div>

            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <span key={tag} className="text-xs text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Used {template.usage_count} times</span>
              <span>
                {new Date(template.created_at).toLocaleDateString()}
              </span>
            </div>

            <Button
              className="w-full"
              onClick={() => handleUseTemplate(template)}
            >
              Use Template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

