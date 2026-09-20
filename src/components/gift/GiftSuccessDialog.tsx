import { CheckCircle, Gift as GiftIcon, PartyPopper, Mail, ArrowRight, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GiftCreationResult } from "@/types/gift.types";

interface GiftSuccessDialogProps {
  recipientName: string;
  recipientEmail: string;
  giftMessage: string;
  results: GiftCreationResult[];
  hasFailures: boolean;
  onRetryFailed: () => void;
  retrying: boolean;
  onViewOrderHistory: () => void;
  onBackToDashboard: () => void;
}

export function GiftSuccessDialog({
  recipientName,
  recipientEmail,
  giftMessage,
  results,
  hasFailures,
  onRetryFailed,
  retrying,
  onViewOrderHistory,
  onBackToDashboard,
}: GiftSuccessDialogProps) {
  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const allSucceeded = failedCount === 0 && successCount > 0;

  return (
    <div className="space-y-6">
      {/* Success / Partial Success Icon */}
      <div className="text-center">
        <div
          className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
            allSucceeded ? "bg-green-100" : "bg-yellow-100"
          }`}
        >
          {allSucceeded ? (
            <PartyPopper className="h-10 w-10 text-green-600" />
          ) : (
            <AlertTriangle className="h-10 w-10 text-yellow-600" />
          )}
        </div>

        <h2 className="text-2xl font-bold">
          {allSucceeded
            ? "Gift Sent Successfully! 🎉"
            : "Gift Partially Created"}
        </h2>

        <p className="mt-2 text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
          {allSucceeded
            ? "Your gift has been sent successfully. We have emailed the recipient with instructions to create an EDVANZ account and redeem their gifted course."
            : `${successCount} of ${results.length} gifts were created successfully. Some gifts need attention.`}
        </p>
      </div>

      {/* Recipient Info */}
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <GiftIcon className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Recipient:</span>
            <span className="font-semibold text-foreground">{recipientName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-semibold text-foreground">{recipientEmail}</span>
          </div>
          {giftMessage && (
            <div className="text-sm pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Message: </span>
              <span className="italic text-foreground font-medium">"{giftMessage}"</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visually Noticeable Informational Box */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-800 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
        <div className="rounded-full bg-blue-600 text-white p-1.5 shrink-0 mt-0.5">
          <Info className="h-4 w-4" />
        </div>
        <div className="space-y-1 text-sm text-blue-950 dark:text-blue-200">
          <p className="font-bold text-base text-blue-900 dark:text-blue-100">
            Important Recipient Instructions
          </p>
          <p className="leading-relaxed text-sm">
            The recipient must sign up or log in using the same email address that was used when sending the gift. The gifted course is linked to that email address, and using a different email will not allow them to redeem the gift.
          </p>
        </div>
      </div>

      {/* Per-gift status */}
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardContent className="p-5 space-y-2">
          <h3 className="font-bold text-sm mb-3">Gift Status</h3>
          {results.map((result) => (
            <div
              key={result.courseId}
              className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0"
            >
              <span className="text-sm font-medium line-clamp-1">{result.courseTitle}</span>
              {result.status === "success" ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold shrink-0 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Sent
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-destructive font-semibold shrink-0 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Failed
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Retry failed gifts */}
      {hasFailures && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800 mb-3 font-medium">
            {failedCount} gift{failedCount > 1 ? "s" : ""} could not be created. Your payment was successful — you can retry creating the remaining gifts or contact support with your order details.
          </p>
          <Button
            onClick={onRetryFailed}
            disabled={retrying}
            variant="outline"
            className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 rounded-xl"
          >
            {retrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed Gifts
              </>
            )}
          </Button>
        </div>
      )}

      {/* What happens next */}
      {allSucceeded && (
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-bold text-sm mb-3">What happens next?</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>The recipient receives an email with a secure redemption link.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>The recipient logs in using the exact recipient email specified.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>They visit the Redeem Gift and redeem the gifted course.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                  4
                </span>
                <span>The course becomes available in their My Courses to start learning immediately.</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
        <Button onClick={onViewOrderHistory} size="lg" variant="gradient" className="rounded-xl">
          View Order History
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button onClick={onBackToDashboard} variant="outline" size="lg" className="rounded-xl">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
