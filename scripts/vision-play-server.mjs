import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { invokeGdlBridgeSync } from "../parser/gdl-bridge.js";
import { composeVisionFile, composeVisionFromMap } from "../parser/vision-compose.js";
import { composeVisionProject, composeVisionProjectFromUpload } from '../parser/vision-project.js';

const ROOT = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** @type {unknown | null} */
let cachedBootDoc = null;

async function injectPlayerBootDoc(html) {
  const marker = "window.__VISION_INITIAL_DOC__";
  if (html.includes(marker)) return html;
  try {
    if (!cachedBootDoc) {
      cachedBootDoc = await composeVisionProject(
        path.join(ROOT, "examples", "dashspec-studio.visionproj"),
      );
    }
    const payload = JSON.stringify(cachedBootDoc).replace(/</g, "\\u003c");
    const inject = `<script>window.__VISION_INITIAL_DOC__=${payload};</script>`;
    return html.replace("</head>", inject + "\n</head>");
  } catch {
    return html;
  }
}
const PORT = Number(process.env.PORT || 5199);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".vision": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(req, res) {
  let urlPath = req.url?.split("?")[0] ?? "/";
  if (urlPath === "/") urlPath = "/player/";
  const filePath = path.normalize(path.join(ROOT, urlPath.replace(/^\//, "")));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    const target = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    let data = await fs.readFile(target);
    if (target.endsWith(`${path.sep}player${path.sep}index.html`)) {
      data = Buffer.from(await injectPlayerBootDoc(data.toString("utf8")), "utf8");
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/__vision/gdl") {
    try {
      const { kind, text } = JSON.parse(await readBody(req));
      const payload = invokeGdlBridgeSync(kind, text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(err?.message ?? err));
    }
    return;
  }
  if (req.method === "POST" && req.url === "/__vision/compose") {
    try {
      const { entryPath, files, projectRoot } = JSON.parse(await readBody(req));
      const entry = String(entryPath ?? "").replace(/\\/g, "/");
      if (!entry || !files || typeof files !== "object") {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("entryPath and files required");
        return;
      }
      const doc = await composeVisionFromMap(entry, files, {
        projectRoot: projectRoot ?? "",
        strict: false,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(doc));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(err?.message ?? err));
    }
    return;
  }
  if (req.method === "POST" && req.url === "/__vision/project") {
    try {
      const body = JSON.parse(await readBody(req));
      const { path: relPath, manifestSource, manifestRel, files } = body;
      if (relPath) {
        const fullPath = path.normalize(path.join(ROOT, String(relPath).replace(/^\//, "")));
        if (!fullPath.startsWith(ROOT)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        const doc = await composeVisionProject(fullPath);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(doc));
        return;
      }
      if (manifestSource && manifestRel && files && typeof files === "object") {
        const doc = await composeVisionProjectFromUpload(String(manifestSource), String(manifestRel), files, {
          strict: false,
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(doc));
        return;
      }
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("path or manifestSource+manifestRel+files required");
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(err?.message ?? err));
    }
    return;
  }
  if (req.method === "POST" && req.url === "/__vision/parse") {
    try {
      const { path: relPath } = JSON.parse(await readBody(req));
      const fullPath = path.normalize(path.join(ROOT, relPath.replace(/^\//, "")));
      if (!fullPath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const doc = await composeVisionFile(fullPath);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(doc));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(err?.message ?? err));
    }
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`VisionSpec player http://localhost:${PORT}/player/ (GDL bridge POST /__vision/gdl)`);
});
