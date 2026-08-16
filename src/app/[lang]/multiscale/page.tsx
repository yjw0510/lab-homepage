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
        description: "반응 중 전자 변화부터 재료를 만드는 집단 운동까지, 질문에 맞는 계산 해상도를 설명합니다.",
      }
    : {
        title: "Multiscale",
        description: "How computational resolution connects electronic changes in reactions with the collective motion that shapes materials.",
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
