const isDev = process.env?.NODE_ENV === 'development';
console.log('NODE_ENV', process.env?.NODE_ENV);
console.log('-------------------');

const withPWA = require('next-pwa')({
  dest: 'public',
  register: !isDev,
  skipWaiting: !isDev,
  disable: isDev,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: false,
  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
  publicRuntimeConfig: {
    chattingIds: {},
    globalConfigs: {},
  },
};

module.exports = withPWA(nextConfig);

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5146/api/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        // 匹配所有路径
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  async serverMiddleware() {
    return [
      {
        path: '/api',
        handler: createProxyMiddleware({
          target: 'http://localhost:5146',
          changeOrigin: true,
          pathRewrite: { '^/api': '' },
        }),
      },
    ];
  },
};
