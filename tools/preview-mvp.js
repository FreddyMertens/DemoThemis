const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const requestedPort = Number(process.env.MVP_PREVIEW_PORT || 4173);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 4173;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".riv": "application/octet-stream",
  ".svg": "image/svg+xml; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
};

function redirect(response, location) {
  response.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  response.end();
}

function localFile(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = path.resolve(root, relative || "index.html");
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootPrefix)) return null;
  return resolved;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (url.pathname === "/") {
    redirect(response, "/index.html");
    return;
  }
  if (url.pathname === "/app" || url.pathname === "/home") {
    redirect(response, "/demothemis-mvp.html?preview=live#product-preview");
    return;
  }
  if (url.pathname === "/onboard") {
    redirect(response, "/demothemis-mvp.html?preview=onboard#product-preview");
    return;
  }

  let filename;
  try {
    filename = localFile(url.pathname);
  } catch (_error) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid path");
    return;
  }
  if (!filename) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filename, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filename).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filename).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`Proposal home: http://${host}:${port}/`);
  console.log(`DemoThemis Live MVP preview: http://${host}:${port}/demothemis-mvp.html#product-preview`);
  console.log("Press Ctrl+C to stop the local preview.");
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set MVP_PREVIEW_PORT to another port and try again.`);
    process.exitCode = 1;
    return;
  }
  throw error;
});
