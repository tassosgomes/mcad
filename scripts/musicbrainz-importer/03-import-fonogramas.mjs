import fs from 'fs';

// --- CONFIGURAÇÕES ---
const CADASTRO_API_URL = process.env.CADASTRO_API_URL || 'https://mcad-cadastro.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJFUzM4NCIsInR5cCI6ImF0K2p3dCIsImtpZCI6IkE1YzFzdHNpZnJid3QxRS0zNzcyQ1V0aC14QkxCcmxRSDdCVWlVZU84TDgifQ.eyJqdGkiOiJIa2NKaHIwZTRETWVjTmtfWDFIdUIiLCJzdWIiOiJjb202bjZkaWRlN24iLCJpYXQiOjE3ODA3ODYzNTYsImV4cCI6MTc4MDc4OTk1Niwic2NvcGUiOiIiLCJjbGllbnRfaWQiOiJiMG84dzE4c3lydjk1Z2QybzNrZWUiLCJpc3MiOiJodHRwczovLzlsY2ludS5sb2d0by5hcHAvb2lkYyIsImF1ZCI6Imh0dHBzOi8vYXBpLm1jYWQubG9jYWwifQ.w4R1vwQ9kEghvkfaQkkf1wLN9e6ZQUUemSqe9G2lYKyzukp-aUIiTBdxcMJ5gkfFfMkyo5gJUB_aVD7HATq0TZXfxyc8fkXoezkUe6jNcUotQw7S_4rH1ArZNCVZtb66';
const MB_USER_AGENT = 'MCAD-Test-Importer/1.0 ( tsgomes@example.com )';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

let mapas = { titulares: {}, obras: {}, fonogramas: {}, state: { script03_obras_processadas: [] } };

if (fs.existsSync('mapas.json')) {
    mapas = { ...mapas, ...JSON.parse(fs.readFileSync('mapas.json', 'utf8')) };
    mapas.fonogramas = mapas.fonogramas || {};
    mapas.state = mapas.state || {};
    mapas.state.script03_obras_processadas = mapas.state.script03_obras_processadas || [];
}

function salvarMapas() {
    fs.writeFileSync('mapas.json', JSON.stringify(mapas, null, 2));
}

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
        throw new Error(`MB API Error: ${res.status}`);
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
    const data = await res.json();
    return data.map(a => a.id);
}

async function criarTitularNoECAD(artist, associacoesIds) {
    if (mapas.titulares[artist.id]) return mapas.titulares[artist.id];

    const tipoTitular = Math.random() > 0.5 ? "PF" : "PJ";
    const documento = tipoTitular === "PF" ? gerarCpf() : gerarCnpj();
    const nomeTitular = artist.name.substring(0, 100);
    const associacaoId = associacoesIds[Math.floor(Math.random() * associacoesIds.length)];

    const payload = { nome: nomeTitular, tipo: tipoTitular, documento: documento, nacionalidade: "BR", associacaoId: associacaoId, caeIpi: null };
    const res = await fetch(`${CADASTRO_API_URL}/titulares`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    if (!res.ok) {
        console.warn(`[AVISO] Falha titular ${artist.name}:`, await res.text());
        return null;
    }
    const json = await res.json();
    mapas.titulares[artist.id] = json.id;
    salvarMapas(); // Checkpoint titular
    return json.id;
}

async function main() {
    if (fs.existsSync('mapas.json')) {
        mapas = JSON.parse(fs.readFileSync('mapas.json', 'utf8'));
        mapas.fonogramas = mapas.fonogramas || {};
        mapas.state = mapas.state || {};
        mapas.state.script03_obras_processadas = mapas.state.script03_obras_processadas || [];
    }

    const mbidObras = Object.keys(mapas.obras);
    if (mbidObras.length === 0) return console.log("Nenhuma obra encontrada no mapas.json.");

    try {
        const associacoesIds = await fetchAssociacoes();

        for (const workMbid of mbidObras) {
            // Checkpoint: Pula as obras que já verificamos (tenha ela gravações ou não)
            if (mapas.state.script03_obras_processadas.includes(workMbid)) {
                continue;
            }

            const obraIdEcad = mapas.obras[workMbid];
            console.log(`\nBuscando gravações para a obra MBID: ${workMbid} (Nossa Obra ID: ${obraIdEcad})`);
            
            const workData = await fetchMB(`https://musicbrainz.org/ws/2/work/${workMbid}?inc=recording-rels&fmt=json`);
            const recordings = (workData.relations || []).filter(r => r['target-type'] === 'recording');

            if (recordings.length === 0) {
                console.log(`  -> Nenhuma gravação encontrada.`);
                // Salva como processada para não tentar de novo
                mapas.state.script03_obras_processadas.push(workMbid);
                salvarMapas();
                continue;
            }

            const recMbid = recordings[0].recording.id;
            const recDetails = await fetchMB(`https://musicbrainz.org/ws/2/recording/${recMbid}?inc=isrcs+artist-rels&fmt=json`);
            
            const isrcs = recDetails.isrcs || [];
            if (isrcs.length > 0) {
                const isrcClean = isrcs[0].replace(/-/g, '').substring(0, 12);
                
                const payloadFono = { isrc: isrcClean, obraId: obraIdEcad, paisOrigem: "BR", dataGravacao: "2020-01-01", dataLancamento: "2020-01-01" };
                const resFono = await fetch(`${CADASTRO_API_URL}/fonogramas`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payloadFono) });
                
                if (resFono.ok) {
                    const fonoSalvo = await resFono.json();
                    mapas.fonogramas[recMbid] = fonoSalvo.id;
                    salvarMapas(); // Checkpoint fonograma
                    console.log(`  [OK] Fonograma Criado: ISRC ${isrcClean}`);

                    const performers = (recDetails.relations || []).filter(r => r['target-type'] === 'artist' && (r.type === 'performer' || r.type === 'vocal'));
                    console.log(`    -> Performers encontrados no MB: ${performers.length}`);
                    let adicionouParticipacao = false;
                    let temProdutor = false;

                    if (performers.length > 0) {
                        for (const rel of performers) {
                            const titularId = await criarTitularNoECAD(rel.artist, associacoesIds);
                            if (!titularId) continue;

                            const resPart = await fetch(`${CADASTRO_API_URL}/fonogramas/${fonoSalvo.id}/participacoes`, { 
                                method: 'POST', headers: authHeaders, body: JSON.stringify({ titularId: titularId, categoria: "INTERPRETE" }) 
                            });
                            
                            if (resPart.ok) {
                                console.log(`    -> Participação: Intérprete ${rel.artist.name}`);
                                adicionouParticipacao = true;

                                if (!temProdutor) {
                                    const resProdutor = await fetch(`${CADASTRO_API_URL}/fonogramas/${fonoSalvo.id}/participacoes`, { 
                                        method: 'POST', headers: authHeaders, body: JSON.stringify({ titularId: titularId, categoria: "PRODUTOR_FONOGRAFICO" }) 
                                    });
                                    if (resProdutor.ok) {
                                        console.log(`    -> Participação: Produtor Fonográfico ${rel.artist.name}`);
                                        temProdutor = true;
                                    } else {
                                        console.log(`    -> [Erro] Participação Produtor: ${await resProdutor.text()}`);
                                    }
                                }
                            } else {
                                console.log(`    -> [Erro] Participação Intérprete: ${await resPart.text()}`);
                            }
                        }
                    } else {
                        // Fallback: usar um titular aleatório existente para permitir a liberação
                        const allTitulares = Object.values(mapas.titulares);
                        if (allTitulares.length > 0) {
                            const randomTitularId = allTitulares[Math.floor(Math.random() * allTitulares.length)];
                            const resPart = await fetch(`${CADASTRO_API_URL}/fonogramas/${fonoSalvo.id}/participacoes`, { 
                                method: 'POST', headers: authHeaders, body: JSON.stringify({ titularId: randomTitularId, categoria: "INTERPRETE" }) 
                            });
                            const resProdutor = await fetch(`${CADASTRO_API_URL}/fonogramas/${fonoSalvo.id}/participacoes`, { 
                                method: 'POST', headers: authHeaders, body: JSON.stringify({ titularId: randomTitularId, categoria: "PRODUTOR_FONOGRAFICO" }) 
                            });
                            if (resPart.ok && resProdutor.ok) {
                                console.log(`    -> Participação: Intérprete e Produtor (Fallback Titular Existente)`);
                                adicionouParticipacao = true;
                            } else {
                                console.log(`    -> [Erro] Fallback Participação: Intérprete(${resPart.status}: ${await resPart.text()}), Produtor(${resProdutor.status}: ${await resProdutor.text()})`);
                            }
                        }
                    }

                    if (adicionouParticipacao) {
                        const resCalc = await fetch(`${CADASTRO_API_URL}/fonogramas/${fonoSalvo.id}/participacoes/calcular`, { method: 'POST', headers: authHeaders });
                        if (resCalc.ok) {
                            console.log(`    -> Percentuais rateados e calculados.`);
                        } else {
                            console.log(`    -> [Erro] Calcular: ${await resCalc.text()}`);
                        }
                    }
                } else {
                    console.log(`  [Erro] Falha fonograma:`, await resFono.text());
                }
            } else {
                console.log(`  -> Gravação ${recMbid} não possui ISRC. Pulando...`);
            }

            // Marca a Obra como totalmente processada pelo script 03 e salva
            mapas.state.script03_obras_processadas.push(workMbid);
            salvarMapas();
        }

        console.log('\nFinalizado! Todos os fonogramas possíveis importados.');
    } catch (e) {
        console.error('Erro geral:', e);
    }
}

main();