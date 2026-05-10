import { buildServer } from "./server.js";
import { MemoryStore } from "./store.js";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildServer({ store: new MemoryStore() });
app.listen({ port, host }).then(() => {
  app.log.info(`marque api listening on ${host}:${port}`);
}).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
