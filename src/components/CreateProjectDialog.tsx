import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { api } from "@/lib/api/client";
import type { CreateProjectInput } from "@/lib/api/types";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100, "Project name must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters"),
  streetNumber: z.string().trim().min(1, "Street number is required").max(20, "Street number must be less than 20 characters"),
  streetName: z.string().trim().min(1, "Street name is required").max(100, "Street name must be less than 100 characters"),
  city: z.string().trim().min(1, "City is required").max(100, "City must be less than 100 characters"),
  state: z.string().trim().min(2, "State is required").max(2, "State must be 2 characters").toUpperCase(),
  zipCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid zip code format"),
  clientFirstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  clientLastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  clientEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  status: z.enum(['active', 'on_hold', 'archived']),
  phase: z.enum(['design', 'permit', 'build', 'completed']),
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
  const [status, setStatus] = useState<'active' | 'on_hold' | 'archived'>('on_hold');
  const [phase, setPhase] = useState<'design' | 'permit' | 'build' | 'completed'>('design');
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

    // Create or find client
    const clientName = `${clientFirstName.trim()} ${clientLastName.trim()}`;
    const existingClient = api.clients.list().find(c => c.email === clientEmail.trim());
    
    const clientId = existingClient?.id || api.clients.create({
      name: clientName,
      email: clientEmail.trim(),
    }).id;

    // Build full address
    const fullAddress = `${streetNumber.trim()} ${streetName.trim()}, ${city.trim()}, ${state.trim().toUpperCase()} ${zipCode.trim()}`;

    onCreateProject({
      workspaceId,
      name: name.trim(),
      description: description.trim(),
      address: fullAddress,
      clientId,
      status,
      phase,
    });

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
    setStatus('on_hold');
    setPhase('design');
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
            Add a new construction project with client and address details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Client Information</h3>
            
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
          </div>

          {/* Project Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Project Settings</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="status">Initial Status *</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger id="status" className={errors.status ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_hold">Pending</SelectItem>
                    <SelectItem value="active">In Progress</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase">Initial Phase *</Label>
                <Select value={phase} onValueChange={(value: any) => setPhase(value)}>
                  <SelectTrigger id="phase" className={errors.phase ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="build">Build</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {errors.phase && <p className="text-xs text-destructive">{errors.phase}</p>}
              </div>
            </div>
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
