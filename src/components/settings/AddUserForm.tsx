import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  })
});

const AddUserForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      club: "",
      password: ""
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      console.log("Creating user with values:", { ...values, password: "***" });
      
      // Get the current session for auth header
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error("You must be logged in to create users");
      }

      // Call the edge function to create the user (role is always "regular")
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: values.email,
          password: values.password,
          name: values.name,
          club_name: values.club || "Din klubb",
          role: "regular" // Default to regular for all new users
        }
      });
      
      console.log("Edge function response:", data, error);

      if (error) {
        console.error("Error from edge function:", error);
        setErrorMessage(`Fel från servern: ${error.message || "Okänt fel"}`);
        toast({
          title: "Det gick inte att skapa användaren",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Check if the response is an object with a success property
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success === true) {
          toast({
            title: "Användare skapad",
            description: `Användaren ${values.name} har skapats med e-post ${values.email}.`,
          });
          form.reset();
          setErrorMessage(null);
        } else {
          const message = typeof data.message === 'string' ? data.message : "Ett okänt fel inträffade";
          console.error("Failed to create user:", message);
          if (data.details) {
            console.error("Error details:", data.details);
          }
          setErrorMessage(`Kunde inte skapa användaren: ${message}`);
          toast({
            title: "Det gick inte att skapa användaren",
            description: message,
            variant: "destructive",
          });
        }
      } else {
        // Handle unexpected response format
        console.error("Unexpected response format:", data);
        setErrorMessage("Kunde inte tolka serverns svar");
        toast({
          title: "Oväntat svar från servern",
          description: "Kunde inte tolka serverns svar",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error in form submission:", error);
      setErrorMessage(`Oväntat fel: ${error.message || "Okänt fel"}`);
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
        <CardDescription>Lägg till en ny användare i systemet (standard behörighet)</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Felmeddelande</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
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
