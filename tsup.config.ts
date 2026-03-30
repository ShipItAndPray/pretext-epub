import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      reader: "src/reader.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: true,
    clean: true,
    external: ["react", "react-dom", "@chenglou/pretext"],
    sourcemap: true,
  },
]);
