import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDictionary, hasLocale } from "../dictionaries";
import type { Locale } from "../dictionaries";

export const metadata: Metadata = {
  title: "CV",
  description:
    "Curriculum vitae of Ji Woong Yu, Assistant Professor at Ajou University.",
};

/* ─── CV data ─── */

const education = {
  en: [
    {
      degree: "Ph.D., Chemical and Biological Engineering",
      institution: "Seoul National University",
      period: "2016 \u2013 2022",
      detail: "Advisor: Prof. Won Bo Lee",
    },
    {
      degree: "B.S., Chemical Engineering (Summa Cum Laude)",
      institution: "Chung-Ang University",
      period: "2012 \u2013 2016",
      detail: "GPA: 4.31 / 4.50",
    },
  ],
  ko: [
    {
      degree: "박사, 화학생물공학부",
      institution: "서울대학교",
      period: "2016 \u2013 2022",
      detail: "지도교수: 이원보",
    },
    {
      degree: "학사, 화학공학과 (최우등 졸업)",
      institution: "중앙대학교",
      period: "2012 \u2013 2016",
      detail: "GPA: 4.31 / 4.50",
    },
  ],
};

const experience = {
  en: [
    {
      role: "Assistant Professor",
      institution: "Ajou University",
      departments: ["School of Frontier Sciences", "Department of Chemistry"],
      period: "2026 \u2013 present",
    },
    {
      role: "AI Research Fellow",
      institution: "Korea Institute for Advanced Study (KIAS)",
      department: "Center for AI and Natural Sciences",
      period: "2023 \u2013 2026",
      detail: "Advisor: Prof. Changbong Hyeon",
    },
    {
      role: "Postdoctoral Research Fellow",
      institution: "Seoul National University",
      department: "Department of Chemical and Biological Engineering",
      period: "2022 \u2013 2023",
    },
  ],
  ko: [
    {
      role: "조교수",
      institution: "아주대학교",
      departments: ["프런티어과학학부", "화학과"],
      period: "2026 \u2013 현재",
    },
    {
      role: "AI 연구원",
      institution: "고등과학원 (KIAS)",
      department: "AI와 자연과학 센터",
      period: "2023 \u2013 2026",
      detail: "지도교수: 현창봉",
    },
    {
      role: "박사후연구원",
      institution: "서울대학교",
      department: "화학생물공학부",
      period: "2022 \u2013 2023",
    },
  ],
};

const awards = {
  en: [
    { title: "Young WATOC Scholar", detail: "Selected for World Association of Theoretical and Computational Chemists, Oslo 2025" },
    { title: "Dongjin Outstanding Paper Award", detail: "Seoul National University, 2022" },
    { title: "Summa Cum Laude", detail: "Chung-Ang University, 2016" },
  ],
  ko: [
    { title: "Young WATOC Scholar", detail: "세계이론전산화학회, 오슬로 2025 선정" },
    { title: "동진 우수논문상", detail: "서울대학교, 2022" },
    { title: "최우등 졸업", detail: "중앙대학교, 2016" },
  ],
};

const skills = {
  en: [
    { category: "Molecular Simulation", items: "LAMMPS, GROMACS, HOOMD-blue" },
    { category: "First-Principles Calculation", items: "VASP, CP2K, Quantum ESPRESSO" },
    { category: "Quantum Chemistry", items: "Gaussian, PySCF" },
    { category: "Machine-Learned Potentials", items: "DeePMD-kit, MACE, NequIP, JAX-MD" },
    { category: "Visualization", items: "VMD, OVITO" },
    { category: "Programming", items: "Python, C++, JAX, CUDA, OpenMP/MPI" },
    { category: "Infrastructure", items: "PBS, SGE, Slurm, Docker" },
  ],
  ko: [
    { category: "분자 시뮬레이션", items: "LAMMPS, GROMACS, HOOMD-blue" },
    { category: "제일원리 계산", items: "VASP, CP2K, Quantum ESPRESSO" },
    { category: "양자화학", items: "Gaussian, PySCF" },
    { category: "기계학습 퍼텐셜", items: "DeePMD-kit, MACE, NequIP, JAX-MD" },
    { category: "시각화", items: "VMD, OVITO" },
    { category: "프로그래밍", items: "Python, C++, JAX, CUDA, OpenMP/MPI" },
    { category: "인프라", items: "PBS, SGE, Slurm, Docker" },
  ],
};

const professional = {
  en: [
    "American Physical Society (APS)",
    "American Chemical Society (ACS)",
    "International Centre for Multiscale Simulations (ICMS)",
    "World Association of Theoretical and Computational Chemists (WATOC)",
  ],
  ko: [
    "미국물리학회 (APS)",
    "미국화학회 (ACS)",
    "International Centre for Multiscale Simulations (ICMS)",
    "세계이론전산화학회 (WATOC)",
  ],
};

/* ─── Component ─── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function CVPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const loc = lang as Locale;

  return (
    <div className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <SectionHeading title={dict.cv.title} subtitle={dict.cv.subtitle} />

        {/* Education */}
        <Section title={dict.cv.education}>
          <div className="space-y-4">
            {education[loc].map((ed, i) => (
              <div key={i}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                  <p className="font-medium text-foreground">{ed.degree}</p>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {ed.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{ed.institution}</p>
                {ed.detail && (
                  <p className="text-sm text-muted-foreground">{ed.detail}</p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Experience */}
        <Section title={dict.cv.experience}>
          <div className="space-y-4">
            {experience[loc].map((exp, i) => (
              <div key={i}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                  <p className="font-medium text-foreground">{exp.role}</p>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {exp.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{exp.institution}</p>
                {"departments" in exp && exp.departments
                  ? (exp.departments as string[]).map((dept: string, di: number) => (
                      <p key={di} className="text-sm text-muted-foreground">{dept}</p>
                    ))
                  : "department" in exp && exp.department
                    ? <p className="text-sm text-muted-foreground">{exp.department}</p>
                    : null}
                {"detail" in exp && exp.detail && (
                  <p className="text-sm text-muted-foreground">{exp.detail}</p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Awards */}
        <Section title={dict.cv.awards}>
          <div className="space-y-3">
            {awards[loc].map((aw, i) => (
              <div key={i}>
                <p className="font-medium text-foreground">{aw.title}</p>
                <p className="text-sm text-muted-foreground">{aw.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Technical Skills */}
        <Section title={dict.cv.skills}>
          <div className="space-y-2">
            {skills[loc].map((sk, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                <span className="text-sm font-medium text-foreground w-52 shrink-0">
                  {sk.category}
                </span>
                <span className="text-sm text-muted-foreground">
                  {sk.items}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Professional Activities */}
        <Section title={dict.cv.professional}>
          <ul className="space-y-1">
            {professional[loc].map((org, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {org}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
