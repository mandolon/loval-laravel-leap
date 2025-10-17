import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { api } from "@/lib/api/client";
import type { CreateProjectInput } from "@/lib/api/types";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  streetNumber: z.string().trim().min(1, "Street number is required").max(20),
  streetName: z.string().trim().min(1, "Street name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(2).toUpperCase(),
  zipCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid zip code"),
  clientFirstName: z.string().trim().min(1, "First name is required").max(50),
  clientLastName: z.string().trim().min(1, "Last name is required").max(50),
  clientEmail: z.string().trim().email("Invalid email").max(255),
  clientPhone: z.string().trim().optional(),
});

interface CreateProjectDialogProps {
  onCreateProject: (input: CreateProjectInput) => void;
  children?: React.ReactNode;
}

export const CreateProjectDialog = ({ onCreateProject, children }: CreateProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
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
      streetNumber,
      streetName,
      city,
      state,
      zipCode,
      clientFirstName,
      clientLastName,
      clientEmail,
      clientPhone,
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
      status: 'active',
      phase: 'Pre-Design',
    };

    onCreateProject(projectInput);

    // Reset form
    setName("");
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
            Enter the essential project information to get started
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {errors.form && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.form}
            </div>
          )}

          {/* Row 1: Project Name */}
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

          {/* Row 2: Project Address */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Project Address</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="streetNumber">Street # *</Label>
                <Input
                  id="streetNumber"
                  placeholder="123"
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  className={errors.streetNumber ? "border-destructive" : ""}
                />
                {errors.streetNumber && <p className="text-xs text-destructive">{errors.streetNumber}</p>}
              </div>

              <div className="space-y-2 col-span-2">
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

            <div className="grid grid-cols-4 gap-3">
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

              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip *</Label>
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
          </div>

          {/* Row 3: Primary Client */}
          <div className="space-y-3">
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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasSecondaryClient"
                checked={hasSecondaryClient}
                onCheckedChange={(checked) => setHasSecondaryClient(checked as boolean)}
              />
              <Label htmlFor="hasSecondaryClient" className="text-sm font-medium cursor-pointer">
                Add Secondary Client
              </Label>
            </div>

            {hasSecondaryClient && (
              <div className="space-y-3 pl-6 border-l-2 border-border">
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
