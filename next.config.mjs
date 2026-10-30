/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // O cliente do Turso traz binarios nativos: fica fora do pacote do servidor (necessario no Vercel).
    serverExternalPackages: ['@libsql/client', 'libsql'],
    // Erro de digitacao comum no endereco da tela de envio dos resultados.
    async redirects() {
        return [{ source: '/whatsaap', destination: '/whatsapp', permanent: false }];
    },
};

export default nextConfig;
