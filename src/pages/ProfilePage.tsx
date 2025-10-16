import { useState } from "react";
import { Camera, Mail, User as UserIcon, Shield, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, updateUser, signOut } = useUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const nameParts = user?.name.split(' ') || ['', ''];
  const [formData, setFormData] = useState({
    first_name: nameParts[0] || "",
    last_name: nameParts.slice(1).join(' ') || "",
    email: user?.email || "",
  });

  if (!user) {
    return (
      <div className="container max-w-4xl py-8">
        <p>Loading...</p>
      </div>
    );
  }

  const avatarGradients = [
    "linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)",
    "linear-gradient(135deg, hsl(200, 80%, 55%) 0%, hsl(250, 75%, 65%) 100%)",
    "linear-gradient(135deg, hsl(340, 85%, 60%) 0%, hsl(20, 90%, 65%) 100%)",
    "linear-gradient(135deg, hsl(160, 75%, 50%) 0%, hsl(200, 80%, 60%) 100%)",
    "linear-gradient(135deg, hsl(30, 90%, 60%) 0%, hsl(60, 85%, 65%) 100%)",
    "linear-gradient(135deg, hsl(260, 75%, 60%) 0%, hsl(180, 70%, 60%) 100%)",
    "linear-gradient(135deg, hsl(0, 80%, 60%) 0%, hsl(340, 85%, 65%) 100%)",
    "linear-gradient(135deg, hsl(120, 70%, 50%) 0%, hsl(160, 75%, 55%) 100%)",
    "linear-gradient(135deg, hsl(220, 85%, 60%) 0%, hsl(280, 80%, 65%) 100%)",
    "linear-gradient(135deg, hsl(300, 75%, 60%) 0%, hsl(360, 70%, 65%) 100%)",
    "linear-gradient(135deg, hsl(180, 70%, 55%) 0%, hsl(220, 75%, 60%) 100%)",
    "linear-gradient(135deg, hsl(40, 95%, 60%) 0%, hsl(340, 85%, 65%) 100%)",
  ];

  const handleAvatarChange = async (gradient: string) => {
    try {
      await updateUser({ avatar_url: gradient });
      toast({
        title: "Avatar color updated",
        description: "Your profile avatar color has been changed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      await updateUser({ 
        name: fullName,
        email: formData.email 
      });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const roleColors = {
    admin: "bg-destructive text-destructive-foreground",
    team: "bg-primary text-primary-foreground",
    consultant: "bg-secondary text-secondary-foreground",
    client: "bg-muted text-muted-foreground",
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and profile information
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Choose an avatar for your profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Avatar */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback 
                className="text-white text-2xl font-semibold"
                style={{ background: user.avatar_url || avatarGradients[0] }}
              >
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge className={`mt-2 ${roleColors[user.role]}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Choose Avatar Color</Label>
            <div className="grid grid-cols-6 gap-3">
              {avatarGradients.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() => handleAvatarChange(gradient)}
                  className={`relative h-16 w-16 rounded-full border-2 transition-all hover:scale-110 ${
                    user.avatar_url === gradient
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-border hover:border-primary"
                  }`}
                  style={{ background: gradient }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                    {user.initials}
                  </div>
                  {user.avatar_url === gradient && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">
              <UserIcon className="inline mr-2 h-4 w-4" />
              First Name
            </Label>
            <Input
              id="first-name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-name">
              <UserIcon className="inline mr-2 h-4 w-4" />
              Last Name
            </Label>
            <Input
              id="last-name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="inline mr-2 h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label>
              <Shield className="inline mr-2 h-4 w-4" />
              Role
            </Label>
            <div className="flex items-center gap-2">
              <Badge className={roleColors[user.role]}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Contact an admin to change your role
              </span>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveProfile}>Save Changes</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const nameParts = user.name.split(' ');
                  setFormData({ 
                    first_name: nameParts[0] || '', 
                    last_name: nameParts.slice(1).join(' ') || '',
                    email: user.email 
                  });
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
