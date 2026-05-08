import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/golf',
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
