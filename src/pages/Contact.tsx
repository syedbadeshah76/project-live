import { MainLayout } from "@/components/layout/MainLayout";
import { ContactSection } from "@/components/home/ContactSection";
import { usePageMeta } from "@/lib/use-page-meta";

const contactSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": "https://edvanz.co/contact/#webpage",
      "url": "https://edvanz.co/contact/",
      "name": "Contact Edvanz",
      "isPartOf": {
        "@id": "https://edvanz.co/#website"
      }
    },
    {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "url": "https://edvanz.co/contact/",
      "email": "info@hsbinfotech.com",
      "availableLanguage": [
        "English"
      ]
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
          "name": "Contact",
          "item": "https://edvanz.co/contact/"
        }
      ]
    }
  ]
};

export default function Contact() {
  usePageMeta({
    title: "Contact Edvanz | Learner Support & Enquiries",
    description:
      "Contact Edvanz for course enquiries, learner support and assistance. Our team is here to help you get the information and support you need.",
    keywords: "Contact Edvanz, Edvanz Support",
    url: "https://edvanz.co/contact",
    path: "/contact",
    schema: contactSchema,
  });

  return (
    <MainLayout>
      <ContactSection />
    </MainLayout>
  );
}
