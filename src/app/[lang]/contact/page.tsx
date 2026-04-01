import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactInfo } from "@/components/contact/ContactInfo";
import { RecruitmentBanner } from "@/components/contact/RecruitmentBanner";
import { getDictionary, hasLocale } from "../dictionaries";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the Multiscale Molecular Computational Chemistry Lab at Ajou University.",
};

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          title={dict.contact.title}
          subtitle={dict.contact.subtitle}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          <ContactInfo dict={dict} lang={lang} />
          <div>
            <RecruitmentBanner dict={dict} />
          </div>
        </div>
      </div>
    </div>
  );
}
