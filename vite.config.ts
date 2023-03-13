import { build, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dts()],

  server: {
    port: 5634,
    strictPort: true,
  },
  build: {
    lib: {
      entry: "src/unkover/index.tsx",
      name: "unkover",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "zarr",
        "@jhnnsrs/datalayer",
        "debounce",
        "colormap",
        "aws4fetch",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
