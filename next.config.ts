/*
 * الملف: next.config.ts
 * النوع: Config
 * وظيفة الملف: إعدادات Next.js العامة للمشروع.
 * مستخدم بواسطة: Next.js أثناء dev/build/start.
 */

// NextConfig type بيساعد TypeScript يتأكد إن إعدادات Next.js مكتوبة صح.
import type { NextConfig } from "next";

// nextConfig هو object فيه إعدادات تشغيل وبناء المشروع.
const nextConfig: NextConfig = {
  // Dev: allow LAN host so OAuth redirectTo origin matches the tab (avoids PKCE / cookie mismatch)
  // دي بتسمح بعناوين development معينة عشان Google OAuth وSupabase redirect يشتغلوا محليا.
  allowedDevOrigins: ["192.168.56.1", "127.0.0.1", "localhost"],

  // 1. React Compiler is now a root property in Next.js 16
  // React Compiler optimization يساعد React يشتغل بكفاءة أكتر.
  reactCompiler: true,

  // 3. Enable headers for Client-Side AI (SharedArrayBuffer)
  // headers دي مهمة لبعض مكتبات AI في browser لأنها تحتاج isolation للصفحة.
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
  // هنا بنقول Webpack يتجاهل مكتبات native مش مناسبة للbrowser زي sharp و onnxruntime-node.
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

/*
 * ملخص الملف:
 * - بيضبط Next.js في development وbuild.
 * - بيفعل React Compiler.
 * - بيضيف security/isolation headers.
 * - بيعدل Webpack عشان بعض AI/browser dependencies ما تكسرش build.
 */
