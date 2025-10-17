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

          {/* Row 2: Project Address - All fields in one row */}
          <div className="space-y-2">
            <Label>Project Address *</Label>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <Input
                  placeholder="Street #"
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  className={errors.streetNumber ? "border-destructive" : ""}
                />
              </div>
              <div className="col-span-4">
                <Input
                  placeholder="Street Name"
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  className={errors.streetName ? "border-destructive" : ""}
                />
              </div>
              <div className="col-span-3">
                <Input
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={errors.city ? "border-destructive" : ""}
                />
              </div>
              <div className="col-span-1">
                <Input
                  placeholder="ST"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  maxLength={2}
                  className={errors.state ? "border-destructive" : ""}
                />
              </div>
              <div className="col-span-2">
                <Input
                  placeholder="Zip"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className={errors.zipCode ? "border-destructive" : ""}
                />
              </div>
            </div>
            {(errors.streetNumber || errors.streetName || errors.city || errors.state || errors.zipCode) && (
              <p className="text-xs text-destructive">
                {errors.streetNumber || errors.streetName || errors.city || errors.state || errors.zipCode}
              </p>
            )}
          </div>

          {/* Row 3: Primary Client - All fields in one row */}
          <div className="space-y-2">
            <Label>Primary Client *</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Input
                  placeholder="First Name"
                  value={clientFirstName}
                  onChange={(e) => setClientFirstName(e.target.value)}
                  className={errors.clientFirstName ? "border-destructive" : ""}
                />
              </div>
              <div>
                <Input
                  placeholder="Last Name"
                  value={clientLastName}
                  onChange={(e) => setClientLastName(e.target.value)}
                  className={errors.clientLastName ? "border-destructive" : ""}
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className={errors.clientEmail ? "border-destructive" : ""}
                />
              </div>
              <div>
                <Input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>
            {(errors.clientFirstName || errors.clientLastName || errors.clientEmail) && (
              <p className="text-xs text-destructive">
                {errors.clientFirstName || errors.clientLastName || errors.clientEmail}
              </p>
            )}
          </div>

          {/* Optional Secondary Client */}
          <div className="space-y-2">
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
              <div className="pl-6">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Input
                      placeholder="First Name"
                      value={secondaryClientFirstName}
                      onChange={(e) => setSecondaryClientFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Last Name"
                      value={secondaryClientLastName}
                      onChange={(e) => setSecondaryClientLastName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={secondaryClientEmail}
                      onChange={(e) => setSecondaryClientEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="tel"
                      placeholder="Phone (optional)"
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
