import { test, expect, type Route, type Request } from "@playwright/test";

// CNPJs válidos (dígitos verificadores OK) usados nos cenários
const CNPJ_A_MASKED = "11.222.333/0001-81";
const CNPJ_B_MASKED = "45.997.418/0001-53";
const CNPJ_A_DIGITS = "11222333000181";
const CNPJ_B_DIGITS = "45997418000153";
const CNPJ_INVALID = "11.111.111/1111-11";

const CEP_A_MASKED = "01310-100";
const CEP_A_DIGITS = "01310100";
const CEP_INVALID_LEN = "00000";

const cnpjPayload = (razao: string) => ({
  razao_social: razao,
  nome_fantasia: razao,
  descricao_situacao_cadastral: "ATIVA",
  data_inicio_atividade: "2020-01-01",
  natureza_juridica: "LTDA",
  capital_social: 100000,
  porte: "ME",
  cep: "01310100",
  descricao_tipo_de_logradouro: "AVENIDA",
  logradouro: "PAULISTA",
  numero: "1000",
  complemento: "",
  bairro: "BELA VISTA",
  municipio: "SAO PAULO",
  uf: "SP",
  ddd_telefone_1: "1133334444",
  email: "contato@teste.com",
  cnaes_secundarios: [],
});

const cepPayload = {
  cep: "01310-100",
  logradouro: "Avenida Paulista",
  complemento: "lado ímpar",
  bairro: "Bela Vista",
  localidade: "São Paulo",
  uf: "SP",
};

test.describe("Fluxo E2E — consulta de CNPJ com debounce, loading, retry e cancelamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/lookup-e2e");
    await expect(page.getByRole("heading", { name: /Lookup E2E Fixture/i })).toBeVisible();
  });

  test("debounce agrupa digitação, exibe loading e mostra resultado final", async ({ page }) => {
    const calls: string[] = [];
    await page.route("**/brasilapi.com.br/api/cnpj/**", async (route: Route, req: Request) => {
      calls.push(req.url());
      await new Promise((r) => setTimeout(r, 1200)); // deixa o loading visível
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cnpjPayload("ACME LTDA")) });
    });

    const input = page.getByPlaceholder("00.000.000/0000-00");
    // Digita metade → não deve disparar nada (< 14 dígitos)
    await input.fill("11.222");
    await page.waitForTimeout(500);
    expect(calls.length).toBe(0);

    // Completa o CNPJ — debounce 400ms
    await input.fill(CNPJ_A_MASKED);

    // Loading aparece (ícone Loader2 com animate-spin dentro do section do CNPJ)
    await expect(page.locator('[data-testid="cnpj-section"] .animate-spin')).toBeVisible({ timeout: 2000 });

    // Resultado final
    await expect(page.getByTestId("cnpj-result")).toHaveText("ACME LTDA", { timeout: 5000 });
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain(CNPJ_A_DIGITS);
  });

  test("digitação rápida cancela a requisição anterior via debounce (apenas 1 fetch executa)", async ({ page }) => {
    const calls: string[] = [];
    await page.route("**/brasilapi.com.br/api/cnpj/**", async (route: Route, req: Request) => {
      calls.push(req.url());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cnpjPayload("BETA LTDA")) });
    });

    const input = page.getByPlaceholder("00.000.000/0000-00");
    await input.fill(CNPJ_A_MASKED);           // agenda debounce (400ms)
    await page.waitForTimeout(150);            // ainda dentro da janela do debounce
    await input.fill(CNPJ_B_MASKED);           // substitui — cancela o anterior

    await expect(page.getByTestId("cnpj-result")).toHaveText("BETA LTDA", { timeout: 5000 });
    // Somente a segunda consulta chegou à rede
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain(CNPJ_B_DIGITS);
    expect(calls[0]).not.toContain(CNPJ_A_DIGITS);
  });

  test("CNPJ inválido: mostra erro e nunca chama a API", async ({ page }) => {
    let called = 0;
    await page.route("**/brasilapi.com.br/api/cnpj/**", async (route: Route) => {
      called++;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.getByPlaceholder("00.000.000/0000-00").fill(CNPJ_INVALID);
    await expect(page.getByText("CNPJ inválido")).toBeVisible();
    await page.waitForTimeout(700);
    expect(called).toBe(0);
    // Botão de retry NÃO deve aparecer para inválido
    await expect(page.getByRole("button", { name: /Tentar novamente/i })).toHaveCount(0);
  });

  test("not-found + retry recupera para sucesso ao clicar em 'Tentar novamente'", async ({ page }) => {
    let attempt = 0;
    await page.route("**/brasilapi.com.br/api/cnpj/**", async (route: Route) => {
      attempt++;
      if (attempt === 1) {
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cnpjPayload("RETRY OK")) });
      }
    });

    await page.getByPlaceholder("00.000.000/0000-00").fill(CNPJ_A_MASKED);
    await expect(page.getByText(/CNPJ não encontrado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("cnpj-notfound")).toHaveText("1");

    await page.getByRole("button", { name: /Tentar novamente/i }).click();
    await expect(page.getByTestId("cnpj-result")).toHaveText("RETRY OK", { timeout: 5000 });
    expect(attempt).toBe(2);
  });

  test("erro de rede: exibe falha e permite retry bem-sucedido", async ({ page }) => {
    let attempt = 0;
    await page.route("**/brasilapi.com.br/api/cnpj/**", async (route: Route) => {
      attempt++;
      if (attempt === 1) await route.abort("failed");
      else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cnpjPayload("BACK ONLINE")) });
    });

    await page.getByPlaceholder("00.000.000/0000-00").fill(CNPJ_A_MASKED);
    // Falha de rede → serviço trata como null (comportamento atual): mostra notfound OU error.
    await expect(page.getByText(/CNPJ não encontrado|Falha ao consultar CNPJ/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Tentar novamente/i }).click();
    await expect(page.getByTestId("cnpj-result")).toHaveText("BACK ONLINE", { timeout: 5000 });
    expect(attempt).toBe(2);
  });
});

test.describe("Fluxo E2E — consulta de CEP com debounce, loading, retry e cancelamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/lookup-e2e");
  });

  test("debounce + loading + sucesso preenchem o endereço", async ({ page }) => {
    const calls: string[] = [];
    await page.route("**/viacep.com.br/ws/**", async (route: Route, req: Request) => {
      calls.push(req.url());
      await new Promise((r) => setTimeout(r, 1200));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cepPayload) });
    });

    const input = page.getByPlaceholder("00000-000");
    await input.fill(CEP_INVALID_LEN);
    await page.waitForTimeout(500);
    expect(calls.length).toBe(0);

    await input.fill(CEP_A_MASKED);
    await expect(page.locator('[data-testid="cep-section"] .animate-spin')).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId("cep-result")).toHaveText("Avenida Paulista", { timeout: 5000 });
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain(CEP_A_DIGITS);
  });

  test("cancelamento por digitação: apagar dígito impede o fetch enfileirado", async ({ page }) => {
    let called = 0;
    await page.route("**/viacep.com.br/ws/**", async (route: Route) => {
      called++;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cepPayload) });
    });

    const input = page.getByPlaceholder("00000-000");
    await input.fill(CEP_A_MASKED);            // agenda debounce
    await page.waitForTimeout(150);             // dentro da janela
    await input.fill("01310-10");               // volta a ficar < 8 dígitos → cancela
    await page.waitForTimeout(700);             // passa o tempo do debounce
    expect(called).toBe(0);
  });

  test("CEP not-found + retry finaliza com sucesso", async ({ page }) => {
    let attempt = 0;
    await page.route("**/viacep.com.br/ws/**", async (route: Route) => {
      attempt++;
      if (attempt === 1) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ erro: true }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cepPayload) });
      }
    });

    await page.getByPlaceholder("00000-000").fill(CEP_A_MASKED);
    await expect(page.getByText(/CEP não encontrado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("cep-notfound")).toHaveText("1");

    await page.getByRole("button", { name: /Tentar novamente/i }).click();
    await expect(page.getByTestId("cep-result")).toHaveText("Avenida Paulista", { timeout: 5000 });
    expect(attempt).toBe(2);
  });

  test("erro de rede no CEP + retry: recupera resultado final", async ({ page }) => {
    let attempt = 0;
    await page.route("**/viacep.com.br/ws/**", async (route: Route) => {
      attempt++;
      if (attempt === 1) await route.abort("failed");
      else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cepPayload) });
    });

    await page.getByPlaceholder("00000-000").fill(CEP_A_MASKED);
    await expect(page.getByText(/CEP não encontrado|Falha ao consultar CEP/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Tentar novamente/i }).click();
    await expect(page.getByTestId("cep-result")).toHaveText("Avenida Paulista", { timeout: 5000 });
    expect(attempt).toBe(2);
  });
});
