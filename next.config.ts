import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  experimental: {
    serverActions: {
      // CV uploads (docx/pdf) exceed the default 1 MB Server Action body limit
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
