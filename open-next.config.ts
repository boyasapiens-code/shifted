import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental-cache override yet — the R2 (page cache) + D1 (tag cache)
// backends needed for full revalidatePath()/revalidateTag() support aren't
// provisioned (needs a real Cloudflare account — see wrangler.jsonc and
// STATUS.md's "Cloudflare migration" section). Once they're set up, add:
//
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   import d1TagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
//   export default defineCloudflareConfig({
//     incrementalCache: r2IncrementalCache,
//     tagCache: d1TagCache,
//   });
export default defineCloudflareConfig({});
