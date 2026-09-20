import { motion } from "framer-motion";
import { ScrollText, FileCheck, AlertTriangle, Scale, RefreshCw, Mail } from "lucide-react";
import Blobs from "@/components/Blobs";
import { usePageMeta } from "@/lib/use-page-meta";
import { MainLayout } from "@/components/layout/MainLayout";

const sections = [
  {
    icon: FileCheck,
    title: "Welcome to Edvanz",
    text: "Edvanz is an online e-learning platform dedicated to helping learners build skills, gain knowledge, and achieve their career goals. By accessing our website, enrolling in courses, or using any of our services, you agree to these Terms and Conditions. Please read them carefully before using the Edvanz platform.",
  },
  {
    icon: ScrollText,
    title: "1. Account Eligibility",
    text: "You must be at least 18 years old or have permission from a parent or guardian to use our platform.",
  },
  {
    icon: ScrollText,
    title: "2. Course Access",
    text: "Course access is for personal learning only. Sharing accounts, course materials, or login details is strictly prohibited.",
  },
  {
    icon: Scale,
    title: "3. Payments & Refunds",
    text: "All course fees must be paid before enrollment. Refunds are subject to our Refund Policy. Please review the policy for complete details before making a purchase.",
  },
  {
    icon: AlertTriangle,
    title: "4. Platform Guidelines",
    text: "When using Edvanz, you agree not to share course content without permission, use false information or impersonate others, or post harmful, unlawful, or misleading content. Violation of these rules may result in account suspension or permanent removal.",
  },
  {
    icon: FileCheck,
    title: "5. Content Ownership",
    text: "All courses, videos, designs, text, software, graphics, and learning materials available on Edvanz are the intellectual property of Edvanz or its instructors. Unauthorized copying, distribution, or commercial use is strictly prohibited.",
  },
  {
    icon: FileCheck,
    title: "6. Certificates",
    text: "Certificates are awarded upon successful completion of eligible courses. Receiving a certificate does not guarantee employment, promotions, or specific career outcomes.",
  },
  {
    icon: AlertTriangle,
    title: "7. Liability",
    text: "Edvanz is not responsible for any indirect, incidental, or consequential losses or damages resulting from the use of our platform, courses, or services.",
  },
  {
    icon: RefreshCw,
    title: "8. Platform Updates",
    text: "We may update, modify, improve, or discontinue courses, features, services, or platform functionality at any time without prior notice to enhance the learning experience.",
  },
  {
    icon: Scale,
    title: "9. Applicable Law",
    text: "These Terms and Conditions are governed by all applicable laws and regulations. Any disputes arising from the use of the platform shall be resolved in accordance with the relevant legal jurisdiction.",
  },
  {
    icon: RefreshCw,
    title: "10. Changes to Terms",
    text: "We may revise these Terms and Conditions from time to time. Continued use of the Edvanz platform after updates have been published constitutes your acceptance of the revised Terms.",
  },
  {
    icon: Mail,
    title: "11. Contact Us",
    text: "Need help or have questions regarding these Terms and Conditions? Our support team is here to assist you. Please contact us anytime at hello@edvanz.com for assistance.",
  },
];

const termsSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://edvanz.co/terms/#webpage",
      "url": "https://edvanz.co/terms/",
      "name": "Edvanz Terms and Conditions",
      "isPartOf": {
        "@id": "https://edvanz.co/#website"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://edvanz.co/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Terms and Conditions",
          "item": "https://edvanz.co/terms/"
        }
      ]
    }
  ]
};

export function TermsPageComponent({
  onNavigate,
}: { onNavigate?: (page: string) => void } = {}) {
  usePageMeta({
    title: "Terms and Conditions | Edvanz.co",
    description:
      "Read the Edvanz Terms and Conditions governing the use of our website, online learning services, courses and related features.",
    keywords: "Edvanz Terms and Conditions",
    url: "https://edvanz.co/terms",
    path: "/terms",
    schema: termsSchema,
  });

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
        <Blobs />
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <ScrollText className="mx-auto h-12 w-12 text-primary" />
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground"
          >
            Terms & <span className="text-gradient">Conditions</span>
          </motion.h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Please read these terms carefully before using the Edvanz LMS website.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated:{" "}
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-12 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 grid gap-5">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glow-card rounded-2xl p-6 sm:p-7 flex gap-4 sm:gap-5 bg-card border border-border/50 shadow-sm hover:shadow-md transition-all"
            >
              <div className="shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">{s.title}</h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {s.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-soft p-8 sm:p-10 text-center border border-border/40">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Thank you for choosing Edvanz.
            </h3>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              By using our website, you acknowledge and agree to these terms.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function TermsAndConditions() {
  return (
    <MainLayout>
      <TermsPageComponent />
    </MainLayout>
  );
}
