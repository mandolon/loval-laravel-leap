import { useState } from "react";
import { Camera, Mail, User as UserIcon, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/api/types";

export default function ProfilePage() {
  const { toast } = useToast();
  
  // Mock current user data - replace with actual user data from your auth system
  const [user, setUser] = useState<User>({
    id: "1",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    role: "admin",
    initials: "AM",
    avatar: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  });

  const avatarOptions = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=User1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=User2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=User3",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=User4",
  ];

  const handleAvatarChange = (newAvatar: string) => {
    setUser({ ...user, avatar: newAvatar });
    toast({
      title: "Avatar updated",
      description: "Your profile picture has been changed successfully.",
    });
  };

  const handleSaveProfile = () => {
    setUser({ ...user, ...formData });
    setIsEditing(false);
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved.",
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
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and profile information
        </p>
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
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
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
            <Label className="text-sm font-medium mb-3 block">Choose Avatar</Label>
            <div className="grid grid-cols-6 gap-4">
              {avatarOptions.map((avatarUrl, index) => (
                <button
                  key={index}
                  onClick={() => handleAvatarChange(avatarUrl)}
                  className={`relative rounded-full border-2 transition-all hover:scale-110 ${
                    user.avatar === avatarUrl
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarUrl} alt={`Avatar ${index + 1}`} />
                  </Avatar>
                  {user.avatar === avatarUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-full">
                      <Camera className="h-6 w-6 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full">
            <Camera className="mr-2 h-4 w-4" />
            Upload Custom Image
          </Button>
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
            <Label htmlFor="name">
              <UserIcon className="inline mr-2 h-4 w-4" />
              Full Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  setFormData({ name: user.name, email: user.email });
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
