'use client';

import { useState } from 'react';
import { useTemplates } from './hooks/useTemplates';
import { TemplateGrid } from './components/template-grid';
import { TemplateFilters } from './components/template-filters';
import { CreateTemplateDialog } from './components/create-template-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TemplatesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { templates, loading, error, refetch, createTemplate, deleteTemplate } = useTemplates();

  // Filter templates based on selections
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesPlatforms =
      selectedPlatforms.length === 0 ||
      selectedPlatforms.some((platform) => template.platforms.includes(platform));
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesPlatforms && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Templates</h1>
          <p className="text-muted-foreground mt-2">
            Save and reuse your best-performing content templates
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <TemplateFilters
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedPlatforms={selectedPlatforms}
        onPlatformsChange={setSelectedPlatforms}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <TemplateGrid
        templates={filteredTemplates}
        onDelete={deleteTemplate}
        onRefresh={refetch}
      />

      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={createTemplate}
      />
    </div>
  );
}

