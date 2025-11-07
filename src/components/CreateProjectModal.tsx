import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { MapPin, Plus } from "lucide-react";
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
  const [predictions, setPredictions] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Google Places API refs
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Google Places API
  useEffect(() => {
    if (!open) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      const googleMaps = (window as any).google;
      if (googleMaps?.maps?.places) {
        autocompleteServiceRef.current = new googleMaps.maps.places.AutocompleteService();
        placesServiceRef.current = new googleMaps.maps.places.PlacesService(
          document.createElement("div")
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        // Script already removed
      }
    };
  }, [open]);

  // Handle address input and get predictions
  const handleAddressInput = useCallback(
    (value: string) => {
      if (!value || !autocompleteServiceRef.current) {
        setPredictions([]);
        return;
      }

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value,
          types: ["address"],
          componentRestrictions: { country: "us" },
        },
        (results: any) => {
          setPredictions(results || []);
          setActiveIndex(-1);
        }
      );
    },
    []
  );

  // Fetch parcel number from coordinates
  const fetchParcelInfo = useCallback(async (lat: number, lng: number) => {
    try {
      // Use a backend proxy to avoid CORS issues
      const response = await fetch("/api/parcel/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.parcelNumber) {
          setParcel(data.parcelNumber);
        }
      }
    } catch (error) {
      console.error("Error fetching parcel info:", error);
      // Silently fail - parcel is optional
    }
  }, []);

  // Handle prediction selection
  const handleSelectPrediction = useCallback(
    (prediction: any) => {
      if (!placesServiceRef.current) return;

      placesServiceRef.current.getDetails(
        { placeId: prediction.place_id },
        (place: any) => {
          if (place?.address_components) {
            const findComponent = (type: string) =>
              place.address_components.find((c: any) => c.types.includes(type));

            const newAddress = {
              streetNumber: findComponent("street_number")?.long_name || "",
              streetName: findComponent("route")?.long_name || "",
              city: findComponent("locality")?.long_name || "",
              state: findComponent("administrative_area_level_1")?.short_name || "",
              zip: findComponent("postal_code")?.long_name || "",
            };

            setAddress(newAddress);

            if (inputRef.current) {
              inputRef.current.value = `${newAddress.streetNumber} ${newAddress.streetName}, ${newAddress.city}, ${newAddress.state} ${newAddress.zip}`;
            }

            // Fetch parcel number if we have coordinates
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat?.() || place.geometry.location.lat;
              const lng = place.geometry.location.lng?.() || place.geometry.location.lng;
              fetchParcelInfo(lat, lng);
            }
          }

          setPredictions([]);
          setActiveIndex(-1);
        }
      );
    },
    [fetchParcelInfo]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % predictions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + predictions.length) % predictions.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelectPrediction(predictions[activeIndex]);
    }
  };

  // Format secondary text for autocomplete display
  const formatSecondaryText = (text?: string): string => {
    if (!text) return "";
    const parts = text.split(",").map((p) => p.trim());
    return parts.filter((part) => !part.match(/USA|United States/i)).join(", ");
  };

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
    setPredictions([]);
    setActiveIndex(-1);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
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

          {/* Project Address with Google Places */}
          <section className="relative">
            <Label className="block text-sm font-medium text-[#202020] mb-1">Project Address *</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="Start typing address..."
                onChange={(e) => handleAddressInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${errors.streetNumber || errors.streetName || errors.city || errors.state || errors.zip ? "border-destructive" : ""}`}
              />

              {/* Autocomplete Predictions */}
              {predictions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-md">
                  {predictions.map((prediction, i) => (
                    <div
                      key={prediction.place_id}
                      onClick={() => handleSelectPrediction(prediction)}
                      className={`flex items-center px-3 py-2 cursor-pointer border-b last:border-none transition-colors ${
                        i === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-[#303030]">
                        {prediction.structured_formatting.main_text}{" "}
                        <span className="text-[#7a7a7a]">
                          {formatSecondaryText(prediction.structured_formatting.secondary_text)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parcel Number Field */}
            <div className="mt-2">
              <Label className="block text-sm text-[#202020] mb-1">Parcel Number</Label>
              <Input
                value={parcel}
                onChange={(e) => setParcel(e.target.value)}
                placeholder="Auto-fill or enter manually"
                className="bg-gray-50 text-[#303030]"
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

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              <p className="text-sm font-medium text-[#202020]">Make private</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end border-t pt-4">
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
        </form>
      </DialogContent>
    </Dialog>
  );
};
