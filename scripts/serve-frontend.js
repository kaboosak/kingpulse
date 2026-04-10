const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const projectRoot = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const runtimeConfig = {
  network: {
    chainId: 143,
    chainIdHex: "0x8f",
    chainName: "Monad Mainnet",
    nativeCurrency: {
      name: "Monad",
      symbol: "MON",
      decimals: 18,
    },
    rpcUrls: process.env.MONAD_MAINNET_RPC_URL ? [process.env.MONAD_MAINNET_RPC_URL] : [],
    explorerBaseUrl: "https://monadvision.com",
  },
  contractAddress:
    process.env.KINGPULSE_MAINNET_ADDRESS ||
    process.env.KINGPULSE_ADDRESS ||
    "0x740d1dcF13CDd101e34dDdCE6E4B9e350Ae3373c",
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function resolvePath(urlPath) {
  const normalizedPath = urlPath === "/" ? "/frontend/index.html" : urlPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(projectRoot, safePath);
}

const server = http.createServer((request, response) => {
  if (request.url.split("?")[0] === "/frontend/runtime-config.json") {
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(runtimeConfig));
    return;
  }

  const filePath = resolvePath(request.url.split("?")[0]);

  if (!filePath.startsWith(projectRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
});

server.listen(port, () => {
  console.log(`KingPulse frontend running at http://localhost:${port}`);
});
