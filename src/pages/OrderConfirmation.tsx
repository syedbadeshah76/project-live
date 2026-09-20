import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const OrderConfirmation = () => {
  const { orderId } = useParams();

  return (
    <MainLayout>
      <div className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-3xl font-bold">Payment Successful!</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Thank you for your purchase. You now have lifetime access to your courses.
          </p>

          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-medium">{orderId}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="text-muted-foreground">Status</span>
                  <span className="flex items-center gap-2 font-medium text-primary">
                    <CheckCircle className="h-4 w-4" />
                    Confirmed
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receipt</span>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to="/dashboard/courses">
                <BookOpen className="mr-2 h-4 w-4" />
                Start Learning
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/courses">
                Browse More Courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            A confirmation email has been sent to your registered email address.
            <br />
            Need help?{" "}
            <Link to="/support" className="text-primary hover:underline">
              Contact Support
            </Link>
          </p>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default OrderConfirmation;
