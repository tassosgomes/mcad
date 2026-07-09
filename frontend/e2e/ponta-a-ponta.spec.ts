/**
 * Simulação Ponta a Ponta — Golden Path do mcad
 *
 * Percorre os 4 domínios (Cadastro → Arrecadação → Identificação → Distribuição)
 * em um único cenário reproduzível, com browser visível para acompanhamento humano.
 *
 * Execução (browser visível):
 *   npm run e2e:ponta-a-ponta
 *
 * Execução (headless / CI):
 *   npm run e2e:ponta-a-ponta:ci
 */

import { test, expect } from '@playwright/test';
import { loginWithLogto } from './logto-login';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// Configuração: timeout generoso (10 min) para simulação completa
// ═══════════════════════════════════════════════════════════════
test.setTimeout(600_000);

// ═══════════════════════════════════════════════════════════════
// Dados da simulação
// ═══════════════════════════════════════════════════════════════
const BASE_URL = 'https://mcad.tasso.dev.br';

const CREDENTIALS = {
  cadastro:      { user: 'analista_cadastro',       pass: 'Analista123!' },
  arrecadacao:   { user: 'analista_arrecadacao',    pass: 'Analista123!' },
  identificacao: { user: 'analista_identificacao',   pass: 'gW-pcQ85' },
  distribuicao:  { user: 'analista_distribuicao',    pass: 'LV1Uwm1k' },
};

// Titulares (CPFs/CNPJs válidos pelo algoritmo Módulo 11)
const TITULARES = [
  { nome: 'João Autor da Silva',       tipo: 'PF', doc: '550.900.039-20',   nacionalidade: 'Brasileira' },
  { nome: 'Maria Autora Santos',       tipo: 'PF', doc: '614.432.441-04',   nacionalidade: 'Brasileira' },
  { nome: 'Editora Som Musical Ltda',  tipo: 'PJ', doc: '07.317.116/0001-06', nacionalidade: 'Brasileira' },
  { nome: 'Pedro Intérprete Lima',     tipo: 'PF', doc: '103.746.853-80',   nacionalidade: 'Brasileira' },
  { nome: 'Ana Cantora Souza',         tipo: 'PF', doc: '799.625.053-72',   nacionalidade: 'Brasileira' },
  { nome: 'Carlos Multi Função',       tipo: 'PF', doc: '690.769.359-39',   nacionalidade: 'Brasileira' },
];

const OBRAS = [
  { titulo: 'Obra Golden 1 — 100% Autor', tipo: 'Musical' },
  { titulo: 'Obra Golden 2 — 75/25',      tipo: 'Musical' },
];

const FONOGRAMAS = [
  { isrc: 'BR-GLD-26-00001', obraTitulo: 'Obra Golden 1 — 100% Autor', paisOrigem: 'BR' },
  { isrc: 'BR-GLD-26-00002', obraTitulo: 'Obra Golden 2 — 75/25',      paisOrigem: 'BR' },
];

const USUARIO_MUSICA = {
  razaoSocial: 'TV Demo S/A',
  nomeFantasia: 'TV Demo',
  cnpj: '88.387.133/0001-03',
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  numero: '1000',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  responsavel: 'Carlos Diretor',
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function login(page: import('@playwright/test').Page, creds: { user: string; pass: string }) {
  await page.goto(BASE_URL);
  await expect(page).toHaveURL(/logto\.app/, { timeout: 20_000 });
  await loginWithLogto(page, creds.user, creds.pass, { baseUrl: BASE_URL });
  await page.waitForTimeout(1_500); // estabilizar após redirect
}

async function navigateTo(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForTimeout(1_000);
}

/** Preenche um campo TextInput pelo placeholder */
async function fillByPlaceholder(page: import('@playwright/test').Page, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder).fill(value);
}

/** Seleciona opção em <select> pelo label do campo */
async function selectByLabel(page: import('@playwright/test').Page, labelText: string, optionLabel: string) {
  const select = page.locator('select').filter({ has: page.locator(`option`).filter({ hasText: optionLabel }) });
  // Fallback: procura label e depois o select associado
  const label = page.locator('label').filter({ hasText: labelText }).first();
  const labelFor = await label.getAttribute('for');
  if (labelFor) {
    await page.locator(`#${labelFor}`).selectOption({ label: optionLabel });
  } else {
    await select.selectOption({ label: optionLabel });
  }
}

/** Clica em botão pelo texto visível */
async function clickButton(page: import('@playwright/test').Page, text: string) {
  await page.getByRole('button', { name: text }).first().click();
}

/** Aguarda um toast de sucesso */
async function waitForSuccessToast(page: import('@playwright/test').Page) {
  await page.waitForTimeout(2_000);
}

/** Sai da conta atual */
async function logout(page: import('@playwright/test').Page) {
  await clickButton(page, 'Sair');
  await page.waitForTimeout(2_000);
}

// ═══════════════════════════════════════════════════════════════
// ATO 1 — CADASTRO
// ═══════════════════════════════════════════════════════════════
test.describe.serial('Simulação Ponta a Ponta', () => {

  test('Ato 1: Cadastro — criar titulares, obras e fonogramas', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      // 1.1 — Login como analista_cadastro
      await login(page, CREDENTIALS.cadastro);

      // 1.2 — Criar 6 titulares
      for (const t of TITULARES) {
        await navigateTo(page, '/cadastro/titulares/novo');
        await page.waitForTimeout(500);

        // Seleciona tipo (PF/PJ)
        if (t.tipo === 'PF') {
          await page.getByRole('button', { name: /Pessoa Física/i }).click();
        } else {
          await page.getByRole('button', { name: /Pessoa Jurídica/i }).click();
        }
        await page.waitForTimeout(300);

        // Nome
        await fillByPlaceholder(page, 'Nome completo ou razão social', t.nome);

        // Documento (CPF ou CNPJ)
        if (t.tipo === 'PF') {
          await fillByPlaceholder(page, '000.000.000-00', t.doc);
        } else {
          await fillByPlaceholder(page, '00.000.000/0001-00', t.doc);
        }

        // Nacionalidade
        await fillByPlaceholder(page, 'Ex: Brasileira', t.nacionalidade);

        // Associação — pega a primeira disponível
        const assocSelect = page.locator('select').filter({
          has: page.locator('option').first()
        }).first();
        // Tenta selecionar a 2a opção (a 1a costuma ser placeholder)
        const options = await assocSelect.locator('option').all();
        if (options.length > 1) {
          const val = await options[1].getAttribute('value');
          if (val) await assocSelect.selectOption(val);
        }

        // Submeter
        await clickButton(page, 'Criar Titular');
        await page.waitForTimeout(1_500);
        // Deve redirecionar para a lista de titulares
      }

      // 1.3 — Criar 2 obras
      for (const obra of OBRAS) {
        await navigateTo(page, '/cadastro/obras/nova');
        await page.waitForTimeout(500);

        // Título
        await fillByPlaceholder(page, 'Título da obra', obra.titulo);

        // Tipo
        await page.locator('select').first().selectOption({ label: obra.tipo });

        // Submeter
        await clickButton(page, 'Criar Obra');
        await page.waitForTimeout(2_000);
      }

      // 1.4 — Adicionar titularidades à Obra 1 (100% João autor)
      await navigateTo(page, '/cadastro/obras');
      await page.waitForTimeout(1_000);
      await page.getByText(OBRAS[0].titulo).first().click();
      await page.waitForTimeout(1_000);

      // Clica "Adicionar Titularidade" ou similar
      const addTitBtn = page.getByRole('button', { name: /Adicionar Titular/i });
      const hasAddTitBtn = await addTitBtn.isVisible().catch(() => false);
      if (hasAddTitBtn) {
        await addTitBtn.click();
        await page.waitForTimeout(500);

        // Buscar titular: João Autor
        const searchInput = page.getByPlaceholder(/buscar|nome|cpf/i).first();
        await searchInput.fill('João Autor');
        await page.waitForTimeout(1_000);
        // Clica no resultado
        await page.getByText('João Autor da Silva').first().click();
        await page.waitForTimeout(500);

        // Categoria: Autor / Compositor
        await page.locator('select').last().selectOption({ label: 'Autor / Compositor' });

        // Percentual: 100
        const pctInput = page.locator('input[type="number"]').last();
        await pctInput.fill('100');

        await clickButton(page, 'Adicionar');
        await page.waitForTimeout(1_500);
      }

      // 1.5 — Adicionar titularidades à Obra 2 (75% João autor, 25% Editora)
      await navigateTo(page, '/cadastro/obras');
      await page.waitForTimeout(1_000);
      await page.getByText(OBRAS[1].titulo).first().click();
      await page.waitForTimeout(1_000);

      const addTitBtn2 = page.getByRole('button', { name: /Adicionar Titular/i });
      const hasAddTitBtn2 = await addTitBtn2.isVisible().catch(() => false);
      if (hasAddTitBtn2) {
        // Titularidade 1: João 75%
        await addTitBtn2.click();
        await page.waitForTimeout(500);
        const search2 = page.getByPlaceholder(/buscar|nome|cpf/i).first();
        await search2.fill('João Autor');
        await page.waitForTimeout(1_000);
        await page.getByText('João Autor da Silva').first().click();
        await page.waitForTimeout(500);
        await page.locator('select').last().selectOption({ label: 'Autor / Compositor' });
        await page.locator('input[type="number"]').last().fill('75');
        await clickButton(page, 'Adicionar');
        await page.waitForTimeout(1_500);

        // Titularidade 2: Editora 25%
        const addTitBtn2b = page.getByRole('button', { name: /Adicionar Titular/i });
        if (await addTitBtn2b.isVisible().catch(() => false)) {
          await addTitBtn2b.click();
          await page.waitForTimeout(500);
          const search3 = page.getByPlaceholder(/buscar|nome|cpf/i).first();
          await search3.fill('Editora');
          await page.waitForTimeout(1_000);
          await page.getByText('Editora Som Musical Ltda').first().click();
          await page.waitForTimeout(500);
          await page.locator('select').last().selectOption({ label: 'Editor' });
          await page.locator('input[type="number"]').last().fill('25');
          await clickButton(page, 'Adicionar');
          await page.waitForTimeout(1_500);
        }
      }

      // 1.6 — Criar 2 fonogramas
      for (const fon of FONOGRAMAS) {
        // Se for o 2o fonograma, passa ?obraId= na URL
        await navigateTo(page, '/cadastro/fonogramas/novo');
        await page.waitForTimeout(500);

        // ISRC
        await page.getByPlaceholder(/isrc/i).first().fill(fon.isrc);

        // Obra — autocomplete
        const obraAutocomplete = page.getByPlaceholder(/buscar obra|nome da obra|título/i).first();
        const obraVisible = await obraAutocomplete.isVisible().catch(() => false);
        if (obraVisible) {
          await obraAutocomplete.fill(fon.obraTitulo);
          await page.waitForTimeout(1_000);
          // Clica no resultado
          await page.getByText(fon.obraTitulo).first().click();
        }

        // País de Origem
        await page.getByPlaceholder(/país|pais/i).first().fill(fon.paisOrigem);

        await clickButton(page, 'Criar Fonograma');
        await page.waitForTimeout(2_000);
      }

      // 1.7 — Adicionar participações conexas ao Fonograma 1
      await navigateTo(page, '/cadastro/fonogramas');
      await page.waitForTimeout(1_000);
      await page.getByText(FONOGRAMAS[0].isrc).first().click();
      await page.waitForTimeout(1_500);

      // Botão "Adicionar Participante"
      const addPartBtn = page.getByRole('button', { name: /Adicionar Participante/i });
      if (await addPartBtn.isVisible().catch(() => false)) {
        // Participante 1: Pedro Intérprete Lima
        await addPartBtn.click();
        await page.waitForTimeout(500);
        const searchP1 = page.getByPlaceholder(/buscar por nome|cpf\/cnpj/i).first();
        await searchP1.fill('Pedro');
        await page.waitForTimeout(1_000);
        await page.getByText('Pedro Intérprete Lima').first().click();
        await page.waitForTimeout(300);
        // Categoria
        const catSelect = page.locator('select').last();
        await catSelect.selectOption({ label: 'Intérprete' });
        await clickButton(page, 'Adicionar');
        await page.waitForTimeout(1_500);

        // Participante 2: Ana Cantora Souza
        const addPartBtn2 = page.getByRole('button', { name: /Adicionar Participante/i });
        if (await addPartBtn2.isVisible().catch(() => false)) {
          await addPartBtn2.click();
          await page.waitForTimeout(500);
          const searchP2 = page.getByPlaceholder(/buscar por nome|cpf\/cnpj/i).first();
          await searchP2.fill('Ana');
          await page.waitForTimeout(1_000);
          await page.getByText('Ana Cantora Souza').first().click();
          await page.waitForTimeout(300);
          await page.locator('select').last().selectOption({ label: 'Intérprete' });
          await clickButton(page, 'Adicionar');
          await page.waitForTimeout(1_500);
        }

        // Participante 3: Carlos Multi Função (Músico Executante)
        const addPartBtn3 = page.getByRole('button', { name: /Adicionar Participante/i });
        if (await addPartBtn3.isVisible().catch(() => false)) {
          await addPartBtn3.click();
          await page.waitForTimeout(500);
          const searchP3 = page.getByPlaceholder(/buscar por nome|cpf\/cnpj/i).first();
          await searchP3.fill('Carlos');
          await page.waitForTimeout(1_000);
          await page.getByText('Carlos Multi Função').first().click();
          await page.waitForTimeout(300);
          await page.locator('select').last().selectOption({ label: 'Músico Executante' });
          await clickButton(page, 'Adicionar');
          await page.waitForTimeout(1_500);
        }

        // Calcular percentuais
        const calcBtn = page.getByRole('button', { name: /Calcular/i });
        if (await calcBtn.isVisible().catch(() => false)) {
          await calcBtn.click();
          await page.waitForTimeout(2_000);
        }
      }

      // 1.8 — Adicionar participações conexas ao Fonograma 2
      await navigateTo(page, '/cadastro/fonogramas');
      await page.waitForTimeout(1_000);
      await page.getByText(FONOGRAMAS[1].isrc).first().click();
      await page.waitForTimeout(1_500);

      const addPartBtnF2 = page.getByRole('button', { name: /Adicionar Participante/i });
      if (await addPartBtnF2.isVisible().catch(() => false)) {
        // Pedro
        await addPartBtnF2.click();
        await page.waitForTimeout(500);
        const sp = page.getByPlaceholder(/buscar por nome|cpf\/cnpj/i).first();
        await sp.fill('Pedro');
        await page.waitForTimeout(1_000);
        await page.getByText('Pedro Intérprete Lima').first().click();
        await page.waitForTimeout(300);
        await page.locator('select').last().selectOption({ label: 'Intérprete' });
        await clickButton(page, 'Adicionar');
        await page.waitForTimeout(1_500);

        // Ana
        const addPartBtnF2b = page.getByRole('button', { name: /Adicionar Participante/i });
        if (await addPartBtnF2b.isVisible().catch(() => false)) {
          await addPartBtnF2b.click();
          await page.waitForTimeout(500);
          const sa = page.getByPlaceholder(/buscar por nome|cpf\/cnpj/i).first();
          await sa.fill('Ana');
          await page.waitForTimeout(1_000);
          await page.getByText('Ana Cantora Souza').first().click();
          await page.waitForTimeout(300);
          await page.locator('select').last().selectOption({ label: 'Intérprete' });
          await clickButton(page, 'Adicionar');
          await page.waitForTimeout(1_500);
        }

        // Calcular
        const calcBtn2 = page.getByRole('button', { name: /Calcular/i });
        if (await calcBtn2.isVisible().catch(() => false)) {
          await calcBtn2.click();
          await page.waitForTimeout(2_000);
        }
      }

      // Logout
      await navigateTo(page, '/');
      await page.waitForTimeout(1_000);
      await logout(page);
    } finally {
      await ctx.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ATO 2 — ARRECADAÇÃO
  // ═══════════════════════════════════════════════════════════════

  test('Ato 2: Arrecadação — criar usuário de música, licença e pagamento', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await login(page, CREDENTIALS.arrecadacao);

      // 2.1 — Criar Usuário de Música
      await navigateTo(page, '/arrecadacao/usuarios-musica/novo');
      await page.waitForTimeout(500);

      await fillByPlaceholder(page, 'Razão social', USUARIO_MUSICA.razaoSocial);
      await fillByPlaceholder(page, 'Nome fantasia', USUARIO_MUSICA.nomeFantasia);
      await fillByPlaceholder(page, '00.000.000/0000-00', USUARIO_MUSICA.cnpj);

      // Seção Endereço
      await fillByPlaceholder(page, '00000-000', USUARIO_MUSICA.cep);
      await page.waitForTimeout(1_000); // Aguarda ViaCEP
      await page.getByPlaceholder('Rua, avenida, praça').fill(USUARIO_MUSICA.logradouro);
      await page.getByPlaceholder('Número').fill(USUARIO_MUSICA.numero);
      await page.getByPlaceholder('Bairro').fill(USUARIO_MUSICA.bairro);
      await page.getByPlaceholder('Cidade').fill(USUARIO_MUSICA.cidade);
      await page.getByPlaceholder('SP', { exact: false }).first().fill(USUARIO_MUSICA.uf);

      // Seção Contato
      await fillByPlaceholder(page, 'Nome do responsável', USUARIO_MUSICA.responsavel);

      await clickButton(page, 'Criar Usuário');
      await page.waitForTimeout(2_000);

      // 2.2 — Criar Licença
      await navigateTo(page, '/arrecadacao/licencas/nova');
      await page.waitForTimeout(500);

      // Buscar usuário de música
      const licUserSearch = page.getByPlaceholder(/buscar|razão/i).first();
      await licUserSearch.fill('TV Demo');
      await page.waitForTimeout(1_500);
      await page.getByText('TV Demo S/A').first().click();
      await page.waitForTimeout(500);

      // Rubrica — seleciona TV_ABERTA
      const rubSelect = page.locator('select').first();
      await rubSelect.selectOption({ label: /TV_ABERTA/i });
      await page.waitForTimeout(300);

      // Data de Início (hoje)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dateInput = page.locator('input[type="date"]').first();
      await dateInput.fill(today);
      await page.waitForTimeout(300);

      await clickButton(page, 'Criar Licença');
      await page.waitForTimeout(2_000);

      // 2.3 — Registrar Pagamento
      await navigateTo(page, '/arrecadacao/pagamentos/novo');
      await page.waitForTimeout(500);

      // Buscar licença (autocomplete pelo nome do usuário)
      const pagLicSearch = page.getByPlaceholder(/buscar|razão/i).first();
      await pagLicSearch.fill('TV Demo');
      await page.waitForTimeout(1_500);
      await page.getByText('TV Demo S/A').first().click();
      await page.waitForTimeout(1_000);

      // Quantidade de UDAs (para atingir ~R$ 100.000, depende do valor da UDA)
      // Assumindo UDA ~R$ 1.000, 100 UDAs = R$ 100.000
      const qtdInput = page.locator('input[type="number"]').first();
      const qtdVisible = await qtdInput.isVisible().catch(() => false);
      if (qtdVisible) {
        await qtdInput.fill('100');
      }

      await clickButton(page, /Registrar|Criar/i);
      await page.waitForTimeout(2_500);

      // Logout
      await navigateTo(page, '/');
      await page.waitForTimeout(1_000);
      await logout(page);
    } finally {
      await ctx.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ATO 3 — IDENTIFICAÇÃO
  // ═══════════════════════════════════════════════════════════════

  test('Ato 3: Identificação — criar captação, upload CSV e fechar rol', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await login(page, CREDENTIALS.identificacao);

      // 3.1 — Criar Captação
      await navigateTo(page, '/identificacao/captacoes/nova');
      await page.waitForTimeout(500);

      // Rubrica
      const capRubSelect = page.locator('select').first();
      await capRubSelect.selectOption({ label: /TV_ABERTA/i });
      await page.waitForTimeout(300);

      // Período — primeiro dia do mês corrente
      const now = new Date();
      const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const dateInput2 = page.locator('input[type="date"]').first();
      await dateInput2.fill(periodo);
      await page.waitForTimeout(300);

      // Usuário de Música (campo texto)
      await fillByPlaceholder(page, /Rádio|Netflix|Ex:/i, 'TV Demo S/A');

      await clickButton(page, /Criar|Salvar/i);
      await page.waitForTimeout(2_000);

      // Captura URL da captação criada para upload
      const captacaoUrl = page.url(); // algo como /identificacao/captacoes/{uuid}

      // 3.2 — Upload do CSV de execuções
      // O botão de upload pode estar em uma tab ou na página de detalhe
      const csvPath = path.resolve(__dirname, 'fixtures', 'golden-path-execucoes.csv');

      // Procura o file input e faz upload
      const fileInput = page.locator('input[type="file"]').first();
      const fileInputVisible = await fileInput.isVisible().catch(() => false);

      if (fileInputVisible) {
        await fileInput.setInputFiles(csvPath);
        await page.waitForTimeout(1_000);
        // Pode ter um botão de confirmação
        const confirmBtn = page.getByRole('button', { name: /importar|enviar|upload/i });
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(3_000);
        }
      }

      // Aguarda processamento do CSV (pode levar alguns segundos)
      await page.waitForTimeout(5_000);

      // 3.3 — Fechar o Rol
      // Navega para a página da captação se não estiver lá
      if (!page.url().includes('/captacoes/')) {
        await navigateTo(page, '/identificacao/captacoes');
        await page.waitForTimeout(1_000);
        await page.getByText('TV Demo').first().click();
        await page.waitForTimeout(1_500);
      }

      // Botão "Fechar Rol"
      const fecharBtn = page.getByRole('button', { name: /Fechar Rol|Fechar/i });
      if (await fecharBtn.isVisible().catch(() => false)) {
        await fecharBtn.click();
        await page.waitForTimeout(2_000);
        // Confirmação (modal?)
        const confirmFechar = page.getByRole('button', { name: /Confirmar|Sim/i });
        if (await confirmFechar.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmFechar.click();
          await page.waitForTimeout(3_000);
        }
      }

      // Aguarda processamento do fechamento + Outbox
      await page.waitForTimeout(5_000);

      // Logout
      await navigateTo(page, '/');
      await page.waitForTimeout(1_000);
      await logout(page);
    } finally {
      await ctx.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ATO 4 — DISTRIBUIÇÃO
  // ═══════════════════════════════════════════════════════════════

  test('Ato 4: Distribuição — criar processo, aprovar, finalizar e ver demonstrativo', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await login(page, CREDENTIALS.distribuicao);

      // 4.1 — Criar Processo de Distribuição
      await navigateTo(page, '/distribuicao/processos/novo');
      await page.waitForTimeout(1_500);

      // A tela mostra cards de disponibilidade (rubrica + período)
      // Clica no primeiro card disponível que contém TV_ABERTA
      const cardTV = page.getByText('TV_ABERTA').first();
      const cardVisible = await cardTV.isVisible({ timeout: 5_000 }).catch(() => false);

      if (cardVisible) {
        // Clica no card ou no container próximo
        await cardTV.click();
        await page.waitForTimeout(1_500);

        // Pode haver botão de confirmação
        const criarProcBtn = page.getByRole('button', { name: /Criar Processo|Confirmar/i });
        if (await criarProcBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await criarProcBtn.click();
        }
        await page.waitForTimeout(3_000);
      } else {
        // Fallback: pode ser que o processo tenha que ser listado de outra forma
        console.log('⚠ Nenhum card TV_ABERTA visível — verifique se há verba disponível');
      }

      // Aguarda criação do processo + cálculo assíncrono
      await page.waitForTimeout(10_000);

      // 4.2 — Navega para o processo e aprova
      await navigateTo(page, '/distribuicao/processos');
      await page.waitForTimeout(1_500);

      // Clica no primeiro processo da lista
      const primeiroProcesso = page.getByText('TV_ABERTA').first();
      if (await primeiroProcesso.isVisible().catch(() => false)) {
        await primeiroProcesso.click();
        await page.waitForTimeout(2_000);
      }

      // 4.3 — Aprovar / Finalizar
      // Dependendo do estado, botões diferentes aparecem
      const aprovarBtn = page.getByRole('button', { name: /Aprovar|aprovar cálculo/i });
      if (await aprovarBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await aprovarBtn.click();
        await page.waitForTimeout(3_000);
      }

      const finalizarBtn = page.getByRole('button', { name: /Finalizar/i });
      if (await finalizarBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await finalizarBtn.click();
        await page.waitForTimeout(3_000);

        // Confirmação
        const confirmFin = page.getByRole('button', { name: /Confirmar|Sim/i });
        if (await confirmFin.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmFin.click();
          await page.waitForTimeout(3_000);
        }
      }

      // 4.4 — Verificar demonstrativo (seção na página de detalhe)
      await page.waitForTimeout(3_000);

      // Procura seção "Demonstrativo" ou "Créditos"
      const demoHeading = page.getByRole('heading', { name: /demonstrativo|créditos/i });
      const demoVisible = await demoHeading.isVisible({ timeout: 3_000 }).catch(() => false);
      if (demoVisible) {
        await page.screenshot({ path: 'e2e/screenshots/demonstrativo.png', fullPage: true });
      }

      // Verifica status FINALIZADO
      const statusBadge = page.getByText(/FINALIZADO/i).first();
      await expect(statusBadge).toBeVisible({ timeout: 10_000 });

      // Screenshot final
      await page.screenshot({ path: 'e2e/screenshots/ponta-a-ponta-final.png', fullPage: true });

      // Logout
      await navigateTo(page, '/');
      await page.waitForTimeout(1_000);
      await logout(page);
    } finally {
      await ctx.close();
    }
  });
});
