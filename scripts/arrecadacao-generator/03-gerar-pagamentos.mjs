import fs from 'fs';

const ARRECADACAO_API_URL = process.env.ARRECADACAO_API_URL || 'https://mcad-arrecadacao.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || 'SEU_TOKEN_AQUI';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

let mapas = { licencas: [], pagamentos: [] };

if (fs.existsSync('mapas.json')) {
    mapas = { ...mapas, ...JSON.parse(fs.readFileSync('mapas.json', 'utf8')) };
    mapas.pagamentos = mapas.pagamentos || [];
}

function salvarMapas() {
    fs.writeFileSync('mapas.json', JSON.stringify(mapas, null, 2));
}

async function main() {
    if (mapas.licencas.length === 0) {
        return console.log("Nenhuma licença no mapas.json.");
    }

    console.log(`\n--- Iniciando Geração de Pagamentos ---`);

    for (const licencaId of mapas.licencas) {
        // Gera entre 1 a 3 pagamentos por licença
        const numPagamentos = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numPagamentos; i++) {
            // Quantidade de UDAs randômica entre 10 e 500
            const udas = (Math.random() * (500 - 10) + 10).toFixed(2);

            const payload = {
                licencaId: licencaId,
                quantidadeUdas: parseFloat(udas)
            };

            const res = await fetch(`${ARRECADACAO_API_URL}/pagamentos`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const json = await res.json();
                console.log(`  [OK] Pagamento Registrado: ${json.id} (Licença: ${licencaId}, UDAs: ${udas})`);
                mapas.pagamentos.push(json.id);
                salvarMapas();
            } else {
                console.warn(`  [AVISO] Falha ao registrar pagamento para licença ${licencaId}:`, await res.text());
            }
        }
    }
    
    console.log(`\nGeração de Pagamentos finalizada.`);
}

main();