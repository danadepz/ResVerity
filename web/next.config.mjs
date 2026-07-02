/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse relies on native Node bindings (@napi-rs/canvas); bundling it
  // server-side breaks its DOMMatrix setup, so load it via native require
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
