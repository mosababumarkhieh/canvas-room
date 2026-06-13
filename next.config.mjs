/** @type {import('next').NextConfig} */
const nextConfig = {
  // Socket.IO needs the custom server, so we disable static optimization for API routes that use it
  webpack: (config) => {
    config.externals.push({ bufferutil: "bufferutil", "utf-8-validate": "utf-8-validate" });
    return config;
  },
};

export default nextConfig;
