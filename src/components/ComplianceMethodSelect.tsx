
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InfoIcon } from "lucide-react";

interface ComplianceMethodSelectProps {
  useAiJudge: boolean;
  setUseAiJudge: (value: boolean) => void;
}

const ComplianceMethodSelect: React.FC<ComplianceMethodSelectProps> = ({
  useAiJudge,
  setUseAiJudge
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Analysis Method</CardTitle>
        <CardDescription>
          Choose the method to analyze your compliance status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center">
                <Label htmlFor="use-ai-judge" className="font-medium">Use AI Judge</Label>
                <div className="ml-2 rounded-full bg-primary/10 p-1">
                  <InfoIcon className="h-3 w-3 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enables advanced evaluation using the Perplexity API to provide detailed compliance scores and industry-specific recommendations
              </p>
            </div>
            <Switch
              id="use-ai-judge"
              checked={useAiJudge}
              onCheckedChange={setUseAiJudge}
            />
          </div>
          
          <div className={`rounded-lg bg-muted/50 p-3 ${!useAiJudge && "opacity-70"}`}>
            <h4 className="text-sm font-medium">AI Judge Features:</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Industry-specific regulatory insights</li>
              <li>• More detailed compliance scoring</li>
              <li>• Enhanced risk assessment</li>
              <li>• Jurisdiction-specific regulations</li>
              <li>• Actionable compliance recommendations</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceMethodSelect;
