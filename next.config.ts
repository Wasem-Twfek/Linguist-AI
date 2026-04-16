import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev: allow LAN host so OAuth redirectTo origin matches the tab (avoids PKCE / cookie mismatch)
  allowedDevOrigins: ["192.168.56.1", "127.0.0.1", "localhost"],

  // 1. React Compiler is now a root property in Next.js 16
  reactCompiler: true,

  // 3. Enable headers for Client-Side AI (SharedArrayBuffer)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  
  // 4. Webpack config for Transformers.js (Required)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    }
    return config;
  },
};

export default nextConfig;