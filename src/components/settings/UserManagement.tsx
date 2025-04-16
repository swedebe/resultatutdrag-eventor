
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRole } from "@/types/user";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Shield, ShieldAlert, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  name: string | null;
  club_name: string;
  role: string;
}

const UserManagement: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form fields for editing
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editClub, setEditClub] = useState("");
  const [editRole, setEditRole] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('email');

      if (error) throw error;
      
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Fel vid hämtning av användare",
        description: error.message || "Kunde inte hämta användarlistan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async (user: User, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;
      
      toast({
        title: "Roll uppdaterad",
        description: `${user.name || user.email} har nu rollen ${newRole === 'superuser' ? 'Superanvändare' : 'Användare'}`,
      });
      
      // Update the local state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      ));
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Fel vid uppdatering av roll",
        description: error.message || "Kunde inte uppdatera användarrollen",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
  };

  const closeDeleteDialog = () => {
    setUserToDelete(null);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      // Call the delete-user edge function
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });

      if (error) throw error;
      
      if (data && data.success) {
        toast({
          title: "Användare borttagen",
          description: `${userToDelete.name || userToDelete.email} har tagits bort`,
        });
        
        // Update the local state
        setUsers(users.filter(u => u.id !== userToDelete.id));
        closeDeleteDialog();
      } else {
        throw new Error(data?.error || "Ett okänt fel inträffade vid borttagning av användare");
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Fel vid borttagning av användare",
        description: error.message || "Kunde inte ta bort användaren",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setUserToEdit(user);
    setEditName(user.name || "");
    setEditEmail(user.email);
    setEditClub(user.club_name);
    setEditRole(user.role);
  };

  const closeEditDialog = () => {
    setUserToEdit(null);
  };

  const handleUpdateUser = async () => {
    if (!userToEdit) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          name: editName,
          email: editEmail,
          club_name: editClub,
          role: editRole 
        })
        .eq('id', userToEdit.id);

      if (error) throw error;
      
      toast({
        title: "Användare uppdaterad",
        description: `${editName || editEmail} har uppdaterats`,
      });
      
      // Update the local state
      setUsers(users.map(u => 
        u.id === userToEdit.id ? 
        { ...u, name: editName, email: editEmail, club_name: editClub, role: editRole } : 
        u
      ));
      
      closeEditDialog();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Fel vid uppdatering av användare",
        description: error.message || "Kunde inte uppdatera användaren",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Användarhantering</CardTitle>
        <CardDescription>
          Hantera användare och deras roller
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Inga användare hittades
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Klubb</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.club_name}</TableCell>
                    <TableCell>
                      {user.role === "superuser" ? (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                          <ShieldAlert className="h-3 w-3 mr-1" /> Superanvändare
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Shield className="h-3 w-3 mr-1" /> Användare
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleChangeRole(user, user.role === "superuser" ? "regular" : "superuser")}
                      >
                        {user.role === "superuser" ? "Gör till användare" : "Gör till superanvändare"}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Delete User Dialog */}
        <AlertDialog open={!!userToDelete} onOpenChange={() => !isDeleting && closeDeleteDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Radera användare</AlertDialogTitle>
              <AlertDialogDescription>
                Är du säker på att du vill ta bort användaren {userToDelete?.name || userToDelete?.email}?
                <br /><br />
                Detta kommer att radera användaren från både databasen och autentiseringssystemet.
                Åtgärden kan inte ångras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteUser();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tar bort...
                  </>
                ) : (
                  "Ja, ta bort användaren"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Edit User Dialog */}
        <Dialog open={!!userToEdit} onOpenChange={() => !isUpdating && closeEditDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redigera användare</DialogTitle>
              <DialogDescription>
                Uppdatera information för {userToEdit?.name || userToEdit?.email}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Namn</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-post</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-club">Klubb</Label>
                <Input
                  id="edit-club"
                  value={editClub}
                  onChange={(e) => setEditClub(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Roll</Label>
                <Select
                  value={editRole}
                  onValueChange={setEditRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj roll" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Användare</SelectItem>
                    <SelectItem value="superuser">Superanvändare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={closeEditDialog} disabled={isUpdating}>
                Avbryt
              </Button>
              <Button onClick={handleUpdateUser} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  "Spara ändringar"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
