import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TODO: remover cuando se regeneren los types de Supabase.
  // Drift conocido: tablas nuevas (pagos, solicitudes, estado_inicial_fotos, inmobiliarios, etc.)
  // aún no están en packages/database/types/database.types.ts.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
