import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, ArrowLeft, RefreshCw, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const PaymentFailed = () => {
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("edvanz_payment_error");
    if (stored) {
      setError(JSON.parse(stored));
      sessionStorage.removeItem("edvanz_payment_error");
    }
  }, []);

  return (
      <div className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10"
          >
            <XCircle className="h-14 w-14 text-destructive" />
          </motion.div>

          <h1 className="text-3xl font-bold">Payment Failed</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {error?.message || "Something went wrong with your payment. No amount has been deducted."}
          </p>

          {error?.code && (
            <Card className="mt-6">
              <CardContent className="p-4 text-left text-sm">
                <span className="text-muted-foreground">Error code: </span>
                <span className="font-mono">{error.code}</span>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to="/cart">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/courses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse Courses
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            If the issue persists, please{" "}
            <Link to="/support" className="text-primary hover:underline">
              contact support
            </Link>
            .
          </p>
        </motion.div>
      </div>
  );
};

export default PaymentFailed;
