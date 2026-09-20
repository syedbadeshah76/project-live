import { Link } from "react-router-dom";
import {
  GraduationCap,
  Facebook,
  Linkedin,
  Youtube,
  Mail,
  Instagram,
} from "lucide-react";
import { FaPinterestP, FaXTwitter } from "react-icons/fa6";
import { SiThreads } from "react-icons/si";

const footerLinks = {
  company: [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Contact Us", path: "/contact" },
  
  ],
  support: [
    { name: "Terms & Conditions", path: "/terms" },
    { name: "Privacy Policy", path: "/privacy" },
  ],
};

const socialLinks = [
  {
    icon: Facebook,
    href: "https://www.facebook.com/edvanz.lms/",
    label: "Facebook",
  },
  {
    icon: FaXTwitter,
    href: "https://x.com/edvanzlms",
    label: "X",
  },
  {
    icon: Linkedin,
    href: "https://www.linkedin.com/company/edvanz-lms/",
    label: "LinkedIn",
  },
  {
    icon: Instagram,
    href: "https://www.instagram.com/edvanzlms/",
    label: "Instagram",
  },
  {
    icon: SiThreads,
    href: "https://www.threads.com/@edvanzlms",
    label: "Threads",
  },
  {
    icon: Youtube,
    href: "https://www.youtube.com/@EdvanzLMS",
    label: "YouTube",
  }
];
export const Footer = () => {
  return (
    <footer className="bg-primary text-white">
      <div className="container mx-auto px-6 py-12">

        {/* Top Footer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="h-8 w-8 text-white" />
              <span className="font-display font-bold text-2xl text-white">
                Edvanz
              </span>
            </div>

            <p className="text-white/90 leading-relaxed max-w-sm">
              Empowering the next generation of tech professionals with
              industry-leading courses and hands-on learning experiences.
            </p>

            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4 text-white">
              Company
            </h4>

            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-white/80 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

       

          {/* Support Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4 text-white">
              Support
            </h4>

            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-white/80 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
   <div className="mt-0 space-y-5">
    <h2 className="font-bold">Address</h2>
    <div>
      <h5 className="font-semibold text-base text-white mb-2">
        India
      </h5>
      <p className="text-sm leading-relaxed text-white/70">
        6th Floor, Quadrant I, Cyber Towers, Hitech City,
        Hyderabad – 500081, Telangana, India
      </p>
    </div>

    {/* Saudi Arabia */}
    <div>
      <h5 className="font-semibold text-base text-white mb-2">
        Saudi Arabia
      </h5>
      <p className="text-sm leading-relaxed text-white/70">
        (Head Office) Building No: 9353, Office #3,
        Shaddad Al Fahri, Farazdaq Street, Al Malaz,
        Riyadh – 12642, KSA
      </p>
    </div>

    {/* UAE */}
    <div>
      <h5 className="font-semibold text-base text-white mb-2">
        UAE
      </h5>
      <p className="text-sm leading-relaxed text-white/70">
        Unit: C1802-64, Ontario Tower, Business Bay,
        Dubai, UAE
      </p>
    </div>
  </div>
</div>
        </div>

        {/* Newsletter */}
{/* Newsletter */}
<div className="mt-12 border-t border-white/10">
  <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-10">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

      {/* Newsletter Content */}
      <div className="min-w-0">
        <h4 className="font-display text-lg font-semibold text-white">
          Subscribe to our newsletter
        </h4>

        <p className="mt-2 text-sm leading-relaxed text-white/80 sm:text-base">
          Get the latest courses and updates delivered to your inbox.
        </p>
      </div>

      {/* Newsletter Form */}
      <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[500px]">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />

          <input
            type="email"
            placeholder="Enter your email"
            className="h-12 w-full rounded-xl border border-white/20 bg-white/10 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/60 focus:border-white/40"
          />
        </div>

        <button
          type="button"
          className="h-12 shrink-0 rounded-xl bg-white px-7 font-semibold text-primary transition-colors hover:bg-white/90"
        >
          Subscribe
        </button>
      </div>

    </div>
  </div>
</div>
        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/70">
            &copy; {new Date().getFullYear()} Edvanz. All rights reserved.
          </p>
        </div>

      
    </footer>
  );
};