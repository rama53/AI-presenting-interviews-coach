const pagesBasePath = process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(pagesBasePath !== undefined && {
    output: 'export',
    basePath: pagesBasePath,
  }),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
