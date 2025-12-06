/** @type {import('next').NextConfig} */
const nextConfig = {
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.abepte.accoladesweb.com',
        port: '', // empty string for default ports
        pathname: '/**', // Allows all paths
      },
      // Add more domains as needed
    ],
  },
};

export default nextConfig;
