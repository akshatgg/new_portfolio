/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only service: no pages, no image optimisation, no static assets.
  poweredByHeader: false,
  reactStrictMode: true,

  // data/about-me.md is read at runtime with node:fs. Next's bundler cannot see
  // that dependency by static analysis, so it must be traced explicitly or the
  // file is missing from the deployed function.
  outputFileTracingIncludes: {
    '/api/chat': ['./data/**'],
    '/api/health': ['./data/**'],
  },
};

export default nextConfig;
