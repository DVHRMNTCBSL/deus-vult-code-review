#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist-blue-mango");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

fs.copyFileSync(path.join(root, "blue-mango.html"), path.join(dist, "index.html"));
fs.copyFileSync(path.join(root, "blue-mango-model.js"), path.join(dist, "blue-mango-model.js"));
fs.writeFileSync(path.join(dist, "CNAME"), "blue-mango-dv.surge.sh\n", "utf8");

const manifesto = {
  name: "BLUE MANGO",
  status: "public_static_build",
  generatedAt: new Date().toISOString(),
  files: ["index.html", "blue-mango-model.js", "CNAME"],
  source: "deus-vult-public/scripts/build-blue-mango.js",
  gate: "upload_deploy_push_authorized_by_controller_latest_message",
};

fs.writeFileSync(path.join(dist, "manifesto.json"), `${JSON.stringify(manifesto, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ ok: true, dist }, null, 2));
