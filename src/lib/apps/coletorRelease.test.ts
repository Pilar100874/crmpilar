import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { versaoPacoteColetor } from "./coletorRelease";

const base = "https://github.com/Pilar100874/crmpilar/releases/download/";

describe("Versões dos instaladores do Coletor", () => {
  it("Mac Intel aponta para o pacote 2.1.3, não para 2.1.1", () => {
    const manifest = JSON.parse(readFileSync("public/coletor/version.json", "utf8"));
    expect(manifest.downloadUrlMacIntel).toBe(`${base}coletor-v2.1.3/ColetorPilar-Mac-Intel.zip`);
    expect(versaoPacoteColetor(manifest.downloadUrlMacIntel)).toBe("2.1.3");
  });

  it("o rótulo de um pacote antigo não herda a versão global", () => {
    expect(versaoPacoteColetor(`${base}coletor-v2.1.1/ColetorPilar-Mac-Intel.zip`)).toBe("2.1.1");
    expect(versaoPacoteColetor(`${base}appliance-latest/coletor.iso`)).toBeUndefined();
  });

  async function check(macVersion: string) {
    const manifest = { version: "2.1.3", downloadUrlMacIntel: `${base}coletor-v${macVersion}/ColetorPilar-Mac-Intel.zip` };
    const network = {
      get: (_url: string, _options: unknown, callback: (res: unknown) => void) => {
        const res = {
          statusCode: 200,
          on: (event: string, cb: (data?: string) => void) => {
            if (event === "data") cb(JSON.stringify(manifest));
            if (event === "end") cb();
          },
        };
        callback(res);
        return { on: () => ({}) };
      },
      request: (_url: string, _options: unknown, callback: (res: unknown) => void) => {
        callback({ statusCode: 200, resume: () => {} });
        const request = { on: () => request, end: () => {} };
        return request;
      },
    };
    const module = { exports: {} as { checarAtualizacao: () => Promise<{ remoteVersion: string; atualizacaoDisponivel: boolean }> } };
    runInNewContext(readFileSync("coletor/updater.js", "utf8"), {
      module,
      process: { platform: "darwin", arch: "x64" },
      require: (name: string) => name === "electron" ? { app: { getVersion: () => "2.1.1" } } :
        name === "https" || name === "http" ? network : {},
      URL,
    });
    return module.exports.checarAtualizacao();
  }

  it("não oferece reinstalar 2.1.1 como se fosse 2.1.3", async () => {
    expect(await check("2.1.1")).toMatchObject({ remoteVersion: "2.1.1", atualizacaoDisponivel: false });
  });

  it("oferece atualizar 2.1.1 quando o pacote Mac é realmente 2.1.3", async () => {
    expect(await check("2.1.3")).toMatchObject({ remoteVersion: "2.1.3", atualizacaoDisponivel: true });
  });
});