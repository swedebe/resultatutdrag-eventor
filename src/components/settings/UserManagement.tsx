
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert, ShieldCheck, Edit, Trash2, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  name: string | null;
  club_name: string;
  role: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    club_name: ""
  });
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Fel vid hämtning av användare",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (user: User) => {
    try {
      setProcessingUser(user.id);
      const newRole = user.role === 'superuser' ? 'regular' : 'superuser';
      
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      ));

      toast({
        title: "Roll uppdaterad",
        description: `${user.name || user.email} är nu ${newRole === 'superuser' ? 'superanvändare' : 'vanlig användare'}.`
      });
    } catch (error: any) {
      console.error("Error toggling role:", error);
      toast({
        title: "Kunde inte uppdatera roll",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      club_name: user.club_name
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setProcessingUser(selectedUser.id);
      
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          email: editForm.email,
          club_name: editForm.club_name
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Update user in the list
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, name: editForm.name, email: editForm.email, club_name: editForm.club_name } 
          : u
      ));

      toast({
        title: "Användare uppdaterad",
        description: `Användaren ${editForm.name || editForm.email} har uppdaterats.`
      });
      
      setEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Kunde inte uppdatera användaren",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setProcessingUser(selectedUser.id);
      
      // First delete from public.users (which has RLS)
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (usersError) throw usersError;

      // Call our custom delete_user function through Supabase
      const { error: authError } = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUser.id }
      });

      if (authError) {
        // If we couldn't delete from auth.users, we should inform the user but continue
        console.error("Could not delete from auth.users:", authError);
        toast({
          title: "Användaren togs bort från systemet",
          description: "Men kunde inte tas bort från autentiseringssystemet.",
          variant: "destructive",
        });
      }

      // Remove user from the list
      setUsers(users.filter(u => u.id !== selectedUser.id));
      
      toast({
        title: "Användaren raderad",
        description: `Användaren ${selectedUser.name || selectedUser.email} har raderats.`
      });
      
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Kunde inte radera användaren",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserCog className="mr-2 h-5 w-5" />
          Hantera användare
        </CardTitle>
        <CardDescription>Hantera användare i systemet</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center my-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Klubb</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead className="w-[180px]">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.club_name}</TableCell>
                    <TableCell>
                      {user.role === 'superuser' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          <ShieldAlert className="mr-1 h-3 w-3" /> Superanvändare
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                          Användare
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleRole(user)}
                          disabled={processingUser === user.id}
                        >
                          {processingUser === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : user.role === 'superuser' ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <ShieldAlert className="h-3 w-3" />
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Inga användare hittades
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redigera användare</DialogTitle>
              <DialogDescription>
                Uppdatera användarinformation för {selectedUser?.name || selectedUser?.email}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Namn
                  </Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    E-post
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="club" className="text-right">
                    Klubb
                  </Label>
                  <Input
                    id="club"
                    value={editForm.club_name}
                    onChange={(e) => setEditForm({ ...editForm, club_name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={processingUser === selectedUser?.id}>
                  {processingUser === selectedUser?.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sparar...
                    </>
                  ) : "Spara"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Är du säker?</AlertDialogTitle>
              <AlertDialogDescription>
                Denna åtgärd kan inte ångras. Detta kommer permanent ta bort användaren {selectedUser?.name || selectedUser?.email} från systemet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={processingUser === selectedUser?.id}
              >
                {processingUser === selectedUser?.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Raderar...
                  </>
                ) : "Radera"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
