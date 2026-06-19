import fs from 'fs';

// Configurações da API de Cadastro
const CADASTRO_API_URL = process.env.CADASTRO_API_URL || 'https://mcad-cadastro.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN;
if (!JWT_TOKEN) { console.error('[ERRO] JWT_TOKEN env var é obrigatória. Export JWT_TOKEN=<token> antes de rodar.'); process.exit(1); }

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

// Carregar o mapa de obras criadas pelo script 01 (opcional, para focar só nas importadas)
let obrasImportadas = [];
try {
  if (fs.existsSync(new URL('mapas.json', import.meta.url))) {
    const mapas = JSON.parse(fs.readFileSync(new URL('mapas.json', import.meta.url), 'utf8'));
    obrasImportadas = Object.values(mapas.obras || {});
    console.log(`Carregadas ${obrasImportadas.length} obras do mapa local.`);
  }
} catch (e) {
  console.log('Arquivo mapas.json não encontrado. Prosseguindo...');
}

async function gerarIswc() {
  console.log('\n--- Iniciando Geração de ISWC para Obras ---');
  
  // Estratégia 1: Usar os IDs do mapas.json
  // Estratégia 2: Fazer um GET /obras?status=PENDENTE e varrer a lista.
  // Vamos implementar a busca na API (mais robusta caso o script 01 não tenha salvo o JSON)
  
  try {
    // Fazendo um GET na API para listar as obras pendentes (pode precisar de paginação)
    console.log('Buscando obras PENDENTES na API...');
    const resLista = await fetch(`${CADASTRO_API_URL}/obras`, { headers: authHeaders });
    if (!resLista.ok) {
        throw new Error(`Falha ao listar obras: ${resLista.status} ${await resLista.text()}`);
    }
    
    // A resposta é paginada e os itens vêm na propriedade "data" (camelCase padrão do .NET) ou "Data"
    const jsonResp = await resLista.json();
    const obras = jsonResp.data || jsonResp.Data || jsonResp.items || jsonResp; 

    if (!Array.isArray(obras)) {
         throw new Error("Não foi possível encontrar o array de obras na resposta: " + JSON.stringify(jsonResp));
    }
    
    const obrasPendentes = obras.filter(o => o.status === 'PENDENTE');
    console.log(`Encontradas ${obrasPendentes.length} obras com status PENDENTE no total.`);

    // Opcional: filtrar apenas as que nós importamos
    const obrasParaProcessar = obrasImportadas.length > 0 
        ? obrasPendentes.filter(o => obrasImportadas.includes(o.id))
        : obrasPendentes;

    console.log(`Processando a geração de ISWC para ${obrasParaProcessar.length} obras...`);

    for (const obra of obrasParaProcessar) {
        try {
            const resIswc = await fetch(`${CADASTRO_API_URL}/obras/${obra.id}/iswc`, {
                method: 'POST',
                headers: authHeaders
            });

            if (resIswc.ok) {
                // A API pode retornar 200 OK com o JSON atualizado, ou 204 No Content
                const contentType = resIswc.headers.get('content-type');
                let result = 'OK';
                if (contentType && contentType.includes('application/json')) {
                    const json = await resIswc.json();
                    result = `ISWC: ${json.iswc}`;
                }
                console.log(`[OK] Obra ${obra.id} -> ${result}. Status atualizado para LIBERADO.`);
            } else {
                const erro = await resIswc.text();
                console.warn(`[AVISO] Falha ao gerar ISWC para a obra ${obra.id}:`, erro);
            }
        } catch (err) {
            console.error(`[ERRO] Request ISWC para obra ${obra.id}:`, err.message);
        }
    }
    
    console.log('\nProcesso de geração de ISWC finalizado.');
  } catch (error) {
    console.error('Erro na execução principal:', error);
  }
}

gerarIswc();