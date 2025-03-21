import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import JurisdictionSelect from './JurisdictionSelect';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CompanyForm: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [currentJurisdictions, setCurrentJurisdictions] = useState<string[]>([]);
  const [targetJurisdictions, setTargetJurisdictions] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    // Basic validation
    if (!companyName || !companySize || !industry) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (currentJurisdictions.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select at least one current jurisdiction.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Create company profile object
      const companyProfile = {
        companyName,
        companySize,
        industry,
        description,
        currentJurisdictions,
        targetJurisdictions,
        files: files.map(file => file.name),
      };
      
      // Store in localStorage for this demo
      localStorage.setItem('companyProfile', JSON.stringify(companyProfile));
      
      // Also save to Supabase if possible
      try {
        await supabase.from('company_profiles').insert([{
          company_name: companyName,
          company_size: companySize,
          industry,
          description,
          current_jurisdictions: currentJurisdictions,
          target_jurisdictions: targetJurisdictions
        }]);
      } catch (dbError) {
        console.error("Failed to save to database, but continuing with localStorage:", dbError);
      }
      
      toast({
        title: "Profile saved",
        description: "Your company profile has been saved successfully.",
      });
      
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save company profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const companySizes = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "501-1000", label: "501-1000 employees" },
    { value: "1001+", label: "1001+ employees" },
  ];

  const industries = [
    { value: "banking", label: "Banking" },
    { value: "insurance", label: "Insurance" },
    { value: "asset_management", label: "Asset Management" },
    { value: "payment_services", label: "Payment Services" },
    { value: "fintech", label: "Fintech" },
    { value: "cryptocurrency", label: "Cryptocurrency & Digital Assets" },
    { value: "capital_markets", label: "Capital Markets" },
    { value: "private_equity", label: "Private Equity & Venture Capital" },
    { value: "real_estate", label: "Real Estate Finance" },
    { value: "other", label: "Other Financial Services" },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <CardDescription>
          Provide details about your company to receive tailored compliance insights.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="required">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-size" className="required">Company Size</Label>
              <Select 
                value={companySize} 
                onValueChange={setCompanySize}
                required
              >
                <SelectTrigger id="company-size">
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  {companySizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="industry" className="required">Industry</Label>
            <Select 
              value={industry} 
              onValueChange={setIndustry}
              required
            >
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Company Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your company's activities and services"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="current-jurisdictions" className="required">
              Current Operating Jurisdictions
            </Label>
            <JurisdictionSelect
              selectedJurisdictions={currentJurisdictions}
              onChange={setCurrentJurisdictions}
              placeholder="Select jurisdictions where you currently operate"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="target-jurisdictions">
              Target Expansion Jurisdictions
            </Label>
            <JurisdictionSelect
              selectedJurisdictions={targetJurisdictions}
              onChange={setTargetJurisdictions}
              placeholder="Select jurisdictions where you plan to expand"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="documents">Company Documents</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                Drag and drop files, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload company documents, registrations, or policies
              </p>
            </div>
            
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Uploaded Files</Label>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded border"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-sm font-medium truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-4">
          <Button variant="outline" type="button" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CompanyForm;
