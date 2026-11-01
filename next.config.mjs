/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pg", "mongodb", "bcryptjs"],
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
