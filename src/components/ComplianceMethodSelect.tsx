
import React from 'react';
import { InfoIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ComplianceMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ComplianceMethodSelect: React.FC<ComplianceMethodSelectProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select compliance method" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="standard">Standard Analysis</SelectItem>
          <SelectItem value="ai-judge">AI Judge</SelectItem>
        </SelectContent>
      </Select>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Standard Analysis: Uses predefined rules to evaluate compliance</p>
            <p className="mt-1">AI Judge: Uses AI to make more nuanced compliance judgments</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ComplianceMethodSelect;
