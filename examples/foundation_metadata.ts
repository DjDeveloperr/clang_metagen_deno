import { generateFrameworkMetadata } from "../mod.ts";

const result = generateFrameworkMetadata({
  sdk:
    "/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk",
  framework: "Foundation",
});

Deno.writeTextFileSync("metadata.json", JSON.stringify(result, null, 2));
console.log("Written to metadata.json!");
