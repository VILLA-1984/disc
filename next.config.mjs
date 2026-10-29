/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // O cliente do Turso traz binarios nativos: fica fora do pacote do servidor (necessario no Vercel).
    serverExternalPackages: ['@libsql/client', 'libsql'],
};

export default nextConfig;
