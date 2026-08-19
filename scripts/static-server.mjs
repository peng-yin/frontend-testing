import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? 6099);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

http
  .createServer((request, response) => {
    try {
      const pathname = decodeURIComponent((request.url ?? "/").split("?")[0]);
      let file = path.resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      if (existsSync(file) && statSync(file).isDirectory()) {
        file = path.join(file, "index.html");
      }
      if (!existsSync(file) || !statSync(file).isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type":
          mime[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      });
      createReadStream(file).pipe(response);
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Static test server: http://127.0.0.1:${port} (${root})`);
  });
