import fs from 'fs';

// --- CONFIGURAÇÕES ---
const CADASTRO_API_URL = process.env.CADASTRO_API_URL || 'https://mcad-cadastro.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN;
if (!JWT_TOKEN) { console.error('[ERRO] JWT_TOKEN env var é obrigatória. Export JWT_TOKEN=<token> antes de rodar.'); process.exit(1); }
const MB_USER_AGENT = 'MCAD-Test-Importer/1.0 ( tsgomes@example.com )';
const MAX_OBRAS_PARA_IMPORTAR = 1000;

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

// Estrutura inicial com Checkpoint (state)
let mapas = { titulares: {}, obras: {}, fonogramas: {}, state: { script01_offset: 0 } };

if (fs.existsSync(new URL('mapas.json', import.meta.url))) {
    mapas = { ...mapas, ...JSON.parse(fs.readFileSync(new URL('mapas.json', import.meta.url), 'utf8')) };
    mapas.state = mapas.state || { script01_offset: 0 };
}

function salvarMapas() {
    fs.writeFileSync(new URL('mapas.json', import.meta.url), JSON.stringify(mapas, null, 2));
}

// --- UTILS ---
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchMB(url, retries = 3) {
    console.log(`[MusicBrainz] GET ${url}`);
    await sleep(1500); 
    const res = await fetch(url, { headers: { 'User-Agent': MB_USER_AGENT, 'Accept': 'application/json' }});
    if (!res.ok) {
        if (res.status === 503 && retries > 0) {
            console.log(`  [Aviso] 503 recebido. Aguardando 5 segundos antes de tentar novamente... (${retries} tentativas restantes)`);
            await sleep(5000);
            return fetchMB(url, retries - 1);
        }
        throw new Error(`MB API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

function gerarCpf() {
    let num = Array(9).fill(0).map(() => Math.floor(Math.random() * 10));
    let sum1 = 0;
    for (let j = 0; j < 9; j++) sum1 += num[j] * (10 - j);
    let r1 = (sum1 % 11) < 2 ? 0 : 11 - (sum1 % 11);
    let sum2 = 0;
    for (let j = 0; j < 9; j++) sum2 += num[j] * (11 - j);
    sum2 += r1 * 2;
    let r2 = (sum2 % 11) < 2 ? 0 : 11 - (sum2 % 11);
    return `${num.join('')}${r1}${r2}`;
}

function gerarCnpj() {
    let n = Array(12).fill(0).map(() => Math.floor(Math.random() * 10));
    function calculateDigit(base, weights) {
        let sum = 0;
        for (let i = 0; i < base.length; i++) sum += base[i] * weights[i];
        let remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
    let d1_weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let d1 = calculateDigit(n, d1_weights);
    let d2_weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let d2 = calculateDigit([...n, d1], d2_weights);
    return `${n.join('')}${d1}${d2}`;
}

async function fetchAssociacoes() {
  const res = await fetch(`${CADASTRO_API_URL}/associacoes`, { headers: authHeaders });
  if (!res.ok) throw new Error(`Falha ao obter associações: ${res.statusText}`);
  const data = await res.json();
  if (data.length === 0) throw new Error("Nenhuma associação retornada pela API.");
  return data.map(a => a.id);
}

async function buscarTitularExistente(nomeTitular) {
    const encodedNome = encodeURIComponent(nomeTitular);
    const url = `${CADASTRO_API_URL}/titulares?nome=${encodedNome}`;
    console.log(url);
    console.log(`[ECAD API] Buscando titular por nome: ${nomeTitular}`);
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) {
        console.warn(`[AVISO] Falha ao buscar titular por nome (${nomeTitular}):`, await res.text());
        return null;
    }
    const data = await res.json();
    if (data.items && data.items.length > 0) {
        console.log(`  [OK] Titular existente encontrado: ${data.items[0].nome} (ID: ${data.items[0].id})`);
        return data.items[0].id;
    }
    return null;
}

async function criarTitularNoECAD(artist, associacoesIds) {
    if (mapas.titulares[artist.id]) return mapas.titulares[artist.id];

    // Tentar encontrar titular existente pelo nome
    const titularExistenteId = await buscarTitularExistente(artist.name);
    if (titularExistenteId) {
        mapas.titulares[artist.id] = titularExistenteId;
        salvarMapas();
        console.log(`  [OK] Usando titular existente para ${artist.name}`);
        return titularExistenteId;
    }

    const tipoTitular = Math.random() > 0.5 ? "PF" : "PJ";
    const documento = tipoTitular === "PF" ? gerarCpf() : gerarCnpj();
    const nomeTitular = artist.name.substring(0, 100);
    const associacaoId = associacoesIds[Math.floor(Math.random() * associacoesIds.length)];

    const payload = {
        nome: nomeTitular,
        tipo: tipoTitular,
        documento: documento,
        nacionalidade: "BR",
        associacaoId: associacaoId,
        caeIpi: null
    };

    const res = await fetch(`${CADASTRO_API_URL}/titulares`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    if (!res.ok) {
        console.warn(`[AVISO] Falha titular ${artist.name}:`, await res.text());
        return null;
    }
    const json = await res.json();
    mapas.titulares[artist.id] = json.id;
    salvarMapas(); // Checkpoint titular
    console.log(`  [OK] Titular Criado: ${artist.name}`);
    return json.id;
}


async function main() {
    try {
        const associacoesIds = await fetchAssociacoes();
        console.log(`Associações carregadas: ${associacoesIds.length}`);
        
        const offset = mapas.state.script01_offset;
        console.log(`\nBuscando ${MAX_OBRAS_PARA_IMPORTAR} obras no MusicBrainz (Começando do Offset: ${offset})...`);
        
        const searchRes = await fetchMB(`https://musicbrainz.org/ws/2/work?query=type:song&limit=${MAX_OBRAS_PARA_IMPORTAR}&offset=${offset}&fmt=json`);
        
        for (const work of searchRes.works) {
            console.log(`\nProcessando Obra MB: ${work.title} (ID: ${work.id})`);
            
            if (mapas.obras[work.id]) {
                console.log(`  -> Obra já importada anteriormente. Pulando.`);
                continue;
            }

            const workDetails = await fetchMB(`https://musicbrainz.org/ws/2/work/${work.id}?inc=artist-rels&fmt=json`);
            
            const relations = workDetails.relations || [];
            const writers = relations.filter(r => r['target-type'] === 'artist' && (r.type === 'writer' || r.type === 'composer' || r.type === 'lyricist'));
            
            if (writers.length === 0) {
                console.log(`  -> Sem autores listados. Pulando obra.`);
                continue;
            }

            // 1. Criar a Obra
            const payloadObra = { titulo: work.title.substring(0, 100), subtitulo: null, tipo: "MUSICAL", genero: null };
            const resObra = await fetch(`${CADASTRO_API_URL}/obras`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payloadObra) });
            if (!resObra.ok) {
                console.log(`  [Erro] Falha ao criar obra:`, await resObra.text());
                continue;
            }
            const obraSalva = await resObra.json();
            mapas.obras[work.id] = obraSalva.id;
            salvarMapas(); // Checkpoint obra
            console.log(`  [OK] Obra Criada: ${obraSalva.titulo}`);

            // 2. Criar Titulares e Linkar
            let restante = 100.0;
            const qtdAutores = writers.length;
            
            for (let i = 0; i < qtdAutores; i++) {
                const rel = writers[i];
                const titularId = await criarTitularNoECAD(rel.artist, associacoesIds);
                if (!titularId) continue;

                let percentual;
                if (i === qtdAutores - 1) {
                    percentual = Number(restante.toFixed(2));
                } else {
                    percentual = Number((100.0 / qtdAutores).toFixed(2));
                    restante -= percentual;
                }

                const payloadTit = { titularId: titularId, categoria: "Autor", percentual: percentual };
                const resTit = await fetch(`${CADASTRO_API_URL}/obras/${obraSalva.id}/titularidades`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payloadTit) });
                if (resTit.ok) console.log(`    -> Titularidade associada: ${rel.artist.name} (${percentual}%)`);
            }
        }

        // Atualiza o offset para a próxima execução
        mapas.state.script01_offset += MAX_OBRAS_PARA_IMPORTAR;
        salvarMapas();
        
        console.log(`\nLote finalizado! Novo offset salvo: ${mapas.state.script01_offset}`);

    } catch (e) {
        console.error('Erro geral:', e);
    }
}

main();