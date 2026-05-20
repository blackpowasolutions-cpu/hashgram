import React, { useState } from "react";
import { useLocation } from "wouter";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useLoginUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          if (data.user.role === "admin") {
            login(data.token, data.user);
            toast({ title: "Welcome back", description: "Successfully logged into mission control." });
            setLocation("/");
          } else {
            toast({ 
              title: "Access Denied", 
              description: "Not authorized as admin. Only platform team members have access.",
              variant: "destructive"
            });
          }
        },
        onError: (err: any) => {
          toast({ 
            title: "Login Failed", 
            description: err.error || "Invalid credentials",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dark text-foreground p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-3xl font-bold text-primary-foreground">R</span>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
            <p className="text-muted-foreground">Sign in to the platform operations hub</p>
          </div>
        </div>

        <Card className="border-border shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@platform.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
