import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users, Check, X, Pencil, Filter } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { AddUserDialog } from "@/components/AddUserDialog";

// Protected admin email that cannot be modified or deleted
const PROTECTED_ADMIN_EMAIL = "armando@rehome.build";

interface TeamMember {
  id: string;
  short_id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'team' | 'consultant' | 'client';
  is_active: boolean;
}

const TeamPage = () => {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ first_name: '', last_name: '' });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'team' | 'consultant' | 'client'>('all');
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (usersError) throw usersError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            id: user.id,
            short_id: user.short_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: roleData?.role || 'team',
            is_active: !user.deleted_at,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error loading users",
        description: "Failed to fetch team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const roleValue = newRole as 'admin' | 'team' | 'consultant' | 'client';
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: roleValue })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, role: roleValue } 
          : u
      ));
      
      toast({
        title: "Role updated",
        description: "User role has been changed successfully",
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error updating role",
        description: "Failed to change user role",
        variant: "destructive",
      });
    }
  };

  const startEditing = (user: TeamMember) => {
    setEditingId(user.id);
    setEditValues({
      first_name: user.first_name,
      last_name: user.last_name,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ first_name: '', last_name: '' });
  };

  const saveEdit = async (userId: string) => {
    if (!editValues.first_name.trim() || !editValues.last_name.trim()) {
      toast({
        title: "Validation error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: `${editValues.first_name.trim()} ${editValues.last_name.trim()}`,
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, first_name: editValues.first_name.trim(), last_name: editValues.last_name.trim() }
          : u
      ));

      setEditingId(null);
      
      toast({
        title: "Name updated",
        description: "User name has been changed successfully",
      });
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: "Error updating name",
        description: "Failed to change user name",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;

    try {
      // Delete from auth.users (cascade will handle profiles and user_roles)
      const { error } = await supabase.auth.admin.deleteUser(deleteUserId);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== deleteUserId));
      setDeleteUserId(null);
      
      toast({
        title: "User deleted",
        description: "User has been removed successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error deleting user",
        description: "Failed to remove user. You may not have permission.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <div className="text-muted-foreground">Loading team members...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Team Members</h1>
          <p className="text-muted-foreground text-lg">
            Manage your team and their roles
          </p>
        </div>
        <AddUserDialog onUserAdded={loadUsers} />
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={roleFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRoleFilter('all')}
        >
          All ({users.length})
        </Button>
        <Button
          variant={roleFilter === 'admin' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRoleFilter('admin')}
        >
          Admin ({users.filter(u => u.role === 'admin').length})
        </Button>
        <Button
          variant={roleFilter === 'team' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRoleFilter('team')}
        >
          Team ({users.filter(u => u.role === 'team').length})
        </Button>
        <Button
          variant={roleFilter === 'consultant' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRoleFilter('consultant')}
        >
          Consultant ({users.filter(u => u.role === 'consultant').length})
        </Button>
        <Button
          variant={roleFilter === 'client' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRoleFilter('client')}
        >
          Client ({users.filter(u => u.role === 'client').length})
        </Button>
      </div>

      {/* Users Table */}
      {users.filter(u => roleFilter === 'all' || u.role === roleFilter).length === 0 ? (
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(u => roleFilter === 'all' || u.role === roleFilter).map((user) => (
                <TableRow key={user.id}>
                  {/* Name Cell - Editable */}
                  <TableCell>
                    {editingId === user.id ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={editValues.first_name}
                          onChange={(e) => setEditValues({ ...editValues, first_name: e.target.value })}
                          placeholder="First Name"
                          className="h-8 w-24"
                        />
                        <Input
                          value={editValues.last_name}
                          onChange={(e) => setEditValues({ ...editValues, last_name: e.target.value })}
                          placeholder="Last Name"
                          className="h-8 w-24"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => saveEdit(user.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.first_name} {user.last_name}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEditing(user)}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </TableCell>

                  {/* Title Cell */}
                  <TableCell className="text-muted-foreground">
                    {user.title || '-'}
                  </TableCell>

                  {/* Email Cell */}
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>

                  {/* Role Selector */}
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={user.id === currentUser?.id || user.email === PROTECTED_ADMIN_EMAIL}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell>
                    <span className={`text-sm ${user.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>

                  {/* Actions Cell */}
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setDeleteUserId(user.id)}
                      disabled={user.id === currentUser?.id || user.email === PROTECTED_ADMIN_EMAIL}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All their data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamPage;
