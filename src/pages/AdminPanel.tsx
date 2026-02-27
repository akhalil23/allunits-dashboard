import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { UNIT_CONFIGS } from '@/lib/unit-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Key, Plus, Trash2, Loader2, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserInfo {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
  unit_id: string | null;
  role_id: string | null;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: userRole } = useUserRole();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset password dialog
  const [resetDialog, setResetDialog] = useState<{ open: boolean; user: UserInfo | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Create user dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newRole, setNewRole] = useState<string>('unit_user');
  const [newUnitId, setNewUnitId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Delete confirm
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserInfo | null }>({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  const unitIds = Object.keys(UNIT_CONFIGS);

  useEffect(() => {
    if (isAuthenticated && userRole?.role === 'admin') {
      fetchUsers();
    }
  }, [isAuthenticated, userRole]);

  if (!isAuthenticated || !userRole || userRole.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  async function callAdmin(body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('admin-reset-password', {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await callAdmin({ action: 'list_users' });
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error('Failed to load users: ' + err.message);
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!resetDialog.user || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setResetting(true);
    try {
      await callAdmin({ action: 'reset_password', user_id: resetDialog.user.id, password: newPassword });
      toast.success(`Password reset for ${resetDialog.user.email}`);
      setResetDialog({ open: false, user: null });
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setResetting(false);
  }

  async function handleCreateUser() {
    if (!newEmail || !newUserPassword || !newRole) return;
    if (newRole === 'unit_user' && !newUnitId) {
      toast.error('Please select a unit for unit_user role');
      return;
    }
    setCreating(true);
    try {
      await callAdmin({
        action: 'create_user',
        email: newEmail.trim(),
        password: newUserPassword,
        role: newRole,
        unit_id: newRole === 'unit_user' ? newUnitId : null,
      });
      toast.success(`User ${newEmail} created`);
      setCreateDialog(false);
      setNewEmail('');
      setNewUserPassword('');
      setNewRole('unit_user');
      setNewUnitId('');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  }

  async function handleDeleteUser() {
    if (!deleteDialog.user) return;
    setDeleting(true);
    try {
      await callAdmin({ action: 'delete_user', user_id: deleteDialog.user.id });
      toast.success(`User ${deleteDialog.user.email} deleted`);
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleting(false);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Shield className="w-6 h-6" />
        <h1 className="text-lg font-bold">Admin Panel — User Management</h1>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{users.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Unit Users</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{users.filter(u => u.role === 'unit_user').length}</span>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Users</CardTitle>
            <Button onClick={() => setCreateDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Create User
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {u.role ? (
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No role</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.unit_id ? (
                            <span className="text-sm">{UNIT_CONFIGS[u.unit_id]?.name || u.unit_id}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_sign_in_at
                            ? new Date(u.last_sign_in_at).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setResetDialog({ open: true, user: u }); setNewPassword(''); }}
                          >
                            <Key className="w-3 h-3 mr-1" /> Reset
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, user: u })}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog.open} onOpenChange={open => setResetDialog({ open, user: open ? resetDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set a new password for <strong>{resetDialog.user?.email}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog({ open: false, user: null })}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetting || !newPassword}>
              {resetting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Minimum 6 characters" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="unit_user">Unit User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === 'unit_user' && (
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={newUnitId} onValueChange={setNewUnitId}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {unitIds.map(id => (
                      <SelectItem key={id} value={id}>{id} — {UNIT_CONFIGS[id].name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating || !newEmail || !newUserPassword}>
              {creating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteDialog.user?.email}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
