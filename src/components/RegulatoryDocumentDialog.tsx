
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Download, ExternalLink, FileText, Info } from 'lucide-react';
import { RegulatoryReference, getRegulationDetails } from '../services/ComplianceService';
import { toast } from '@/components/ui/use-toast';

interface RegulatoryDocumentDialogProps {
  document: RegulatoryReference;
  jurisdictionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RegulatoryDocumentDialog: React.FC<RegulatoryDocumentDialogProps> = ({
  document,
  jurisdictionId,
  open,
  onOpenChange,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getRegulationDetails(document.id, jurisdictionId)
        .then((data) => {
          setContent(data);
        })
        .catch((error) => {
          console.error('Error fetching document details:', error);
          toast({
            title: "Error",
            description: "Failed to fetch detailed document information.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, document.id, jurisdictionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Book className="h-5 w-5 text-primary" />
            <span className="text-xs px-2 py-1 rounded-full bg-muted">
              {document.documentType}
            </span>
            {document.publishDate && (
              <span className="text-xs text-muted-foreground">
                Published: {new Date(document.publishDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{document.title}</DialogTitle>
          <DialogDescription>
            {document.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="text-sm text-muted-foreground">
            Issued by: <span className="font-medium">{document.issuer}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(document.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Official Website
            </Button>
            <Button variant="default" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-24" />
            <Skeleton className="w-full h-48" />
            <Skeleton className="w-3/4 h-24" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-6 border rounded-lg bg-muted/10">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line">{content}</div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-primary/5 flex items-start">
              <div className="p-2 rounded-full mr-3 bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Document Disclaimer</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  This is an informational summary of the regulatory document. For the most accurate and up-to-date information, 
                  please refer to the official document on the issuing authority's website. Regulatory requirements may change, 
                  and this information should not be considered legal advice.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegulatoryDocumentDialog;
