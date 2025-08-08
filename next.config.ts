import type { NextConfig } from 'next';

const repoName = 'Wisam23-am';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: `/${repoName}`,
  assetPrefix: `/${repoName}/`,
};

export default nextConfig;
