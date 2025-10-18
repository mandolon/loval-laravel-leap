import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
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

interface SystemUser {
  id: string;
  short_id: string;
  name: string;
  email: string;
  phone?: string;
  is_admin: boolean;
  is_active: boolean;
}

const TeamPage = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: '' });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  // Only admins can access this page
  if (!currentUser?.is_admin) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

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

      setUsers(users.map(user => ({
        id: user.id,
        short_id: user.short_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin || false,
        is_active: !user.deleted_at,
      })));
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error loading users",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !currentAdminStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, is_admin: !currentAdminStatus } 
          : u
      ));
      
      toast({
        title: `User ${!currentAdminStatus ? 'promoted to' : 'removed from'} admin`,
        description: "Admin status has been updated",
      });
    } catch (error) {
      console.error('Error toggling admin:', error);
      toast({
        title: "Error updating admin status",
        description: "Failed to change admin status",
        variant: "destructive",
      });
    }
  };

  const startEditing = (user: SystemUser) => {
    setEditingId(user.id);
    setEditValues({
      name: user.name,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ name: '' });
  };

  const saveEdit = async (userId: string) => {
    if (!editValues.name.trim()) {
      toast({
        title: "Validation error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editValues.name.trim(),
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, name: editValues.name.trim() }
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
    if (!deleteUserId || !currentUser) return;

    const userToDelete = users.find(u => u.id === deleteUserId);
    
    // Prevent last admin deletion
    if (userToDelete?.is_admin) {
      const adminCount = users.filter(u => u.is_admin && u.is_active).length;
      if (adminCount <= 1) {
        toast({
          title: "Cannot delete last admin",
          description: "At least one admin must remain active",
          variant: "destructive",
        });
        setDeleteUserId(null);
        return;
      }
    }

    try {
      // Soft delete user
      const { error } = await supabase
        .from('users')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id 
        })
        .eq('id', deleteUserId);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== deleteUserId));
      setDeleteUserId(null);
      
      toast({
        title: "User deactivated",
        description: "User has been soft-deleted and can be restored from admin tools",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error deleting user",
        description: "Failed to deactivate user",
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
      <PageHeader
        title="User Management"
        subtitle="Global admin panel - manage all system users"
        actions={<AddUserDialog onUserAdded={loadUsers} />}
      />

      {/* Users Table */}
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Admin Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  {/* Name Cell - Editable */}
                  <TableCell>
                    {editingId === user.id ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={editValues.name}
                          onChange={(e) => setEditValues({ name: e.target.value })}
                          placeholder="Full Name"
                          className="h-8"
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
                          {user.name}
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

                  {/* Email Cell */}
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>

                  {/* Admin Toggle */}
                  <TableCell>
                    <Button
                      variant={user.is_admin ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                      disabled={user.id === currentUser?.id}
                    >
                      {user.is_admin ? '✓ Admin' : 'Make Admin'}
                    </Button>
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
                      disabled={user.id === currentUser?.id}
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
