// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [
//     tailwindcss(),
//     react()
//   ],
// })

import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      proxy: {
        "/api-asmx": {
          target: "http://10.133.8.88:8060",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-asmx/, ""),
        },
      },
    },
    plugins: [
      tailwindcss(),
      react()
    ],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    optimizeDeps: {
      include: ["reactjs-human-body"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
