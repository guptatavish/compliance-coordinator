
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import ComplianceCard from '../ComplianceCard';

interface JurisdictionData {
  jurisdictionId: string;
  jurisdictionName: string;
  flag?: string;
  complianceScore: number;
  status: string;
  riskLevel: string;
  requirements: {
    total: number;
    met: number;
  };
  recentChanges?: number;
  requirementsList: any[];
  error?: string;
}

interface JurisdictionCardGridProps {
  jurisdictionsData: JurisdictionData[];
  selectedJurisdiction: string | null;
  setSelectedJurisdiction: (id: string) => void;
  onExportAnalysis: () => void;
}

const JurisdictionCardGrid: React.FC<JurisdictionCardGridProps> = ({
  jurisdictionsData,
  selectedJurisdiction,
  setSelectedJurisdiction,
  onExportAnalysis,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Jurisdictions</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onExportAnalysis}
          disabled={!selectedJurisdiction}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Analysis
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jurisdictionsData.map((jurisdiction, index) => (
          jurisdiction && jurisdiction.jurisdictionId ? (
            <div 
              key={jurisdiction.jurisdictionId || `jurisdiction-${index}`}
              className={`transition-all duration-300 transform ${
                selectedJurisdiction === jurisdiction.jurisdictionId ? 'scale-[1.02] ring-2 ring-primary' : ''
              }`}
            >
              <ComplianceCard
                {...jurisdiction}
                onClick={() => setSelectedJurisdiction(jurisdiction.jurisdictionId)}
              />
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default JurisdictionCardGrid;
