/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                // 这里应该是你的 R2 自定义域名
                hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace('https://', ''),
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
