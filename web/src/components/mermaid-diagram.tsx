'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

export function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const renderChart = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        
        // Initialize mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            htmlLabels: true,
            curve: 'basis'
          }
        });
        
        // Clear any previous diagrams in this container
        const element = document.getElementById('mermaid-diagram-container');
        if (element) {
          element.innerHTML = chart;
          await mermaid.run();
          setLoaded(true);
        }
      } catch (error) {
        console.error('Error rendering mermaid diagram:', error);
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-lg shadow-sm overflow-auto relative min-h-[400px]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading workflow diagram...</p>
            </div>
          </div>
        )}
        <div id="mermaid-diagram-container" className="mermaid">
          {chart}
        </div>
      </div>
      {caption && (
        <p className="text-sm text-muted-foreground text-center mt-2">{caption}</p>
      )}
    </div>
  );
} 