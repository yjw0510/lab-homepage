import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllMultiscaleAreas } from "@/lib/multiscale";
import { hasLocale } from "../dictionaries";
import { MultiscaleExperienceLoader } from "@/components/multiscale/MultiscaleExperienceLoader";
import { MultiscaleOverview } from "@/components/multiscale/MultiscaleOverview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return lang === "ko"
    ? {
        title: "멀티스케일",
        description: "멀티스케일 분자계산화학 연구실의 계산 방법과 연구 흐름.",
      }
    : {
        title: "Multiscale",
        description: "Methods and research flow of the Multiscale Molecular Computational Chemistry Lab.",
      };
}

export default async function MultiscalePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const areas = getAllMultiscaleAreas();

  return (
    <div className="-mt-16 overflow-hidden">
      <MultiscaleExperienceLoader
        lang={lang}
      />
      <MultiscaleOverview areas={areas} lang={lang} />
    </div>
  );
}
