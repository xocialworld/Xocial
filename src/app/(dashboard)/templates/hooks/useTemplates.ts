'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface Template {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  content: any; // Platform-specific content
  category: string;
  platforms: string[];
  created_by: string;
  is_public: boolean;
  usage_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  content: any;
  category: string;
  platforms: string[];
  tags?: string[];
  is_public?: boolean;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/templates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch templates');
      }

      setTemplates(data.data || []);
    } catch (err) {
      console.error('Template fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }

  async function createTemplate(input: CreateTemplateInput) {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create template');
      }

      toast.success('Template created successfully');
      await fetchTemplates();
      return data.data;
    } catch (err) {
      console.error('Create template error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create template');
      throw err;
    }
  }

  async function deleteTemplate(id: string) {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete template');
      }

      toast.success('Template deleted successfully');
      await fetchTemplates();
    } catch (err) {
      console.error('Delete template error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
      throw err;
    }
  }

  async function useTemplate(id: string) {
    try {
      // Increment usage count
      await fetch(`/api/templates/${id}/use`, {
        method: 'POST',
      });

      await fetchTemplates();
    } catch (err) {
      console.error('Use template error:', err);
    }
  }

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    deleteTemplate,
    useTemplate,
  };
}

