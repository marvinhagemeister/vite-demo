import { useState } from "preact/hooks";
// Deno LSP trips over these
import preactLogo from "./assets/preact.svg";
import viteLogo from "/vite.svg";

// Specifiers that are set in `deno.json`
import { aliased } from "aliased";
import { red } from "@std/fmt/colors";
import * as kl from "https://esm.sh/kolorist@1.8.0";

export function App() {
  const [count, setCount] = useState(0);

  const jsrStr = String(red("jsr"));
  const httpStr = String(kl.red("http"));

  return (
    <>
      <div>
        <img src={viteLogo} class="logo" alt="Vite logo" />
        <img src={preactLogo} class="logo preact" alt="Preact logo" />
      </div>
      <h1>Vite + Preact</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <p>Does aliasing work? - {aliased}</p>
      <p>
        Does importing <code>jsr:@std/fmt/colors</code> work? - {jsrStr}
      </p>
      <p>
        Does importing <code>https:</code>? - {httpStr}
      </p>
    </>
  );
}
