
import React from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Example jurisdictions data
export const jurisdictions = [
  { id: 'us', name: 'United States', flag: '🇺🇸', region: 'North America' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { id: 'eu', name: 'European Union', flag: '🇪🇺', region: 'Europe' },
  { id: 'ca', name: 'Canada', flag: '🇨🇦', region: 'North America' },
  { id: 'au', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  { id: 'sg', name: 'Singapore', flag: '🇸🇬', region: 'Asia' },
  { id: 'jp', name: 'Japan', flag: '🇯🇵', region: 'Asia' },
  { id: 'hk', name: 'Hong Kong', flag: '🇭🇰', region: 'Asia' },
  { id: 'ch', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
  { id: 'de', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { id: 'fr', name: 'France', flag: '🇫🇷', region: 'Europe' },
  { id: 'br', name: 'Brazil', flag: '🇧🇷', region: 'South America' },
  { id: 'mx', name: 'Mexico', flag: '🇲🇽', region: 'North America' },
  { id: 'in', name: 'India', flag: '🇮🇳', region: 'Asia' },
  { id: 'cn', name: 'China', flag: '🇨🇳', region: 'Asia' },
  { id: 'za', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { id: 'ae', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East' },
  { id: 'sa', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Middle East' },
];

interface JurisdictionSelectProps {
  selectedJurisdictions: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
}

const JurisdictionSelect: React.FC<JurisdictionSelectProps> = ({
  selectedJurisdictions,
  onChange,
  placeholder = "Select jurisdictions...",
  label,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (jurisdictionId: string) => {
    if (selectedJurisdictions.includes(jurisdictionId)) {
      onChange(selectedJurisdictions.filter(id => id !== jurisdictionId));
    } else {
      onChange([...selectedJurisdictions, jurisdictionId]);
    }
  };

  const handleRemove = (jurisdictionId: string) => {
    onChange(selectedJurisdictions.filter(id => id !== jurisdictionId));
  };

  // Group jurisdictions by region
  const jurisdictionsByRegion = jurisdictions.reduce((acc, jurisdiction) => {
    if (!acc[jurisdiction.region]) {
      acc[jurisdiction.region] = [];
    }
    acc[jurisdiction.region].push(jurisdiction);
    return acc;
  }, {} as Record<string, typeof jurisdictions>);

  const regions = Object.keys(jurisdictionsByRegion).sort();

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium">{label}</div>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 py-2"
          >
            <div className="flex flex-wrap gap-1 items-center">
              {selectedJurisdictions.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedJurisdictions.map(id => {
                  const jurisdiction = jurisdictions.find(j => j.id === id);
                  return jurisdiction ? (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="mr-1 mb-1 flex items-center gap-1 pl-2 pr-1"
                    >
                      <span>{jurisdiction.flag}</span>
                      <span>{jurisdiction.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ) : null;
                })
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search jurisdictions..." />
            <CommandList>
              <CommandEmpty>No jurisdiction found.</CommandEmpty>
              {regions.map(region => (
                <CommandGroup key={region} heading={region}>
                  {jurisdictionsByRegion[region].map(jurisdiction => (
                    <CommandItem
                      key={jurisdiction.id}
                      value={`${jurisdiction.name} ${jurisdiction.region}`}
                      onSelect={() => handleSelect(jurisdiction.id)}
                      className="flex items-center"
                    >
                      <span className="mr-2">{jurisdiction.flag}</span>
                      <span>{jurisdiction.name}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedJurisdictions.includes(jurisdiction.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedJurisdictions.length > 0 && (
        <div className="text-sm text-muted-foreground mt-2">
          {selectedJurisdictions.length} jurisdiction{selectedJurisdictions.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default JurisdictionSelect;
