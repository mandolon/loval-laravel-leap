import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { CreateProjectInput } from "@/lib/api/types";
import { z } from "zod";

const projectSchema = z.object({
  clientFirstName: z.string().trim().min(1, "First name is required").max(50),
  clientLastName: z.string().trim().max(50).optional(),
  clientEmail: z.string().trim().email("Invalid email").max(255).optional().or(z.literal('')),
  clientPhone: z.string().trim().optional(),
  streetNumber: z.string().trim().min(1, "Street number is required").max(20),
  streetName: z.string().trim().min(1, "Street name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(2).toUpperCase(),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid zip code"),
});

interface CreateProjectModalProps {
  onCreateProject: (input: CreateProjectInput) => void;
  workspaceId: string;
  children?: React.ReactNode;
}

const categories = [
  { key: "addition", label: "Addition" },
  { key: "remodel", label: "Remodel" },
  { key: "adu", label: "ADU" },
  { key: "new_construction", label: "New Construction" },
];

export const CreateProjectModal = ({ onCreateProject, workspaceId, children }: CreateProjectModalProps) => {
  const [open, setOpen] = useState(false);
  const [hasSecondary, setHasSecondary] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Primary client
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Secondary client
  const [secondaryFirstName, setSecondaryFirstName] = useState("");
  const [secondaryLastName, setSecondaryLastName] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");

  // Address
  const [address, setAddress] = useState({
    streetNumber: "",
    streetName: "",
    city: "",
    state: "",
    zip: "",
  });
  const [parcel, setParcel] = useState("");

  // Handle category toggle
  const handleCategoryToggle = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      clientFirstName,
      clientLastName,
      clientEmail,
      clientPhone,
      streetNumber: address.streetNumber,
      streetName: address.streetName,
      city: address.city,
      state: address.state,
      zip: address.zip,
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

    // Generate project name
    let clientName = clientLastName || clientFirstName;
    if (hasSecondary && (secondaryLastName || secondaryFirstName)) {
      const secondaryName = secondaryLastName || secondaryFirstName;
      if (clientName && secondaryName && clientName !== secondaryName) {
        clientName = `${clientName}-${secondaryName}`;
      }
    }

    const projectAddress = `${address.streetNumber} ${address.streetName}`;
    const projectName = `${clientName} - ${projectAddress}`;

    const projectInput: CreateProjectInput = {
      workspaceId,
      name: projectName,
      address: {
        streetNumber: address.streetNumber,
        streetName: address.streetName,
        city: address.city,
        state: address.state,
        zipCode: address.zip,
      },
      primaryClient: {
        firstName: clientFirstName,
        lastName: clientLastName || "",
        email: clientEmail || undefined,
        phone: clientPhone || undefined,
      },
      secondaryClient: hasSecondary
        ? {
            firstName: secondaryFirstName,
            lastName: secondaryLastName || "",
            email: secondaryEmail || undefined,
            phone: secondaryPhone || undefined,
          }
        : undefined,
      status: "active",
      phase: "Pre-Design",
    };

    onCreateProject(projectInput);

    // Reset form
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setClientFirstName("");
    setClientLastName("");
    setClientEmail("");
    setClientPhone("");
    setSecondaryFirstName("");
    setSecondaryLastName("");
    setSecondaryEmail("");
    setSecondaryPhone("");
    setAddress({ streetNumber: "", streetName: "", city: "", state: "", zip: "" });
    setParcel("");
    setSelectedCategories([]);
    setHasSecondary(false);
    setIsPrivate(false);
    setErrors({});
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white p-0 rounded-xl shadow-md">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="text-base font-semibold text-[#202020]">Create Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-6">
          {/* Client Information */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-[#202020]">Client Information</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasSecondary"
                  checked={hasSecondary}
                  onCheckedChange={(checked) => setHasSecondary(!!checked)}
                />
                <label htmlFor="hasSecondary" className="text-sm text-[#646464] cursor-pointer">
                  Add Secondary Client
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <Input
                placeholder="First Name *"
                value={clientFirstName}
                onChange={(e) => setClientFirstName(e.target.value)}
                className={errors.clientFirstName ? "border-destructive" : ""}
              />
              <Input
                placeholder="Last Name"
                value={clientLastName}
                onChange={(e) => setClientLastName(e.target.value)}
              />
              {!hasSecondary && (
                <>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className={errors.clientEmail ? "border-destructive" : ""}
                  />
                  <Input
                    type="tel"
                    placeholder="Phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </>
              )}
            </div>

            {hasSecondary && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                <Input
                  placeholder="Secondary First Name"
                  value={secondaryFirstName}
                  onChange={(e) => setSecondaryFirstName(e.target.value)}
                />
                <Input
                  placeholder="Last Name"
                  value={secondaryLastName}
                  onChange={(e) => setSecondaryLastName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={secondaryEmail}
                  onChange={(e) => setSecondaryEmail(e.target.value)}
                />
                <Input
                  type="tel"
                  placeholder="Phone"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                />
              </div>
            )}

            {errors.clientFirstName && (
              <p className="text-xs text-destructive mt-2">{errors.clientFirstName}</p>
            )}
          </section>

          {/* Project Address - Separate Fields */}
          <section>
            <Label className="block text-sm font-medium text-[#202020] mb-2">Project Address *</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Street Number *"
                value={address.streetNumber}
                onChange={(e) => setAddress({ ...address, streetNumber: e.target.value })}
                className={errors.streetNumber ? "border-destructive" : ""}
              />
              <Input
                placeholder="Street Name *"
                value={address.streetName}
                onChange={(e) => setAddress({ ...address, streetName: e.target.value })}
                className={errors.streetName ? "border-destructive" : ""}
              />
              <Input
                placeholder="City *"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className={errors.city ? "border-destructive" : ""}
              />
              <Input
                placeholder="State (CA) *"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                maxLength={2}
                className={errors.state ? "border-destructive" : ""}
              />
              <Input
                placeholder="Zip Code *"
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                className={errors.zip ? "border-destructive" : ""}
              />
              <Input
                placeholder="Parcel Number"
                value={parcel}
                onChange={(e) => setParcel(e.target.value)}
              />
            </div>

            {(errors.streetNumber || errors.streetName || errors.city || errors.state || errors.zip) && (
              <p className="text-xs text-destructive mt-2">
                {errors.streetNumber || errors.streetName || errors.city || errors.state || errors.zip}
              </p>
            )}
          </section>

          {/* Project Type */}
          <section>
            <Label className="block text-sm font-medium text-[#202020] mb-2">Project Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <Card
                  key={cat.key}
                  onClick={() => handleCategoryToggle(cat.key)}
                  className={`cursor-pointer border p-3 text-center transition-all rounded-lg ${
                    selectedCategories.includes(cat.key)
                      ? "border-[#202020] bg-[#f4f4f4] text-[#202020] shadow-sm"
                      : "border-gray-200 bg-white text-[#646464] hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium text-sm">{cat.label}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Action Buttons with Privacy Toggle */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              <p className="text-sm font-medium text-[#202020]">Make private</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-sm px-3 py-1.5"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="text-sm px-3 py-1.5 bg-[#4C75D1] hover:bg-[#3A61B0]">
                Create Project
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
