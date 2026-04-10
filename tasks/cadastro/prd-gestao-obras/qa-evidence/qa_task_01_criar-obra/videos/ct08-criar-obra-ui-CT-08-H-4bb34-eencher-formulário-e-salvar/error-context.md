# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ct08-criar-obra-ui.spec.ts >> CT-08: HU-01 — Criar obra musical via UI >> CT-08: Navegar para /cadastro/obras/nova, preencher formulário e salvar
- Location: ct08-criar-obra-ui.spec.ts:31:7

# Error details

```
Error: Obra criada não encontrada na listagem
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - button "Menu" [ref=e6] [cursor=pointer]:
          - img [ref=e7]
        - generic [ref=e8]:
          - heading "mini-ECAD" [level=1] [ref=e9]
          - generic [ref=e10]: Sistema de Gestão de Direitos Autorais
      - generic [ref=e11]:
        - generic [ref=e12]: Analista Teste
        - generic [ref=e13]: Analista de Cadastro
        - button "Sair" [ref=e14] [cursor=pointer]:
          - img [ref=e15]
    - complementary [ref=e18]:
      - navigation [ref=e19]:
        - generic [ref=e20]:
          - button "Cadastro" [ref=e21] [cursor=pointer]:
            - generic [ref=e22]:
              - img [ref=e23]
              - generic [ref=e27]: Cadastro
            - img [ref=e28]
          - generic [ref=e30]:
            - link "Associações" [ref=e31] [cursor=pointer]:
              - /url: /cadastro/associacoes
            - link "Titulares" [ref=e32] [cursor=pointer]:
              - /url: /cadastro/titulares
            - link "Obras" [ref=e33] [cursor=pointer]:
              - /url: /cadastro/obras
            - link "Fonogramas" [ref=e34] [cursor=pointer]:
              - /url: /cadastro/fonogramas
        - button "Distribuição" [disabled] [ref=e36]:
          - generic [ref=e37]:
            - img [ref=e38]
            - generic [ref=e43]: Distribuição
    - main [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]:
            - heading "Obras Musicais" [level=1] [ref=e48]
            - paragraph [ref=e49]: Gestão de obras musicais, metadados e códigos ISWC.
          - button "Nova Obra" [ref=e51] [cursor=pointer]:
            - img [ref=e52]
            - text: Nova Obra
        - generic [ref=e53]:
          - textbox "Filtrar por título" [ref=e55]:
            - /placeholder: Buscar por título...
          - spinbutton "Filtrar por código" [ref=e57]
          - textbox "Filtrar por ISWC" [ref=e59]:
            - /placeholder: ISWC
          - combobox "Filtrar por tipo" [ref=e61] [cursor=pointer]:
            - option "Todos os tipos" [disabled] [selected]
            - option "Musical"
            - option "Literomusical"
            - option "Versão"
            - option "Pot-pourri"
          - combobox "Filtrar por status" [ref=e63] [cursor=pointer]:
            - option "Todos os status" [disabled] [selected]
            - option "Pendente"
            - option "Liberado"
            - option "Bloqueado"
            - option "Domínio Público"
            - option "Depurada"
          - textbox "Filtrar por gênero" [ref=e65]:
            - /placeholder: Buscar por gênero...
        - table [ref=e67]:
          - rowgroup [ref=e68]:
            - row "CÓDIGO TÍTULO TIPO GÊNERO ISWC STATUS Ações" [ref=e69]:
              - columnheader "CÓDIGO" [ref=e70]:
                - button "CÓDIGO" [ref=e71] [cursor=pointer]:
                  - text: CÓDIGO
                  - img [ref=e72]
              - columnheader "TÍTULO" [ref=e75]:
                - button "TÍTULO" [ref=e76] [cursor=pointer]:
                  - text: TÍTULO
                  - img [ref=e77]
              - columnheader "TIPO" [ref=e79]:
                - button "TIPO" [ref=e80] [cursor=pointer]:
                  - text: TIPO
                  - img [ref=e81]
              - columnheader "GÊNERO" [ref=e84]
              - columnheader "ISWC" [ref=e85]
              - columnheader "STATUS" [ref=e86]:
                - button "STATUS" [ref=e87] [cursor=pointer]:
                  - text: STATUS
                  - img [ref=e88]
              - columnheader "Ações" [ref=e91]
          - rowgroup [ref=e92]:
            - row "#8 Garota de Ipanema The Girl from Ipanema MUSICAL Bossa Nova — PENDENTE Editar Garota de Ipanema Excluir Garota de Ipanema" [ref=e93]:
              - cell "#8" [ref=e94]:
                - generic [ref=e95]: "#8"
              - cell "Garota de Ipanema The Girl from Ipanema" [ref=e96]:
                - text: Garota de Ipanema
                - generic [ref=e97]: The Girl from Ipanema
              - cell "MUSICAL" [ref=e98]:
                - generic [ref=e99]: MUSICAL
              - cell "Bossa Nova" [ref=e100]
              - cell "—" [ref=e101]
              - cell "PENDENTE" [ref=e102]:
                - generic [ref=e103]: PENDENTE
              - cell "Editar Garota de Ipanema Excluir Garota de Ipanema" [ref=e104]:
                - generic [ref=e105]:
                  - button "Editar Garota de Ipanema" [ref=e106] [cursor=pointer]:
                    - img [ref=e107]
                  - button "Excluir Garota de Ipanema" [ref=e110] [cursor=pointer]:
                    - img [ref=e111]
            - row "#7 Meu Bem Querer LITEROMUSICAL — — PENDENTE Editar Meu Bem Querer Excluir Meu Bem Querer" [ref=e114]:
              - cell "#7" [ref=e115]:
                - generic [ref=e116]: "#7"
              - cell "Meu Bem Querer" [ref=e117]
              - cell "LITEROMUSICAL" [ref=e118]:
                - generic [ref=e119]: LITEROMUSICAL
              - cell "—" [ref=e120]
              - cell "—" [ref=e121]
              - cell "PENDENTE" [ref=e122]:
                - generic [ref=e123]: PENDENTE
              - cell "Editar Meu Bem Querer Excluir Meu Bem Querer" [ref=e124]:
                - generic [ref=e125]:
                  - button "Editar Meu Bem Querer" [ref=e126] [cursor=pointer]:
                    - img [ref=e127]
                  - button "Excluir Meu Bem Querer" [ref=e130] [cursor=pointer]:
                    - img [ref=e131]
            - row "#5 Meu Bem Querer LITEROMUSICAL — — PENDENTE Editar Meu Bem Querer Excluir Meu Bem Querer" [ref=e134]:
              - cell "#5" [ref=e135]:
                - generic [ref=e136]: "#5"
              - cell "Meu Bem Querer" [ref=e137]
              - cell "LITEROMUSICAL" [ref=e138]:
                - generic [ref=e139]: LITEROMUSICAL
              - cell "—" [ref=e140]
              - cell "—" [ref=e141]
              - cell "PENDENTE" [ref=e142]:
                - generic [ref=e143]: PENDENTE
              - cell "Editar Meu Bem Querer Excluir Meu Bem Querer" [ref=e144]:
                - generic [ref=e145]:
                  - button "Editar Meu Bem Querer" [ref=e146] [cursor=pointer]:
                    - img [ref=e147]
                  - button "Excluir Meu Bem Querer" [ref=e150] [cursor=pointer]:
                    - img [ref=e151]
            - row "#6 Meu Bem Querer Debug LITEROMUSICAL — — PENDENTE Editar Meu Bem Querer Debug Excluir Meu Bem Querer Debug" [ref=e154]:
              - cell "#6" [ref=e155]:
                - generic [ref=e156]: "#6"
              - cell "Meu Bem Querer Debug" [ref=e157]
              - cell "LITEROMUSICAL" [ref=e158]:
                - generic [ref=e159]: LITEROMUSICAL
              - cell "—" [ref=e160]
              - cell "—" [ref=e161]
              - cell "PENDENTE" [ref=e162]:
                - generic [ref=e163]: PENDENTE
              - cell "Editar Meu Bem Querer Debug Excluir Meu Bem Querer Debug" [ref=e164]:
                - generic [ref=e165]:
                  - button "Editar Meu Bem Querer Debug" [ref=e166] [cursor=pointer]:
                    - img [ref=e167]
                  - button "Excluir Meu Bem Querer Debug" [ref=e170] [cursor=pointer]:
                    - img [ref=e171]
            - row "#1 Obra de Teste Sub Obra de Teste → ver nova versão MUSICAL Rock T-151731242-3 DEPURADA Editar Obra de Teste Excluir Obra de Teste" [ref=e174]:
              - cell "#1" [ref=e175]:
                - generic [ref=e176]: "#1"
              - cell "Obra de Teste Sub Obra de Teste → ver nova versão" [ref=e177]:
                - text: Obra de Teste
                - generic [ref=e178]: Sub Obra de Teste
                - link "→ ver nova versão" [ref=e179] [cursor=pointer]:
                  - /url: /obras/c49adc4e-2aa1-4386-8ee4-121c91e3b901
              - cell "MUSICAL" [ref=e180]:
                - generic [ref=e181]: MUSICAL
              - cell "Rock" [ref=e182]
              - cell "T-151731242-3" [ref=e183]
              - cell "DEPURADA" [ref=e184]:
                - generic [ref=e185]: DEPURADA
              - cell "Editar Obra de Teste Excluir Obra de Teste" [ref=e186]:
                - generic [ref=e187]:
                  - button "Editar Obra de Teste" [ref=e188] [cursor=pointer]:
                    - img [ref=e189]
                  - button "Excluir Obra de Teste" [disabled] [ref=e192]:
                    - img [ref=e193]
            - row "#2 Obra de Teste Depurar Sub Obra de Teste MUSICAL Rock T-334367645-6 LIBERADO Editar Obra de Teste Depurar Excluir Obra de Teste Depurar" [ref=e196]:
              - cell "#2" [ref=e197]:
                - generic [ref=e198]: "#2"
              - cell "Obra de Teste Depurar Sub Obra de Teste" [ref=e199]:
                - text: Obra de Teste Depurar
                - generic [ref=e200]: Sub Obra de Teste
              - cell "MUSICAL" [ref=e201]:
                - generic [ref=e202]: MUSICAL
              - cell "Rock" [ref=e203]
              - cell "T-334367645-6" [ref=e204]
              - cell "LIBERADO" [ref=e205]:
                - generic [ref=e206]: LIBERADO
              - cell "Editar Obra de Teste Depurar Excluir Obra de Teste Depurar" [ref=e207]:
                - generic [ref=e208]:
                  - button "Editar Obra de Teste Depurar" [ref=e209] [cursor=pointer]:
                    - img [ref=e210]
                  - button "Excluir Obra de Teste Depurar" [ref=e213] [cursor=pointer]:
                    - img [ref=e214]
            - row "#9 Obra Via Interface MUSICAL — — PENDENTE Editar Obra Via Interface Excluir Obra Via Interface" [ref=e217]:
              - cell "#9" [ref=e218]:
                - generic [ref=e219]: "#9"
              - cell "Obra Via Interface" [ref=e220]
              - cell "MUSICAL" [ref=e221]:
                - generic [ref=e222]: MUSICAL
              - cell "—" [ref=e223]
              - cell "—" [ref=e224]
              - cell "PENDENTE" [ref=e225]:
                - generic [ref=e226]: PENDENTE
              - cell "Editar Obra Via Interface Excluir Obra Via Interface" [ref=e227]:
                - generic [ref=e228]:
                  - button "Editar Obra Via Interface" [ref=e229] [cursor=pointer]:
                    - img [ref=e230]
                  - button "Excluir Obra Via Interface" [ref=e233] [cursor=pointer]:
                    - img [ref=e234]
        - generic [ref=e237]:
          - generic [ref=e238]:
            - text: Mostrando
            - strong [ref=e239]: 1–7
            - text: de
            - strong [ref=e240]: "7"
          - generic [ref=e241]:
            - button "Página anterior" [disabled] [ref=e242]:
              - img [ref=e243]
              - text: Anterior
            - generic [ref=e245]: 1 / 1
            - button "Próxima página" [disabled] [ref=e246]:
              - text: Próximo
              - img [ref=e247]
  - generic "Notificações" [ref=e249]:
    - alert [ref=e250]:
      - img [ref=e251]
      - generic [ref=e254]: Obra criada com sucesso
      - button "Fechar notificação" [ref=e255] [cursor=pointer]:
        - img [ref=e256]
```

# Test source

```ts
  88  |     }
  89  | 
  90  |     // Navegar diretamente para a rota de criação de obra
  91  |     await page.goto(`${BASE_URL}/cadastro/obras/nova`);
  92  |     await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  93  | 
  94  |     await page.screenshot({
  95  |       path: path.join(SCREENSHOTS_DIR, 'ct08_04_pagina_nova_obra.png'),
  96  |       fullPage: true,
  97  |     });
  98  |     appendLog(`URL na página de criação: ${page.url()}`);
  99  | 
  100 |     // Verificar se o formulário está visível
  101 |     const tituloInput = page.locator('#obra-titulo');
  102 |     const tipoSelect = page.locator('#obra-tipo');
  103 | 
  104 |     const tituloVisible = await tituloInput.isVisible({ timeout: 10000 }).catch(() => false);
  105 |     appendLog(`Campo título visível: ${tituloVisible}`);
  106 | 
  107 |     if (!tituloVisible) {
  108 |       await page.screenshot({
  109 |         path: path.join(SCREENSHOTS_DIR, 'ct08_fail_formulario_nao_encontrado.png'),
  110 |         fullPage: true,
  111 |       });
  112 |       appendLog('--- RESULTADO: FAIL ---');
  113 |       appendLog(`Expected: Formulário de criação de obra visível em ${BASE_URL}/cadastro/obras/nova`);
  114 |       appendLog(`Actual: Campo #obra-titulo não encontrado. URL atual: ${page.url()}`);
  115 |       if (consoleLogs.length > 0 || pageErrors.length > 0) {
  116 |         appendLog('--- BROWSER CONSOLE CT-08 ---');
  117 |         [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
  118 |       }
  119 |       throw new Error('Formulário de criação não encontrado');
  120 |     }
  121 | 
  122 |     // Preencher o formulário
  123 |     await tituloInput.fill('Obra Via Interface');
  124 |     appendLog('Campo título preenchido: "Obra Via Interface"');
  125 | 
  126 |     // Selecionar tipo MUSICAL
  127 |     await tipoSelect.selectOption('MUSICAL');
  128 |     appendLog('Tipo selecionado: MUSICAL');
  129 | 
  130 |     await page.screenshot({
  131 |       path: path.join(SCREENSHOTS_DIR, 'ct08_05_formulario_preenchido.png'),
  132 |       fullPage: true,
  133 |     });
  134 | 
  135 |     // Clicar em Salvar
  136 |     const saveButton = page.locator('button[type="submit"]');
  137 |     await saveButton.click();
  138 |     appendLog('Botão Salvar clicado');
  139 | 
  140 |     // Aguardar redirecionamento para /cadastro/obras
  141 |     await page.waitForURL('**/cadastro/obras', { timeout: 15000 }).catch(async () => {
  142 |       appendLog(`URL após submit (sem redirect): ${page.url()}`);
  143 |     });
  144 | 
  145 |     await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  146 | 
  147 |     await page.screenshot({
  148 |       path: path.join(SCREENSHOTS_DIR, 'ct08_06_pos_submit.png'),
  149 |       fullPage: true,
  150 |     });
  151 | 
  152 |     const finalUrl = page.url();
  153 |     appendLog(`URL final após submit: ${finalUrl}`);
  154 | 
  155 |     // Assertion: deve ter redirecionado para /cadastro/obras
  156 |     const redirectedToList = finalUrl.includes('/cadastro/obras') && !finalUrl.includes('/nova');
  157 | 
  158 |     if (!redirectedToList) {
  159 |       appendLog('--- RESULTADO: FAIL ---');
  160 |       appendLog('Expected: Redirecionamento para /cadastro/obras após salvar');
  161 |       appendLog(`Actual: URL final = ${finalUrl}`);
  162 |       if (consoleLogs.length > 0 || pageErrors.length > 0) {
  163 |         appendLog('--- BROWSER CONSOLE CT-08 ---');
  164 |         [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
  165 |       }
  166 |       throw new Error(`Redirecionamento esperado para /cadastro/obras, mas URL é: ${finalUrl}`);
  167 |     }
  168 | 
  169 |     // Verificar que a obra aparece na listagem
  170 |     const obraItem = page.locator('text=Obra Via Interface');
  171 |     const obraVisivel = await obraItem.isVisible({ timeout: 8000 }).catch(() => false);
  172 |     appendLog(`Obra "Obra Via Interface" visível na listagem: ${obraVisivel}`);
  173 | 
  174 |     await page.screenshot({
  175 |       path: path.join(SCREENSHOTS_DIR, 'ct08_07_listagem_com_obra.png'),
  176 |       fullPage: true,
  177 |     });
  178 | 
  179 |     if (consoleLogs.length > 0 || pageErrors.length > 0) {
  180 |       appendLog('--- BROWSER CONSOLE CT-08 ---');
  181 |       [...consoleLogs, ...pageErrors].forEach(l => appendLog(l));
  182 |     }
  183 | 
  184 |     if (!obraVisivel) {
  185 |       appendLog('--- RESULTADO: FAIL ---');
  186 |       appendLog('Expected: Obra "Obra Via Interface" visível na listagem após criação');
  187 |       appendLog('Actual: Obra não encontrada na listagem. Pode ser paginação ou filtro ativo.');
> 188 |       throw new Error('Obra criada não encontrada na listagem');
      |             ^ Error: Obra criada não encontrada na listagem
  189 |     }
  190 | 
  191 |     appendLog('--- RESULTADO: PASS ---');
  192 |     appendLog(`Redirecionamento para listagem: OK (${finalUrl})`);
  193 |     appendLog('Obra visível na listagem: OK');
  194 |   });
  195 | });
  196 | 
```