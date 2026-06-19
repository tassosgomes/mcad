import fs from 'fs';

// Configurações da API de Cadastro
const CADASTRO_API_URL = process.env.CADASTRO_API_URL || 'https://mcad-cadastro.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN;
if (!JWT_TOKEN) { console.error('[ERRO] JWT_TOKEN env var é obrigatória. Export JWT_TOKEN=<token> antes de rodar.'); process.exit(1); }

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

// Carregar o mapa de fonogramas criados pelo script 03
let fonogramasImportados = [];
try {
  if (fs.existsSync(new URL('mapas.json', import.meta.url))) {
    const mapas = JSON.parse(fs.readFileSync(new URL('mapas.json', import.meta.url), 'utf8'));
    fonogramasImportados = Object.values(mapas.fonogramas || {});
    console.log(`Carregados ${fonogramasImportados.length} fonogramas do mapa local.`);
  }
} catch (e) {
  console.log('Arquivo mapas.json não encontrado. Você pode querer adaptar para listar via API.');
}

async function liberarFonogramas() {
  console.log('\n--- Iniciando Liberação de Fonogramas ---');
  
  if (fonogramasImportados.length === 0) {
      console.log('Nenhum fonograma no mapa para liberar.');
      return;
  }

  for (const fonogramaId of fonogramasImportados) {
      try {
          // Preenche a URL de áudio (pré-requisito para liberar)
          const resUrl = await fetch(`${CADASTRO_API_URL}/fonogramas/${fonogramaId}/url-audio`, {
              method: 'PATCH',
              headers: authHeaders,
              body: JSON.stringify({ url: "https://example.com/audio-musicbrainz-fake.mp3" })
          });
          if (!resUrl.ok) {
              console.warn(`[AVISO] Falha ao definir URL de áudio para fonograma ${fonogramaId}:`, await resUrl.text());
          }

          const res = await fetch(`${CADASTRO_API_URL}/fonogramas/${fonogramaId}/liberar`, {
              method: 'POST',
              headers: authHeaders
          });

          if (res.ok) {
              console.log(`[OK] Fonograma ${fonogramaId} Liberado com sucesso!`);
          } else {
              const erro = await res.text();
              console.warn(`[AVISO] Falha ao liberar fonograma ${fonogramaId}:`, erro);
          }
      } catch (err) {
          console.error(`[ERRO] Request de liberação para fonograma ${fonogramaId}:`, err.message);
      }
  }
  
  console.log('\nProcesso finalizado.');
}

liberarFonogramas();