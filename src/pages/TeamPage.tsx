import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Users } from "lucide-react";

const TeamPage = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setUsers(api.users.list());
  }, []);

  const roleColors = {
    admin: 'destructive',
    team: 'default',
    consultant: 'secondary',
    client: 'outline',
  } as const;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Team Members</h1>
        <p className="text-muted-foreground text-lg">
          Manage your team and their roles
        </p>
      </div>

      {/* Team Grid */}
      {users.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No team members</h3>
          <p className="text-muted-foreground">
            Team members will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(user => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <UserAvatar user={user} size="lg" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{user.name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={roleColors[user.role]} className="capitalize">
                    {user.role}
                  </Badge>
                  {user.isActive && (
                    <Badge variant="outline" className="text-success border-success">
                      Active
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamPage;
