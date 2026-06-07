import fs from 'fs';
import { faker } from '@faker-js/faker';

const ARRECADACAO_API_URL = process.env.ARRECADACAO_API_URL || 'https://mcad-arrecadacao.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJFUzM4NCIsInR5cCI6ImF0K2p3dCIsImtpZCI6IkE1YzFzdHNpZnJid3QxRS0zNzcyQ1V0aC14QkxCcmxRSDdCVWlVZU84TDgifQ.eyJqdGkiOiJ1eDlpcEhJVVN3cnFrUEowUzdOT2oiLCJzdWIiOiJxamoyNDZpaGU5enkiLCJpYXQiOjE3ODA4MDIzODUsImV4cCI6MTc4MDgwNTk4NSwic2NvcGUiOiIiLCJjbGllbnRfaWQiOiJiMG84dzE4c3lydjk1Z2QybzNrZWUiLCJpc3MiOiJodHRwczovLzlsY2ludS5sb2d0by5hcHAvb2lkYyIsImF1ZCI6Imh0dHBzOi8vYXBpLm1jYWQubG9jYWwifQ.LknKF-6SKIpw7J2rfYB3YC4bsBo_06nLqLFiufw-BoeF7FR8EpuWHiaNLSpVzXSN59oKMQobX6KJem2gfmddx6-HYVfe7PqfHfPvKqMZHWsaI_pZdtm7PiDoRkpFPRIN';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

let mapas = { usuarios: [], licencas: [] };

if (fs.existsSync(new URL('mapas.json', import.meta.url))) {
    mapas = { ...mapas, ...JSON.parse(fs.readFileSync(new URL('mapas.json', import.meta.url), 'utf8')) };
    mapas.licencas = mapas.licencas || [];
}

function salvarMapas() {
    fs.writeFileSync(new URL('mapas.json', import.meta.url), JSON.stringify(mapas, null, 2));
}

async function fetchRubricas() {
    const res = await fetch(`${ARRECADACAO_API_URL}/rubricas`, { headers: authHeaders });
    if (!res.ok) throw new Error(`Falha ao obter rubricas: ${res.statusText}`);
    const data = await res.json();
    return data.map(r => r.id);
}

function randomDateFuture(days = 365) {
    return faker.date.future({ days: days });
}

async function main() {
    if (mapas.usuarios.length === 0) {
        return console.log("Nenhum usuário de música no mapas.json.");
    }

    try {
        console.log(`\n--- Iniciando Geração de Licenças ---`);
        const rubricasIds = await fetchRubricas();
        if (rubricasIds.length === 0) {
            return console.log("Nenhuma rubrica encontrada no sistema.");
        }

        for (const usuarioId of mapas.usuarios) {
            // Criar uma licença ativa
            const rubricaId = rubricasIds[Math.floor(Math.random() * rubricasIds.length)];
            
            const startDate = randomDateFuture(30); // dataInicio nos próximos 30 dias
            const dataInicio = startDate.toISOString().split('T')[0];
            
            const hasEnd = Math.random() > 0.5;
            let dataFim = null;
            if (hasEnd) {
                 const endDate = randomDateFuture(365); // dataFim nos próximos 365 dias, após dataInicio
                 dataFim = endDate.toISOString().split('T')[0];
            }

            const payload = {
                usuarioMusicaId: usuarioId,
                rubricaId: rubricaId,
                dataInicio: dataInicio,
                dataFim: dataFim
            };

            const res = await fetch(`${ARRECADACAO_API_URL}/licencas`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const json = await res.json();
                console.log(`  [OK] Licença Criada: ${json.id} para Usuário ${usuarioId}`);
                mapas.licencas.push(json.id);
                salvarMapas();
            } else {
                console.warn(`  [AVISO] Falha ao criar licença para ${usuarioId}:`, await res.text());
            }
        }
        console.log(`\nGeração de Licenças finalizada.`);
    } catch (e) {
        console.error('Erro geral:', e);
    }
}

main();