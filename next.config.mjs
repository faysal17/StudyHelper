// Only the Cloudflare R2 bucket this app actually loads images from —
// previously '**', which let Next's image optimizer proxy-fetch any URL
// (AUDIT.md section 1.3). Derived from the env var so this doesn't need to
// be kept in sync by hand.
const r2PublicHostname = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname
  : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next lint`'s default dirs don't include `hooks` — without this, the new
  // hooks/ directory (added in M11) would silently escape the CI lint gate.
  eslint: {
    dirs: ['app', 'components', 'lib', 'hooks'],
  },
  images: {
    remotePatterns: r2PublicHostname
      ? [
          {
            protocol: 'https',
            hostname: r2PublicHostname,
          },
        ]
      : [],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
