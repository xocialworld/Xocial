'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  dateRange: { from: Date; to: Date };
}

export function ExportButton({ dateRange }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const response = await fetch(
        `/api/analytics/export?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </>
      )}
    </Button>
  );
}

