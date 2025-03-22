
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
import { Upload, X, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompanyFormProps {
  onCompanyProfileSaved?: () => void;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ onCompanyProfileSaved }) => {
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [currentJurisdictions, setCurrentJurisdictions] = useState<string[]>([]);
  const [targetJurisdictions, setTargetJurisdictions] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const savedProfile = localStorage.getItem('companyProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        setCompanyName(profile.companyName || '');
        setCompanySize(profile.companySize || '');
        setIndustry(profile.industry || '');
        setDescription(profile.description || '');
        setCurrentJurisdictions(profile.currentJurisdictions || []);
        setTargetJurisdictions(profile.targetJurisdictions || []);
        setRegistrationNumber(profile.registrationNumber || '');
        setAddress(profile.address || '');
        setWebsite(profile.website || '');
        setPhone(profile.phone || '');
        setEmail(profile.email || '');
        setFoundedYear(profile.foundedYear || '');
        setBusinessType(profile.businessType || '');
        
        // Load saved document names
        if (profile.savedDocuments && Array.isArray(profile.savedDocuments)) {
          setSavedDocuments(profile.savedDocuments);
        }
      } catch (error) {
        console.error('Error parsing saved profile:', error);
      }
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadError(null);
    
    if (e.dataTransfer.files) {
      // Check file size before adding
      const newFiles = Array.from(e.dataTransfer.files);
      const validFiles: File[] = [];
      
      newFiles.forEach(file => {
        // Check if file is too large (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`File "${file.name}" exceeds the 10MB size limit`);
        } else {
          validFiles.push(file);
        }
      });
      
      setFiles(prev => [...prev, ...validFiles]);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    
    if (e.target.files) {
      // Check file size before adding
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      
      newFiles.forEach(file => {
        // Check if file is too large (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`File "${file.name}" exceeds the 10MB size limit`);
        } else {
          validFiles.push(file);
        }
      });
      
      setFiles(prev => [...prev, ...validFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const removeSavedDocument = (documentName: string) => {
    setSavedDocuments(savedDocuments.filter(doc => doc !== documentName));
  };
  
  const clearAllFiles = () => {
    setFiles([]);
    setSavedDocuments([]);
  };
  
  const uploadFiles = async (filesToUpload: File[]): Promise<string[]> => {
    if (!filesToUpload.length) return [];
    
    try {
      const fileNames: string[] = [];
      const totalFiles = filesToUpload.length;
      let uploadedCount = 0;
      
      // Simple progress tracking
      const updateProgress = () => {
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      };
      
      // Prepare file data for storage in localStorage
      for (const file of filesToUpload) {
        try {
          // Read file as base64 for storage 
          const base64Data = await readFileAsDataURL(file);
          
          // Store file in localStorage with metadata
          const fileKey = `document_${Date.now()}_${file.name}`;
          localStorage.setItem(fileKey, JSON.stringify({
            name: file.name,
            size: file.size,
            type: file.type,
            data: base64Data,
            uploadDate: new Date().toISOString()
          }));
          
          fileNames.push(file.name);
          updateProgress();
          
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          // Continue with other files even if one fails
        }
      }
      
      // When also using Supabase, upload files to storage
      try {
        if (supabase) {
          for (const file of filesToUpload) {
            const fileName = `companies/${companyName.replace(/\s+/g, '_').toLowerCase()}/${Date.now()}_${file.name}`;
            const { error } = await supabase.storage
              .from('company_documents')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
              });
                
            if (error) {
              console.error("Supabase upload error:", error);
            }
          }
        }
      } catch (supabaseError) {
        console.error("Supabase upload failed, but continuing with local storage:", supabaseError);
      }
      
      return fileNames;
      
    } catch (error) {
      console.error("Error uploading files:", error);
      throw new Error("Failed to upload documents. Please try again.");
    }
  };
  
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
    setUploadProgress(0);
    
    try {
      // Upload any new files
      let uploadedFileNames: string[] = [];
      if (files.length > 0) {
        uploadedFileNames = await uploadFiles(files);
      }
      
      // Create company profile object with complete information
      const companyProfile = {
        companyName,
        companySize,
        industry,
        description,
        currentJurisdictions,
        targetJurisdictions,
        registrationNumber,
        address,
        website,
        phone,
        email,
        foundedYear,
        businessType,
        files: uploadedFileNames,
        savedDocuments: savedDocuments, // Store saved documents separately
      };
      
      console.log('Saving company profile:', companyProfile);
      
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
          target_jurisdictions: targetJurisdictions,
          document_urls: [...savedDocuments, ...uploadedFileNames], // Combine both saved and new documents
          registration_number: registrationNumber,
          address,
          website,
          phone,
          email,
          founded_year: foundedYear,
          business_type: businessType
        }]);
      } catch (dbError) {
        console.error("Failed to save to database, but continuing with localStorage:", dbError);
      }
      
      toast({
        title: "Profile saved",
        description: "Your company profile has been saved successfully.",
      });
      
      // Call the callback if provided
      if (onCompanyProfileSaved) {
        onCompanyProfileSaved();
      }
      
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
  
  const businessTypes = [
    { value: "corporation", label: "Corporation" },
    { value: "llc", label: "Limited Liability Company (LLC)" },
    { value: "partnership", label: "Partnership" },
    { value: "sole_proprietorship", label: "Sole Proprietorship" },
    { value: "non_profit", label: "Non-Profit Organization" },
    { value: "public", label: "Public Company" },
    { value: "private", label: "Private Company" },
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="registration-number">Registration Number</Label>
              <Input
                id="registration-number"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="Company registration or tax ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="founded-year">Founded Year</Label>
              <Input
                id="founded-year"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                placeholder="Year company was founded"
                type="number"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Company Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full company address"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                type="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 123 456 7890"
              />
            </div>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="documents">Company Documents</Label>
              {(files.length > 0 || savedDocuments.length > 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFiles}
                  className="flex items-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>
            
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
                Upload company documents, registrations, or policies (Max 10MB per file)
              </p>
            </div>
            
            {uploadError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {uploadError}
                </AlertDescription>
              </Alert>
            )}
            
            {isLoading && uploadProgress > 0 && (
              <div className="space-y-2 mt-2">
                <div className="flex justify-between text-xs">
                  <span>Uploading documents...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
            
            {/* Previously saved documents section */}
            {savedDocuments.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Previously Saved Documents</Label>
                <div className="space-y-2">
                  {savedDocuments.map((docName, index) => (
                    <div
                      key={`saved-${index}`}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded border"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-sm font-medium truncate">
                          {docName}
                        </span>
                        <span className="text-xs text-green-600">
                          (Saved)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSavedDocument(docName)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* New uploaded files section */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>New Uploaded Files</Label>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={`new-${index}`}
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
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : 'Save Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CompanyForm;
