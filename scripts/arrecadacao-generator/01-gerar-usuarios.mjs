import fs from 'fs';
import { faker } from '@faker-js/faker';

const ARRECADACAO_API_URL = process.env.ARRECADACAO_API_URL || 'https://mcad-arrecadacao.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN;
if (!JWT_TOKEN) { console.error('[ERRO] JWT_TOKEN env var é obrigatória. Export JWT_TOKEN=<token> antes de rodar.'); process.exit(1); }

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

let mapas = { usuarios: [] };

if (fs.existsSync(new URL('mapas.json', import.meta.url))) {
    mapas = { ...mapas, ...JSON.parse(fs.readFileSync(new URL('mapas.json', import.meta.url), 'utf8')) };
    mapas.usuarios = mapas.usuarios || [];
}

function salvarMapas() {
    fs.writeFileSync(new URL('mapas.json', import.meta.url), JSON.stringify(mapas, null, 2));
}

function gerarCnpj() {
    let n = Array(12).fill(0).map(() => faker.number.int({ min: 0, max: 9 }));
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

async function main() {
    console.log(`\n--- Iniciando Geração de Usuários de Música ---`);
    for (let i = 0; i < 10; i++) { // Gerar 10 usuários
        const razaoSocial = faker.company.name();
        const nomeFantasia = faker.company.catchPhrase();
        const cnpj = gerarCnpj();
        const endereco = {
            cep: faker.location.zipCode('########'),
            logradouro: faker.location.street(),
            numero: faker.location.buildingNumber(),
            complemento: faker.location.secondaryAddress(),
            bairro: faker.location.county(),
            cidade: faker.location.city(),
            uf: faker.location.state({ abbreviated: true })
        };
        const contato = {
            nomeResponsavel: faker.person.fullName(),
            telefone: faker.phone.number(),
            email: faker.internet.email()
        };

        const payload = {
            razaoSocial: razaoSocial,
            nomeFantasia: nomeFantasia,
            cnpj: cnpj,
            endereco: endereco,
            contato: contato
        };

        const res = await fetch(`${ARRECADACAO_API_URL}/usuarios-musica`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const json = await res.json();
            console.log(`  [OK] Usuário Criado: ${nomeFantasia} (ID: ${json.id})`);
            mapas.usuarios.push(json.id);
            salvarMapas();
        } else {
            console.warn(`  [AVISO] Falha ao criar ${nomeFantasia}: HTTP ${res.status} ${res.statusText} -`, await res.text());
        }
    }
    console.log(`\nGeração de Usuários finalizada.`);
}

main();