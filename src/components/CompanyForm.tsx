
import React, { useState, useEffect } from 'react';
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
import { Upload, X, Building, Phone, Mail, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import RoleBasedAccess from '@/utils/RoleBasedAccess';

const CompanyForm: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [currentJurisdictions, setCurrentJurisdictions] = useState<string[]>([]);
  const [targetJurisdictions, setTargetJurisdictions] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  // Additional critical information
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyPhoneNumber, setCompanyPhoneNumber] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [businessType, setBusinessType] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchCompanyProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('company_profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching company profile:', error);
          return;
        }
        
        if (data) {
          setProfileId(data.id);
          setCompanyName(data.company_name || '');
          setCompanySize(data.company_size || '');
          setIndustry(data.industry || '');
          setDescription(data.description || '');
          setCurrentJurisdictions(data.current_jurisdictions || []);
          setTargetJurisdictions(data.target_jurisdictions || []);
          
          // Set additional data if available
          if (data.registration_number) setCompanyRegistrationNumber(data.registration_number);
          if (data.address) setCompanyAddress(data.address);
          if (data.website) setCompanyWebsite(data.website);
          if (data.phone) setCompanyPhoneNumber(data.phone);
          if (data.email) setCompanyEmail(data.email);
          if (data.founded_year) setFoundedYear(data.founded_year);
          if (data.business_type) setBusinessType(data.business_type);
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
      }
    };
    
    fetchCompanyProfile();
  }, [user]);

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
  
  const uploadFilesToStorage = async (): Promise<string[]> => {
    const fileUrls: string[] = [];
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `company_documents/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);
        
        if (error) {
          console.error('Error uploading file:', error);
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        fileUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
    
    return fileUrls;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    // Validate required fields
    if (!companyName || !companySize || !industry || !companyRegistrationNumber || !companyAddress || !companyEmail) {
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
      const fileUrls = files.length > 0 ? await uploadFilesToStorage() : [];
      
      const companyProfileData = {
        company_name: companyName,
        company_size: companySize,
        industry,
        description,
        current_jurisdictions: currentJurisdictions,
        target_jurisdictions: targetJurisdictions,
        document_urls: fileUrls,
        // Additional fields
        registration_number: companyRegistrationNumber,
        address: companyAddress,
        website: companyWebsite,
        phone: companyPhoneNumber,
        email: companyEmail,
        founded_year: foundedYear,
        business_type: businessType
      };
      
      console.log('Saving company profile:', companyProfileData);
      
      let result;
      if (profileId) {
        result = await supabase
          .from('company_profiles')
          .update(companyProfileData)
          .eq('id', profileId);
      } else {
        result = await supabase
          .from('company_profiles')
          .insert([companyProfileData]);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Update user profile with company association if this is a new company
      if (!profileId && result.data && user) {
        // Get the new company ID
        const { data: newCompany } = await supabase
          .from('company_profiles')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (newCompany) {
          await supabase
            .from('user_profiles')
            .upsert({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || '',
              role: user.user_metadata?.role || 'user',
              company_id: newCompany.id
            });
        }
      }
      
      toast({
        title: "Profile saved",
        description: "Your company profile has been saved successfully.",
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving company profile:', error);
      toast({
        title: "Error",
        description: "Failed to save company profile: " + (error.message || "Please try again."),
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

  const businessTypes = [
    { value: "corporation", label: "Corporation" },
    { value: "llc", label: "Limited Liability Company (LLC)" },
    { value: "partnership", label: "Partnership" },
    { value: "sole_proprietorship", label: "Sole Proprietorship" },
    { value: "non_profit", label: "Non-profit" },
    { value: "other", label: "Other" },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i);

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="registration-number" className="required">Registration Number</Label>
              <Input
                id="registration-number"
                value={companyRegistrationNumber}
                onChange={(e) => setCompanyRegistrationNumber(e.target.value)}
                placeholder="Company registration number"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="founded-year">Founded Year</Label>
              <Select 
                value={foundedYear} 
                onValueChange={setFoundedYear}
              >
                <SelectTrigger id="founded-year">
                  <SelectValue placeholder="Select year founded" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="business-type">Business Type</Label>
            <Select 
              value={businessType} 
              onValueChange={setBusinessType}
            >
              <SelectTrigger id="business-type">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="required">Business Address</Label>
            <Textarea
              id="address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Enter your company's registered address"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="required">Business Email</Label>
              <Input
                id="email"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="contact@yourcompany.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone</Label>
              <Input
                id="phone"
                value={companyPhoneNumber}
                onChange={(e) => setCompanyPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Company Website</Label>
            <Input
              id="website"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="https://www.yourcompany.com"
            />
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
