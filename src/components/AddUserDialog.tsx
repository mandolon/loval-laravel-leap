import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email address").max(255),
  is_admin: z.boolean(),
});

interface AddUserDialogProps {
  onUserAdded: () => void;
}

export function AddUserDialog({ onUserAdded }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    is_admin: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    try {
      userSchema.parse(formData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setLoading(true);

    try {
      // Create user with Supabase Auth
      const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            name: formData.name,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('User creation failed');

      // Wait for trigger to create users record
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get users record
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authData.user.id)
        .single();

      if (userError) throw userError;

      // Set admin flag if checked
      if (formData.is_admin) {
        await supabase
          .from('users')
          .update({ is_admin: true })
          .eq('id', userRecord.id);
      }

      // Send welcome email
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: formData.email,
            first_name: formData.name,
            last_name: '',
            app_url: window.location.origin,
          },
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      toast({
        title: "User created",
        description: `${formData.name} has been added and will receive a welcome email.`,
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        is_admin: false,
      });
      
      setOpen(false);
      onUserAdded();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = 'Failed to create user';
      if (error.message?.includes('already registered')) {
        errorMessage = 'This email is already registered';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error creating user",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new team member account. They will receive an email to confirm their account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Admin Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_admin"
                checked={formData.is_admin}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                disabled={loading}
                className="h-4 w-4"
              />
              <Label htmlFor="is_admin" className="cursor-pointer">
                Global Admin (full system access)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
