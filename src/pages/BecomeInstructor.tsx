import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Upload, X, FileText, Video, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MainLayout } from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { instructorService } from "@/services/instructor.service";

const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Singapore", "United Arab Emirates", "Other"];

const schema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  confirmPassword: z.string(),
  country: z.string().min(1, "Country is required"),
  city: z.string().trim().min(1, "City is required").max(80),
  phone: z.string().trim().min(7, "Phone is required").max(20),
  specialization: z.string().trim().min(2, "Specialization is required").max(120),
  qualification: z.string().trim().min(2, "Qualification is required").max(160),
  experience: z.string().trim().min(10, "Describe your experience").max(1000),
  bio: z.string().trim().min(10).max(500),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  portfolio: z.string().url("Invalid URL").optional().or(z.literal("")),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match", path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const BecomeInstructor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resume, setResume] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "India" },
  });
  const country = watch("country");

  const onResume = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") { toast({ title: "PDF only", variant: "destructive" }); return; }
    if (f.size > 10 * 1024 * 1024) { toast({ title: "Max 10MB", variant: "destructive" }); return; }
    setResume(f);
  };

  const onVideo = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast({ title: "Video files only", variant: "destructive" }); return; }
    if (f.size > 200 * 1024 * 1024) { toast({ title: "Max 200MB", variant: "destructive" }); return; }
    setIntroVideo(f);
  };

  const onSubmit = async (data: FormData) => {
    if (!resume) { toast({ title: "Resume required", description: "Upload your CV/Resume (PDF).", variant: "destructive" }); return; }
    if (!introVideo) { toast({ title: "Introduction video required", description: "Upload a short intro video.", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      // Backend: multipart upload → returns resumeUrl + introVideoUrl.
      // The intro video is stored as `isFreePreview=true` and becomes the free preview
      // for every course created by this instructor after approval.
      const resumeUrl = URL.createObjectURL(resume);
      const introVideoUrl = URL.createObjectURL(introVideo);
      await instructorService.submitApplication({
        userId: `pending-${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        country: data.country,
        city: data.city,
        location: `${data.city}, ${data.country}`,
        specialization: data.specialization,
        qualification: data.qualification,
        experience: data.experience,
        bio: data.bio,
        linkedin: data.linkedin || undefined,
        portfolio: data.portfolio || undefined,
        tags: data.specialization.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
        resumeUrl, resumeFileName: resume.name,
        introVideoUrl,
        documents: [resume.name, introVideo.name],
      });
      toast({
        title: "Application submitted 🎉",
        description: "Please wait for approval. You'll get an email once an admin approves your account.",
      });
      navigate("/login");
    } catch {
      toast({ title: "Submission failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">Become an Instructor</h1>
          <p className="text-muted-foreground">Sign up to teach on Edvanz. Your application will be reviewed by our team.</p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Account */}
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">Account</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input placeholder="John" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input placeholder="Doe" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="you@example.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number *</Label>
                <Input placeholder="+1 555 0000" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="At least 8 characters" {...register("password")} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password *</Label>
                <Input type={showPassword ? "text" : "password"} placeholder="Re-enter password" {...register("confirmPassword")} />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Select value={country} onValueChange={(v) => setValue("country", v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input placeholder="e.g. San Francisco" {...register("city")} />
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
              </div>
            </div>
          </div>

          {/* Professional */}
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">Professional Details</h2>
            <div className="space-y-1.5">
              <Label>Specialization *</Label>
              <Input placeholder="e.g. Web Development, React, Node.js" {...register("specialization")} />
              {errors.specialization && <p className="text-xs text-destructive">{errors.specialization.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Highest Qualification *</Label>
              <Input placeholder="e.g. M.Tech Computer Science" {...register("qualification")} />
              {errors.qualification && <p className="text-xs text-destructive">{errors.qualification.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Professional Experience *</Label>
              <Textarea rows={4} placeholder="Years of experience, notable achievements..." {...register("experience")} />
              {errors.experience && <p className="text-xs text-destructive">{errors.experience.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Short Bio *</Label>
                <span className="text-xs text-muted-foreground">{watch("bio")?.length || 0}/500</span>
              </div>
              <Textarea rows={3} maxLength={500} placeholder="Shown on your instructor profile" {...register("bio")} />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>LinkedIn</Label>
                <Input placeholder="https://linkedin.com/in/..." {...register("linkedin")} />
              </div>
              <div className="space-y-1.5">
                <Label>Portfolio</Label>
                <Input placeholder="https://yoursite.com" {...register("portfolio")} />
              </div>
            </div>
          </div>

          {/* Uploads */}
          <div className="bg-card rounded-2xl border p-6 space-y-5">
            <h2 className="font-display text-lg font-semibold">Documents</h2>

            {/* Resume */}
            <div>
              <Label className="mb-2 block">CV / Resume (PDF, max 10MB) *</Label>
              {!resume ? (
                <label className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Click to upload your CV / Resume</span>
                  <span className="text-xs text-muted-foreground">PDF · max 10MB</span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onResume(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{resume.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{(resume.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  <button type="button" onClick={() => setResume(null)} className="p-1 hover:bg-background rounded"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>

            {/* Intro Video */}
            <div>
              <Label className="mb-2 block">Introduction Video (MP4, max 200MB) *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                This video is <span className="font-semibold text-primary">always free for students</span> and appears as a preview on your courses.
              </p>
              {!introVideo ? (
                <label className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition">
                  <Video className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Click to upload your introduction video</span>
                  <span className="text-xs text-muted-foreground">MP4/WebM · max 200MB · 60-180s recommended</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => onVideo(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Video className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{introVideo.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(introVideo.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <button type="button" onClick={() => setIntroVideo(null)} className="p-1 hover:bg-background rounded"><X className="h-4 w-4" /></button>
                  </div>
                  <video controls src={URL.createObjectURL(introVideo)} className="w-full max-h-64 rounded-lg bg-black" />
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Wait for Approval"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              After submitting, your application will be reviewed by an admin. You will receive an email once approved and can then log in to access the instructor dashboard.
            </p>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default BecomeInstructor;
