import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export class ChatterboxGenerator {
  constructor(config = {}) {
    this.name = "chatterbox";
    this.config = config;
  }

  async generateBatch(lines, outputDir) {
    const runner = resolve(HERE, "../../python/chatterbox_generate.py");
    const payload = JSON.stringify({ lines, outputDir, config: this.config });
    return new Promise((resolvePromise, reject) => {
      const child = spawn(this.config.python || "python3", [runner], { stdio: ["pipe", "inherit", "inherit"] });
      child.stdin.end(payload);
      child.on("error", reject);
      child.on("exit", (code) => code === 0 ? resolvePromise(lines.map((line) => ({ id: line.id, file: `${line.id}.wav`, provider: this.name }))) : reject(new Error(`Chatterbox generator exited with ${code}`)));
    });
  }
}

