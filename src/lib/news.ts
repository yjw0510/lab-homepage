import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { NewsItem } from "@/types/news";

const NEWS_DIR = path.join(process.cwd(), "content", "news");

export function getAllNews(): NewsItem[] {
  if (!fs.existsSync(NEWS_DIR)) return [];

  const files = fs.readdirSync(NEWS_DIR);

  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const filePath = path.join(NEWS_DIR, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      return {
        slug: file.replace(".mdx", ""),
        title: data.title || "",
        date: data.date || "",
        category: data.category || "general",
        summary: data.summary || "",
        titleKo: data.titleKo || "",
        summaryKo: data.summaryKo || "",
        image: data.image,
        content,
      } as NewsItem;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getRecentNews(count = 5): NewsItem[] {
  return getAllNews().slice(0, count);
}
