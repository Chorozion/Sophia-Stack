// openapi.mjs — the bridge that turns a Sophia site into a ChatGPT Custom GPT
// Action. Served at /openapi.json with the server URL set to THIS deployment's
// origin, so a GPT can import it from any installed site. Bearer = a mykey- token.
export function openapiSpec(origin) {
  const VALUE = {
    description: "Value for the operation (any JSON).",
    oneOf: [
      { type: "string" }, { type: "number" }, { type: "boolean" },
      { type: "object", additionalProperties: true }, { type: "array", items: {} }, { type: "null" },
    ],
  };
  const OK = { description: "Result", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } };
  return {
    openapi: "3.1.0",
    info: {
      title: "Sophia Site Editor API",
      version: "1.0.0",
      description: "Read and edit a live, self-hosted Sophia website. Call /api/sophia/catalog first to learn the block types, styles, effects, data + media APIs, functions, and patch ops, then read /api/sophia/model and apply small validated patches. Writes need a Bearer mykey- token.",
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/sophia/catalog": {
        get: {
          operationId: "sophiaCatalog", summary: "Read the capability catalog (call FIRST)",
          description: "Allowed block types + props, style presets, effects, patch ops, the data API, sandboxed functions, and media rules.",
          security: [], responses: { 200: OK },
        },
      },
      "/api/sophia/model": {
        get: {
          operationId: "sophiaReadModel", summary: "Read the current site model",
          description: "The compact JSON model of the whole live site (pages -> blocks, style, data collections, functions, brief).",
          security: [], responses: { 200: OK },
        },
      },
      "/api/sophia/patch": {
        post: {
          operationId: "sophiaPatch", summary: "Apply validated edits to the live site",
          description: "ops is an array. set/add/remove/move target a block by id (+ optional route/path/index). mset/mdel target a dot path in the model (e.g. style, pages./about, data.collections.posts, functions.subscribe). Invalid patches are rejected; the previous good state is kept.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: {
              type: "object", required: ["ops"],
              properties: { ops: { type: "array", items: {
                type: "object", required: ["op"],
                properties: {
                  op: { type: "string", enum: ["set", "add", "remove", "move", "mset", "mdel"] },
                  id: { type: "string", description: "Block id (set/add/remove/move)." },
                  route: { type: "string", description: "Page route, e.g. '/' or '/about'." },
                  path: { type: "string", description: "Prop path (block) or model dot-path (mset/mdel)." },
                  index: { type: "integer", description: "Position for add/move." },
                  value: VALUE,
                },
              } } },
            } } },
          },
          responses: { 200: OK },
        },
      },
      "/api/sophia/css": {
        put: {
          operationId: "sophiaSetCss", summary: "Replace the live custom CSS layer",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["css"], properties: { css: { type: "string" } } } } } },
          responses: { 200: OK },
        },
      },
      "/api/sophia/rollback": {
        post: { operationId: "sophiaRollback", summary: "Undo the last edit (restore previous good version)", responses: { 200: OK } },
      },
    },
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
  };
}
