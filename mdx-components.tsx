import type { MDXComponents } from "mdx/types";
import dynamic from "next/dynamic";

const SimulationVideo = dynamic(
  () => import("@/components/ui/SimulationVideo"),
  { ssr: false }
);

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    SimulationVideo,
  };
}
