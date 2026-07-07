import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Our own placeholder illustrations in public/images are SVGs; sandboxed
    // CSP keeps this safe. Remove once real photography replaces them.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
