/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ecommerce/shared-types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
};

export default nextConfig;
