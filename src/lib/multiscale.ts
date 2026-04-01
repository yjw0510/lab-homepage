import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MultiscaleArea } from "@/types/multiscale";

const MULTISCALE_DIR = path.join(process.cwd(), "content", "multiscale");

export function getAllMultiscaleAreas(): MultiscaleArea[] {
  if (!fs.existsSync(MULTISCALE_DIR)) return [];

  const files = fs.readdirSync(MULTISCALE_DIR);

  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const filePath = path.join(MULTISCALE_DIR, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      return {
        slug: file.replace(".mdx", ""),
        title: data.title || "",
        shortDescription: data.shortDescription || "",
        shortDescriptionKo: data.shortDescriptionKo || "",
        icon: data.icon || "FlaskConical",
        color: data.color || "#06b6d4",
        order: data.order ?? 99,
        scale: data.scale || "",
        moleculeViewer: data.moleculeViewer || false,
        content,
        contentKo: data.contentKo || "",
      } as MultiscaleArea;
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getMultiscaleArea(slug: string): MultiscaleArea | undefined {
  return getAllMultiscaleAreas().find((r) => r.slug === slug);
}
