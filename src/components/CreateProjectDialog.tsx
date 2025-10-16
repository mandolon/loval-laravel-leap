import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { api } from "@/lib/api/client";
import type { CreateProjectInput } from "@/lib/api/types";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  description: z.string().trim().max(500),
  streetNumber: z.string().trim().min(1, "Street number is required").max(20),
  streetName: z.string().trim().min(1, "Street name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(2).toUpperCase(),
  zipCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid zip code"),
  clientFirstName: z.string().trim().min(1, "First name is required").max(50),
  clientLastName: z.string().trim().min(1, "Last name is required").max(50),
  clientEmail: z.string().trim().email("Invalid email").max(255),
  clientPhone: z.string().trim().optional(),
  status: z.enum(['pending', 'active', 'on_hold', 'completed', 'archived']),
  phase: z.enum(['Pre-Design', 'Design', 'Permit', 'Build']),
});

interface CreateProjectDialogProps {
  onCreateProject: (input: CreateProjectInput) => void;
  children?: React.ReactNode;
}

export const CreateProjectDialog = ({ onCreateProject, children }: CreateProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [hasSecondaryClient, setHasSecondaryClient] = useState(false);
  const [secondaryClientFirstName, setSecondaryClientFirstName] = useState("");
  const [secondaryClientLastName, setSecondaryClientLastName] = useState("");
  const [secondaryClientEmail, setSecondaryClientEmail] = useState("");
  const [secondaryClientPhone, setSecondaryClientPhone] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [status, setStatus] = useState<'pending' | 'active' | 'on_hold' | 'completed' | 'archived'>('pending');
  const [phase, setPhase] = useState<'Pre-Design' | 'Design' | 'Permit' | 'Build'>('Pre-Design');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workspaceId, setWorkspaceId] = useState("");

  useEffect(() => {
    if (open) {
      const currentWorkspace = api.workspaces.getCurrentWorkspaceId();
      if (currentWorkspace) {
        setWorkspaceId(currentWorkspace);
      }
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const formData = {
      name,
      description,
      streetNumber,
      streetName,
      city,
      state,
      zipCode,
      clientFirstName,
      clientLastName,
      clientEmail,
      clientPhone,
      status,
      phase,
    };

    const result = projectSchema.safeParse(formData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    if (!workspaceId) {
      setErrors({ form: "No workspace selected" });
      return;
    }

    const projectInput: CreateProjectInput = {
      workspaceId,
      name: name.trim(),
      description: description.trim(),
      address: {
        streetNumber: streetNumber.trim(),
        streetName: streetName.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zipCode: zipCode.trim(),
      },
      primaryClient: {
        firstName: clientFirstName.trim(),
        lastName: clientLastName.trim(),
        email: clientEmail.trim(),
        phone: clientPhone.trim() || undefined,
      },
      secondaryClient: hasSecondaryClient ? {
        firstName: secondaryClientFirstName.trim(),
        lastName: secondaryClientLastName.trim(),
        email: secondaryClientEmail.trim(),
        phone: secondaryClientPhone.trim() || undefined,
      } : undefined,
      estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : undefined,
      status,
      phase,
    };

    onCreateProject(projectInput);

    // Reset form
    setName("");
    setDescription("");
    setStreetNumber("");
    setStreetName("");
    setCity("");
    setState("");
    setZipCode("");
    setClientFirstName("");
    setClientLastName("");
    setClientEmail("");
    setClientPhone("");
    setHasSecondaryClient(false);
    setSecondaryClientFirstName("");
    setSecondaryClientLastName("");
    setSecondaryClientEmail("");
    setSecondaryClientPhone("");
    setEstimatedAmount("");
    setStatus('pending');
    setPhase('Pre-Design');
    setErrors({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new architecture project with client and address details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {errors.form && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.form}
            </div>
          )}

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Project Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Modern Family Home"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="estimatedAmount">Design Fee</Label>
                <Input
                  id="estimatedAmount"
                  type="number"
                  placeholder="45000"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Initial Status *</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase">Initial Phase *</Label>
                <Select value={phase} onValueChange={(value: any) => setPhase(value)}>
                  <SelectTrigger id="phase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Design">Pre-Design</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Permit">Permit</SelectItem>
                    <SelectItem value="Build">Build</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Address Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Project Address</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="streetNumber">Street Number *</Label>
                <Input
                  id="streetNumber"
                  placeholder="123"
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  className={errors.streetNumber ? "border-destructive" : ""}
                />
                {errors.streetNumber && <p className="text-xs text-destructive">{errors.streetNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetName">Street Name *</Label>
                <Input
                  id="streetName"
                  placeholder="Oak Street"
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  className={errors.streetName ? "border-destructive" : ""}
                />
                {errors.streetName && <p className="text-xs text-destructive">{errors.streetName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Portland"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={errors.city ? "border-destructive" : ""}
                />
                {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="OR"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  maxLength={2}
                  className={errors.state ? "border-destructive" : ""}
                />
                {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code *</Label>
              <Input
                id="zipCode"
                placeholder="97201"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className={errors.zipCode ? "border-destructive" : ""}
              />
              {errors.zipCode && <p className="text-xs text-destructive">{errors.zipCode}</p>}
            </div>
          </div>

          {/* Primary Client Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Primary Client</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="clientFirstName">First Name *</Label>
                <Input
                  id="clientFirstName"
                  placeholder="John"
                  value={clientFirstName}
                  onChange={(e) => setClientFirstName(e.target.value)}
                  className={errors.clientFirstName ? "border-destructive" : ""}
                />
                {errors.clientFirstName && <p className="text-xs text-destructive">{errors.clientFirstName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientLastName">Last Name *</Label>
                <Input
                  id="clientLastName"
                  placeholder="Smith"
                  value={clientLastName}
                  onChange={(e) => setClientLastName(e.target.value)}
                  className={errors.clientLastName ? "border-destructive" : ""}
                />
                {errors.clientLastName && <p className="text-xs text-destructive">{errors.clientLastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="john.smith@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className={errors.clientEmail ? "border-destructive" : ""}
                />
                {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="(503) 555-0123"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Optional Secondary Client */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasSecondaryClient"
                checked={hasSecondaryClient}
                onCheckedChange={(checked) => setHasSecondaryClient(checked as boolean)}
              />
              <Label htmlFor="hasSecondaryClient" className="font-semibold cursor-pointer">
                Add Secondary Client
              </Label>
            </div>

            {hasSecondaryClient && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="secondaryClientFirstName">First Name</Label>
                    <Input
                      id="secondaryClientFirstName"
                      placeholder="Jane"
                      value={secondaryClientFirstName}
                      onChange={(e) => setSecondaryClientFirstName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryClientLastName">Last Name</Label>
                    <Input
                      id="secondaryClientLastName"
                      placeholder="Smith"
                      value={secondaryClientLastName}
                      onChange={(e) => setSecondaryClientLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="secondaryClientEmail">Email</Label>
                    <Input
                      id="secondaryClientEmail"
                      type="email"
                      placeholder="jane.smith@example.com"
                      value={secondaryClientEmail}
                      onChange={(e) => setSecondaryClientEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryClientPhone">Phone</Label>
                    <Input
                      id="secondaryClientPhone"
                      type="tel"
                      placeholder="(503) 555-0124"
                      value={secondaryClientPhone}
                      onChange={(e) => setSecondaryClientPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
