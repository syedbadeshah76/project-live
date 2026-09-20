import { MainLayout } from "@/components/layout/MainLayout";
import { BackToTop } from "@/components/layout/BackToTop";
import { HeroSection } from "@/components/home/HeroSection";
import { DomainsSection } from "@/components/home/DomainsSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { InstructorCTASection } from "@/components/home/InstructorCTASection";
import { StatsSection } from "@/components/home/StatsSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { usePageMeta } from "@/lib/use-page-meta";

const homeSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://edvanz.co/#website",
      "url": "https://edvanz.co/",
      "name": "Edvanz",
      "publisher": {
        "@id": "https://edvanz.co/#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://edvanz.co/#organization",
      "name": "Edvanz",
      "url": "https://edvanz.co/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://edvanz.co/assets/edvanz%20logo-B63BYItQ.png"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://edvanz.co/#webpage",
      "url": "https://edvanz.co/",
      "name": "Edvanz | Online IT, Software & Programming Courses",
      "isPartOf": {
        "@id": "https://edvanz.co/#website"
      },
      "about": {
        "@id": "https://edvanz.co/#organization"
      }
    }
  ]
};

const Index = () => {
  usePageMeta({
    title: "Edvanz.co | Online IT, Software & Programming Courses",
    description:
      "Learn in-demand IT, software & programming skills with Edvanz. Explore online courses designed to help learners build practical knowledge & advance their careers. Sign up Now!",
    keywords:
      "Edvanz.co, Online IT Courses, Online Software Courses, Online Programming Courses",
    url: "https://edvanz.co/",
    path: "/",
    schema: homeSchema,
  });

  return (
    <MainLayout>
      <HeroSection />
      <DomainsSection />
      <FeaturesSection />
      <InstructorCTASection />
      <StatsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <BackToTop />
    </MainLayout>
  );
};

export default Index;
