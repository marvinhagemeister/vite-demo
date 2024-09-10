import { Plugin, ResolvedConfig } from "vite";
import { transform } from "@swc-node/core";
import * as path from "@std/path";

const DECODER = new TextDecoder();
const DENO_DEP_IMPORT = /^(https?:\/\/|jsr:|npm:)/;

export function deno(): Plugin {
  // Keep track of processed specifiers
  const processed = new Set<string>();
  // Cache to speed up repeated resolution.
  const cache = new Map<string, string | null>();

  let config: ResolvedConfig;
  return {
    name: "deno",
    // Grab the final vite configuration to get the project root.
    configResolved(configResolved) {
      config = configResolved;
    },
    // Hook to resolve an import specifier to its final value. Usually
    // used to resolve aliases or virtual modules. Plugins can also
    // "tag" specifiers, so that no other plugins will resolve them.
    async resolveId(id) {
      // Bail out early if we resolved this specifier already, regardless
      // of whether we were able to resolve it or not.
      if (processed.has(id)) {
        return cache.get(id);
      }

      // Check if Deno can resolve this specifier. It's a bit
      // gross having to spawn a child process for each identifier.
      // We could add some caching here around it to ensure every
      // specifier only ever spawns one subcommand, but either way
      // spawning a child process on every specifier is kinda gross.
      const result = await (new Deno.Command("deno", {
        args: ["info", "--json", id],
        cwd: config.root ?? Deno.cwd(),
      })).output();

      processed.add(id);

      // Deno can resolve it, if it is successful
      if (result.code === 0) {
        const stdout = DECODER.decode(result.stdout);
        const json = JSON.parse(stdout) as DenoInfoJsonV1;

        const mod = json.modules[0];

        // Tag it if it's a file we need to transform. We don't
        // need to transform files in the project directory ourselves.
        if (
          json.roots.some((root) => DENO_DEP_IMPORT.test(root)) ||
          path.relative(config.root, mod.local).startsWith(".")
        ) {
          const resolved = `\0deno:${mod.local}`;
          cache.set(id, resolved);
          return resolved;
        }

        // We can vite handle the loading for us
        cache.set(id, mod.local);
        return mod.local;
      }

      // Not something Deno can resolve. Return nothing and let
      // other plugins handle this specifier.
    },
    async load(id) {
      // Don't load files not tagged by us
      if (!id.startsWith("\0deno:")) return;

      // Get original specifier
      id = id.slice("\0deno:".length);
      const code = await Deno.readTextFile(id);

      // Vite's plugin API expects plugins to return JS file not TS.
      // JSR modules are typically in plain TS, so transform them.
      //
      // TODO: Pass jsx options? Server JSX transpilation is usually
      // different from browser one. We don't support environment
      // configs in Deno so far.
      const result = await transform(code, id, {
        sourcemap: "inline",
        module: "es6",
      });

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}

export interface DenoInfoJsonV1 {
  version: 1;
  redirects: Record<string, string>;
  roots: string[];
  modules: Array<
    {
      kind: "esm";
      local: string;
      size: number;
      mediaType: "TypeScript";
      specifier: string;
    }
  >;
}
