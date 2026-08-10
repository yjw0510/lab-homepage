import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactInfo } from "@/components/contact/ContactInfo";
import { RecruitmentBanner } from "@/components/contact/RecruitmentBanner";
import { getDictionary, hasLocale } from "../dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.contact.title, description: dict.contact.subtitle };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <div className="py-20 sm:py-28">
      {/* Gutter on the clamped element, not outside it. Applied to the outer div, `mx-auto`
          absorbs it and the column measures 1152px instead of the declared 1088, so body
          content on these four routes ruled 32px wider than the navbar above and the footer
          below it on the same screen. */}
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* Masthead */}
        <header>
          <h1 className="type-display text-[37px] text-foreground sm:text-[49px]">
            {dict.contact.title}
          </h1>
        </header>
        <div
          aria-hidden="true"
          className="mt-8 h-[3px] border-y border-border-strong"
        />

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:mt-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <ContactInfo dict={dict} lang={lang} />
          </div>
          <div className="md:col-span-7">
            <RecruitmentBanner dict={dict} />
          </div>
        </div>
      </div>
    </div>
  );
}
