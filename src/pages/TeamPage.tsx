import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users, Check, X, Pencil, RotateCcw, LogOut } from "lucide-react";
import { formatDistanceToNow, format } from 'date-fns';
import { useUser } from "@/contexts/UserContext";
import { AddUserDialog } from "@/components/AddUserDialog";
import { AddUserToWorkspaceDialog } from "@/components/AddUserToWorkspaceDialog";
import { useUsers, useUpdateUserRole, useDeletedUsers, useForceSignOut, usePermanentDeleteUser } from "@/lib/api/hooks";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";

const TeamPage = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: '', title: '' });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [forceSignOutUserId, setForceSignOutUserId] = useState<string | null>(null);
  const [forceSignOutUserName, setForceSignOutUserName] = useState<string>('');
  const [permanentDeleteUserId, setPermanentDeleteUserId] = useState<string | null>(null);
  const [permanentDeleteUserName, setPermanentDeleteUserName] = useState<string>('');
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();

  const { data: usersWithWorkspaces, isLoading } = useUsers();
  const { data: deletedUsers, isLoading: isLoadingDeleted } = useDeletedUsers();
  const updateUserRole = useUpdateUserRole();
  const forceSignOutMutation = useForceSignOut();
  const permanentDeleteMutation = usePermanentDeleteUser();


  if (!currentUser?.is_admin) {
    return (
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !currentAdminStatus })
        .eq('id', userId);

      if (error) throw error;

      await queryClient.refetchQueries({ queryKey: ['users'] });
      
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

  const handleRoleChange = async (userId: string, newRole: 'team' | 'consultant' | 'client') => {
    try {
      await updateUserRole.mutateAsync({ userId, role: newRole });
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const startEditing = (user: { id: string; name: string; title?: string }) => {
    setEditingId(user.id);
    setEditValues({
      name: user.name,
      title: user.title || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ name: '', title: '' });
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
          title: editValues.title.trim() || null,
        })
        .eq('id', userId);

      if (error) throw error;

      await queryClient.refetchQueries({ queryKey: ['users'] });
      setEditingId(null);
      
      toast({
        title: "User updated",
        description: "User information has been changed successfully",
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error updating user",
        description: "Failed to change user information",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId || !currentUser) return;

    const userToDelete = usersWithWorkspaces?.find(u => u.id === deleteUserId);
    
    if (userToDelete?.isAdmin) {
      const adminCount = usersWithWorkspaces?.filter(u => u.isAdmin).length || 0;
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
      const { error } = await supabase
        .from('users')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id 
        })
        .eq('id', deleteUserId);

      if (error) throw error;

      await queryClient.refetchQueries({ queryKey: ['users'] });
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

  const handleRestore = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          deleted_at: null,
          deleted_by: null 
        })
        .eq('id', userId);

      if (error) throw error;

      await queryClient.refetchQueries({ queryKey: ['users'] });
      await queryClient.refetchQueries({ queryKey: ['deleted-users'] });
      
      toast({
        title: "User restored",
        description: "User has been successfully restored",
      });
    } catch (error) {
      console.error('Error restoring user:', error);
      toast({
        title: "Error restoring user",
        description: "Failed to restore user",
        variant: "destructive",
      });
    }
  };

  const handleForceSignOut = async () => {
    if (!forceSignOutUserId) return;

    try {
      await forceSignOutMutation.mutateAsync(forceSignOutUserId);
      toast({
        title: "User signed out",
        description: `${forceSignOutUserName} has been signed out successfully.`,
      });
      setForceSignOutUserId(null);
      setForceSignOutUserName('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out user.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteUserId) return;

    try {
      await permanentDeleteMutation.mutateAsync(permanentDeleteUserId);
      toast({
        title: "User permanently deleted",
        description: `${permanentDeleteUserName} has been permanently removed from the system.`,
      });
      setPermanentDeleteUserId(null);
      setPermanentDeleteUserName('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to permanently delete user.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || isLoadingDeleted) {
    return (
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <PageHeader title="User Management" />
        <div className="text-center py-16">
          <div className="text-muted-foreground">Loading team members...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
      {/* Header */}
      <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center justify-between bg-white dark:bg-[#0E1118]">
        <span className="text-slate-700 dark:text-neutral-200 font-medium">User Management</span>
        <AddUserDialog />
      </div>

      {/* Content with Tabs */}
      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active Users ({usersWithWorkspaces?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="deleted">
              Deleted Users ({deletedUsers?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Active Users Tab */}
          <TabsContent value="active" className="mt-4">
            {!usersWithWorkspaces || usersWithWorkspaces.length === 0 ? (
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
                      <TableHead>Role</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Last Page</TableHead>
                      <TableHead>Workspaces</TableHead>
                      <TableHead>Admin Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersWithWorkspaces.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {editingId === user.id ? (
                            <Input
                              value={editValues.name}
                              onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                              placeholder="Full Name"
                              className="h-8"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.name}</span>
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
                        <TableCell>
                          <Select
                            value={user.role || 'client'}
                            onValueChange={(newRole: 'team' | 'consultant' | 'client') => 
                              handleRoleChange(user.id, newRole)
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="team">Team</SelectItem>
                              <SelectItem value="consultant">Consultant</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {editingId === user.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={editValues.title}
                                onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                placeholder="Title"
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
                            <span className="text-muted-foreground">
                              {user.title || '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.lastSignInAt ? (
                            <span title={format(new Date(user.lastSignInAt), 'PPpp')}>
                              {formatDistanceToNow(new Date(user.lastSignInAt), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.lastActiveAt ? (
                            <span title={format(new Date(user.lastActiveAt), 'PPpp')}>
                              {formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.lastPageVisited ? (
                            <Badge variant="outline" className="capitalize">
                              {user.lastPageVisited}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.workspaces && user.workspaces.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.workspaces.map((ws) => (
                                <Badge key={ws.workspaceId} variant="secondary" className="text-xs">
                                  {ws.workspaceName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={user.isAdmin ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.isAdmin ? '✓ Admin' : 'Make Admin'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className={`text-sm ${user.isOnline ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {user.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <AddUserToWorkspaceDialog 
                              userId={user.id} 
                              userName={user.name}
                              userWorkspaceIds={user.workspaces.map(w => w.workspaceId)}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                setForceSignOutUserId(user.id);
                                setForceSignOutUserName(user.name);
                              }}
                              disabled={user.id === currentUser?.id || !user.isOnline}
                              title={
                                user.id === currentUser?.id 
                                  ? "Cannot sign out yourself" 
                                  : !user.isOnline 
                                  ? "User is already offline" 
                                  : "Force sign out user"
                              }
                            >
                              <LogOut className="h-4 w-4 text-orange-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setDeleteUserId(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Deleted Users Tab */}
          <TabsContent value="deleted" className="mt-4">
            {!deletedUsers || deletedUsers.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Users className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">No deleted users</h3>
                <p className="text-muted-foreground">
                  Deleted users will appear here and can be restored
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Workspaces</TableHead>
                      <TableHead>Was Admin</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedUsers.map((user) => (
                      <TableRow key={user.id} className="opacity-60">
                        <TableCell>
                          <span className="font-medium">{user.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user.role || 'client'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.title || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          {user.workspaces && user.workspaces.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.workspaces.map((ws) => (
                                <Badge key={ws.workspaceId} variant="outline" className="text-xs">
                                  {ws.workspaceName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.isAdmin && (
                            <Badge variant="secondary">Admin</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(user.deletedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestore(user.id)}
                              className="gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setPermanentDeleteUserId(user.id);
                                setPermanentDeleteUserName(user.name);
                              }}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Permanent Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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

      {/* Force Sign Out Confirmation Dialog */}
      <AlertDialog open={forceSignOutUserId !== null} onOpenChange={(open) => {
        if (!open) {
          setForceSignOutUserId(null);
          setForceSignOutUserName('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Sign Out User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out <strong>{forceSignOutUserName}</strong>? 
              This will immediately invalidate all their active sessions and they will need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceSignOut}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Sign Out User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={permanentDeleteUserId !== null} onOpenChange={(open) => {
        if (!open) {
          setPermanentDeleteUserId(null);
          setPermanentDeleteUserName('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to <strong className="text-destructive">permanently delete</strong>{' '}
                <strong>{permanentDeleteUserName}</strong>?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded p-3 space-y-2">
                <p className="font-semibold text-destructive text-sm">This action CANNOT be undone and will:</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Permanently delete their user account</li>
                  <li>Remove all workspace and project memberships</li>
                  <li>Delete all their time entries and activity logs</li>
                  <li>Remove all their chat messages and notifications</li>
                  <li>Delete their authentication credentials</li>
                </ul>
              </div>
              <p className="text-sm font-medium">
                Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm:
              </p>
              <Input
                id="confirm-delete"
                placeholder="Type DELETE to confirm"
                onChange={(e) => {
                  const input = e.target as HTMLInputElement;
                  const confirmBtn = document.getElementById('confirm-permanent-delete-btn') as HTMLButtonElement;
                  if (confirmBtn) {
                    confirmBtn.disabled = input.value !== 'DELETE';
                  }
                }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              id="confirm-permanent-delete-btn"
              onClick={handlePermanentDelete}
              disabled={true}
              className="bg-destructive hover:bg-destructive/90"
            >
              Permanently Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};

export default TeamPage;
