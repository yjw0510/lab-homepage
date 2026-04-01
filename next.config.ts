import { execSync } from "child_process";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { normalizeBasePath } from "./src/lib/basePath";

let localIp = "localhost";
try {
  localIp = execSync("ipconfig getifaddr en0").toString().trim();
} catch {}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  allowedDevOrigins: [localIp],
  images: {
    loader: "custom",
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  transpilePackages: ["next-image-export-optimizer"],
  env: {
    nextImageExportOptimizer_imageFolderPath: "public/images",
    nextImageExportOptimizer_exportFolderPath: "out",
    nextImageExportOptimizer_quality: "85",
    nextImageExportOptimizer_storePicturesInWEBP: "true",
    nextImageExportOptimizer_generateAndUseBlurImages: "true",
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const withMDX = createMDX({});
export default withMDX(nextConfig);
