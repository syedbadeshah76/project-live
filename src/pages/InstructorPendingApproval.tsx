import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InstructorPendingApproval() {
  const [params] = useSearchParams();
  const status = (params.get("status") as "pending" | "rejected") || "pending";
  const rejected = status === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {rejected ? (
            <XCircle className="h-9 w-9 text-red-500" />
          ) : (
            <Clock className="h-9 w-9 text-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {rejected ? "Application Rejected" : "Thank You for Applying"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {rejected
            ? "Your instructor application has been rejected by the admin team. If you believe this was a mistake, please contact support for a review."
            : "Your account is awaiting admin approval. Once approved, you will be able to access your dashboard and upload courses."}
        </p>

        {!rejected && (
          <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-left text-sm">
            <p className="mb-2 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-primary" /> What happens next
            </p>
            <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
              <li>Admin reviews your referral & profile details</li>
              <li>You'll receive an email once your account is approved</li>
              <li>After approval, sign in to build and publish courses</li>
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
          {rejected ? (
            <Button asChild>
              <Link to="/dashboard/help-center">Contact Support</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Try Login Again</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
