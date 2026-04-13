import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { UNIT_CONFIGS, getUnitDisplayLabel } from '@/lib/unit-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Key, Plus, Trash2, Loader2, Users, Shield, MessageSquare, Check, X, Download, LogOut, Pencil, ExternalLink, LayoutDashboard, FileText } from 'lucide-react';
import ImportCenter from '@/components/admin/ImportCenter';
import { toast } from 'sonner';

interface UserInfo {
  id: string;
  username: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
  unit_id: string | null;
  role_id: string | null;
  is_active: boolean;
}

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
}

interface SeededAccount {
  username: string;
  password: string;
  role: string;
  unit_id: string | null;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { data: userRole } = useUserRole();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset password dialog
  const [resetDialog, setResetDialog] = useState<{ open: boolean; user: UserInfo | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Create user dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newRole, setNewRole] = useState<string>('unit_user');
  const [newUnitId, setNewUnitId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  // Delete confirm
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserInfo | null }>({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  // Edit user dialog
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserInfo | null }>({ open: false, user: null });
  const [editRole, setEditRole] = useState('');
  const [editUnitId, setEditUnitId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Contact requests
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Seed accounts
  const [seeding, setSeeding] = useState(false);
  const [seededAccounts, setSeededAccounts] = useState<SeededAccount[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);

  const unitIds = Object.keys(UNIT_CONFIGS);

  useEffect(() => {
    if (isAuthenticated && userRole?.role === 'admin') {
      fetchUsers();
      fetchContactRequests();
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

  async function fetchContactRequests() {
    setContactsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContactRequests((data as ContactRequest[]) || []);
    } catch (err: any) {
      toast.error('Failed to load contact requests: ' + err.message);
    }
    setContactsLoading(false);
  }

  async function handleUpdateContactStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from('contact_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      setContactRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success(`Request marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message);
    }
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
      toast.success(`Password reset for ${resetDialog.user.username || resetDialog.user.id}`);
      setResetDialog({ open: false, user: null });
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setResetting(false);
  }

  async function handleCreateUser() {
    if (!newUsername || !newRole) return;
    if (newRole === 'unit_user' && !newUnitId) {
      toast.error('Please select a unit for unit_user role');
      return;
    }
    setCreating(true);
    try {
      const result = await callAdmin({
        action: 'create_user',
        username: newUsername.trim().toLowerCase(),
        password: newUserPassword || undefined,
        role: newRole,
        unit_id: newRole === 'unit_user' ? newUnitId : null,
      });
      const generatedPw = result.generated_password;
      if (generatedPw) {
        setCreatedPassword(generatedPw);
        toast.success(`User "${newUsername}" created. Password shown below.`);
      } else {
        toast.success(`User "${newUsername}" created`);
      }
      setCreateDialog(false);
      setNewUsername('');
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
      toast.success(`User ${deleteDialog.user.username || deleteDialog.user.id} deleted`);
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleting(false);
  }

  function openEditDialog(u: UserInfo) {
    setEditRole(u.role || 'unit_user');
    setEditUnitId(u.unit_id || '');
    setEditIsActive(u.is_active);
    setEditDialog({ open: true, user: u });
  }

  async function handleSaveEdit() {
    if (!editDialog.user) return;
    if (editRole === 'unit_user' && !editUnitId) {
      toast.error('Please select a unit for unit_user role');
      return;
    }
    setSaving(true);
    try {
      await callAdmin({
        action: 'update_user',
        user_id: editDialog.user.id,
        role: editRole,
        unit_id: editRole === 'unit_user' ? editUnitId : null,
        is_active: editIsActive,
      });
      toast.success(`User "${editDialog.user.username}" updated`);
      setEditDialog({ open: false, user: null });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  }

  async function handleSeedAccounts() {
    setSeeding(true);
    try {
      const units = Object.entries(UNIT_CONFIGS).map(([id, cfg]) => ({
        username: id.toLowerCase(),
        unit_id: id,
      }));
      const result = await callAdmin({ action: 'seed_accounts', units });
      const seeded = result.seeded || [];
      setSeededAccounts(seeded);
      if (seeded.length > 0) {
        setShowCredentials(true);
        toast.success(`${seeded.length} accounts seeded successfully`);
      } else {
        toast.info('All accounts already exist');
      }
      fetchUsers();
    } catch (err: any) {
      toast.error('Seed error: ' + err.message);
    }
    setSeeding(false);
  }

  function exportCredentialsCSV() {
    if (!seededAccounts.length) return;
    const csv = ['Username,Password,Role,Unit']
      .concat(seededAccounts.map(a => `${a.username},${a.password},${a.role},${a.unit_id || 'ALL'}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sp-dashboard-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center gap-4">
        <Shield className="w-6 h-6" />
        <h1 className="text-lg font-bold flex-1">Admin Panel — User Management</h1>

        {/* Quick-nav dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80 gap-2 text-sm">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">View Dashboards</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel>Executive</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate('/university')} className="cursor-pointer">
              <LayoutDashboard className="w-4 h-4 mr-2 text-primary" />
              University Command Center
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Unit Dashboards</DropdownMenuLabel>
            {Object.entries(UNIT_CONFIGS).map(([id, cfg]) => (
              <DropdownMenuItem key={id} onClick={() => navigate(`/units/${id}`)} className="cursor-pointer">
                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{cfg.name}</span>
                <span className="truncate">{cfg.fullName}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={async () => { await logout(); navigate('/login'); }}
          className="text-primary-foreground hover:bg-primary/80"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
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
              <CardTitle className="text-sm text-muted-foreground">University Viewers</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{users.filter(u => u.role === 'university_viewer').length}</span>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{contactRequests.filter(r => r.status === 'pending').length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" /> Users</TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> Requests
              {contactRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                  {contactRequests.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-1.5"><Key className="w-4 h-4" /> Credentials</TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5"><FileText className="w-4 h-4" /> Import Center</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
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
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Sign In</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map(u => (
                          <TableRow key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">{u.username || '—'}</TableCell>
                            <TableCell>
                              {u.role ? (
                                <Badge variant={u.role === 'admin' ? 'default' : u.role === 'university_viewer' ? 'outline' : 'secondary'}>
                                  {u.role === 'university_viewer' ? 'university viewer' : u.role}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No role</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.unit_id ? (
                                <span className="text-sm">{getUnitDisplayLabel(u.unit_id)}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? 'default' : 'destructive'} className="text-[10px]">
                                {u.is_active ? 'Active' : 'Inactive'}
                              </Badge>
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
                                onClick={() => openEditDialog(u)}
                                title="Edit user"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setResetDialog({ open: true, user: u }); setNewPassword(''); }}
                              >
                                <Key className="w-3 h-3 mr-1" /> Reset
                              </Button>
                              {u.id !== user?.id && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteDialog({ open: true, user: u })}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Contact Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : contactRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No contact requests yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contactRequests.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell>{r.email}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{r.message}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === 'pending' ? 'destructive' : r.status === 'resolved' ? 'default' : 'secondary'}>
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {r.status === 'pending' && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleUpdateContactStatus(r.id, 'resolved')}>
                                    <Check className="w-3 h-3 mr-1" /> Resolve
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleUpdateContactStatus(r.id, 'dismissed')}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Initial Credentials</CardTitle>
                <div className="flex gap-2">
                  {seededAccounts.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportCredentialsCSV}>
                      <Download className="w-4 h-4 mr-1" /> Export CSV
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSeedAccounts} disabled={seeding}>
                    {seeding && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Seed All Accounts
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Seed All Accounts" to create the admin + 21 unit accounts with auto-generated passwords. 
                  Existing accounts will be skipped. <strong>Record the passwords securely — they cannot be retrieved later.</strong>
                </p>
                {seededAccounts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seededAccounts.map((a, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{a.username}</TableCell>
                            <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{a.password}</code></TableCell>
                            <TableCell><Badge variant={a.role === 'admin' ? 'default' : 'secondary'}>{a.role}</Badge></TableCell>
                            <TableCell>{a.unit_id || 'ALL'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No credentials generated yet. Click "Seed All Accounts" to provision.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <ImportCenter />
          </TabsContent>
        </Tabs>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog.open} onOpenChange={open => setResetDialog({ open, user: open ? resetDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set a new password for <strong>{resetDialog.user?.username || '—'}</strong>
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
              <Label>Username</Label>
              <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="e.g. gsr, admin" />
              <p className="text-xs text-muted-foreground">Auth email will be auto-generated as username@spdashboard.lau</p>
            </div>
            <div className="space-y-2">
              <Label>Password (optional — auto-generated if blank)</Label>
              <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="university_viewer">University Viewer</SelectItem>
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
                      <SelectItem key={id} value={id}>{getUnitDisplayLabel(id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating || !newUsername}>
              {creating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => setEditDialog({ open, user: open ? editDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User — {editDialog.user?.username || '—'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="university_viewer">University Viewer</SelectItem>
                  <SelectItem value="unit_user">Unit User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editRole === 'unit_user' && (
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={editUnitId} onValueChange={setEditUnitId}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {unitIds.map(id => (
                      <SelectItem key={id} value={id}>{getUnitDisplayLabel(id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Label>Account Active</Label>
                <p className="text-xs text-muted-foreground">Inactive users are signed out and cannot log in</p>
              </div>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Password Display */}
      <Dialog open={!!createdPassword} onOpenChange={() => setCreatedPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Record this password securely. It cannot be retrieved later.
          </p>
          <div className="bg-muted p-3 rounded-lg">
            <code className="text-sm font-mono break-all">{createdPassword}</code>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedPassword(null)}>Done</Button>
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
            Are you sure you want to delete <strong>{deleteDialog.user?.username || '—'}</strong>? This action cannot be undone.
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
