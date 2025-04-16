
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, UserPlus } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Namn måste vara minst 2 tecken.",
  }),
  email: z.string().email({
    message: "Vänligen ange en giltig e-postadress.",
  }),
  club: z.string().optional(),
  password: z.string().min(6, {
    message: "Lösenord måste vara minst 6 tecken.",
  }),
});

const AddUserForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      club: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.rpc('create_user_from_admin', {
        user_email: values.email,
        user_password: values.password,
        user_name: values.name,
        user_club_name: values.club || "Din klubb"
      });

      if (error) {
        console.error("Error creating user:", error);
        toast({
          title: "Det gick inte att skapa användaren",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data && data.success) {
        toast({
          title: "Användare skapad",
          description: `Användaren ${values.name} har skapats med e-post ${values.email}`,
        });
        form.reset();
      } else {
        toast({
          title: "Det gick inte att skapa användaren",
          description: data?.message || "Ett okänt fel inträffade",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error in form submission:", error);
      toast({
        title: "Ett fel inträffade",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skapa ny användare</CardTitle>
        <CardDescription>Lägg till en ny användare i systemet</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namn</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-postadress</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="exempel@domain.se" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="club"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klubb (valfritt)</FormLabel>
                  <FormControl>
                    <Input placeholder="Klubbnamn" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tillfälligt lösenord</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Minst 6 tecken" {...field} />
                  </FormControl>
                  <FormDescription>
                    Användaren kan byta lösenord senare.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skapar användare...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Skapa användare
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AddUserForm;
