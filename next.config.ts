import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/golf',
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
