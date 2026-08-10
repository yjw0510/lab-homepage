import { execSync } from "child_process";
import type { NextConfig } from "next";
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        port: "",
        pathname: "/vi/**",
        search: "",
      },
    ],
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
  pageExtensions: ["js", "jsx", "ts", "tsx"],
  experimental: {
    // Two root layouts (one per route group) leave no single layout to build a global 404 from,
    // so without this Next emits its own stock English page as out/404.html — the file GitHub
    // Pages serves for every unmatched URL. See src/app/global-not-found.tsx.
    globalNotFound: true,
  },
};

export default nextConfig;
