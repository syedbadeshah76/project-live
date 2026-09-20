import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.service";

const schema = z.object({ email: z.string().email("Invalid email address") });
type FormData = z.infer<typeof schema>;

const ForgotPassword = () => {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authService.requestPasswordReset({ email: data.email });
      setSent(true);
      toast({ title: "Email sent!", description: "Check your inbox for a password reset link." });
    } catch {
      toast({ title: "Failed", description: "Could not send reset email. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Login
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <div className="gradient-primary p-2 rounded-xl">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">Edvanz</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-muted-foreground mb-6">We've sent a password reset link to your email address. Please check your inbox and follow the instructions.</p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">Return to Login</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Forgot Password?</h1>
            <p className="text-muted-foreground mb-8">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" className="pl-10" {...register("email")} />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
