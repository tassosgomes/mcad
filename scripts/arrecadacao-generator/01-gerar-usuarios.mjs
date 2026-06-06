import fs from 'fs';

const ARRECADACAO_API_URL = process.env.ARRECADACAO_API_URL || 'https://mcad-arrecadacao.tasso.dev.br/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || 'SEU_TOKEN_AQUI';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

let mapas = { usuarios: [] };

if (fs.existsSync('mapas.json')) {
    mapas = { ...mapas, ...JSON.parse(fs.readFileSync('mapas.json', 'utf8')) };
    mapas.usuarios = mapas.usuarios || [];
}

function salvarMapas() {
    fs.writeFileSync('mapas.json', JSON.stringify(mapas, null, 2));
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

const estabelecimentos = [
    { razaoSocial: 'Bar do Zé LTDA', nomeFantasia: 'Bar do Zé' },
    { razaoSocial: 'Restaurante Sabor de Minas', nomeFantasia: 'Sabor de Minas' },
    { razaoSocial: 'Casas de Show Espaço Aberto', nomeFantasia: 'Espaço Aberto' },
    { razaoSocial: 'Academia Corpo em Forma LTDA', nomeFantasia: 'Corpo em Forma' },
    { razaoSocial: 'Rádio FM Sucesso', nomeFantasia: 'Rádio Sucesso' },
    { razaoSocial: 'Supermercado Compre Mais', nomeFantasia: 'Super Compre Mais' },
    { razaoSocial: 'Hotel Estrela do Mar', nomeFantasia: 'Estrela do Mar Hotel' },
    { razaoSocial: 'Loja de Roupas Fashion', nomeFantasia: 'Fashion Store' },
    { razaoSocial: 'Pizzaria Bella Napoli', nomeFantasia: 'Bella Napoli' },
    { razaoSocial: 'Clube Recreativo Municipal', nomeFantasia: 'Clube Municipal' }
];

async function main() {
    console.log(`\n--- Iniciando Geração de Usuários de Música ---`);
    for (const est of estabelecimentos) {
        const payload = {
            razaoSocial: est.razaoSocial,
            nomeFantasia: est.nomeFantasia,
            cnpj: gerarCnpj(),
            endereco: {
                cep: "01001000",
                logradouro: "Praça da Sé",
                numero: "100",
                complemento: "Sala " + Math.floor(Math.random() * 100),
                bairro: "Sé",
                cidade: "São Paulo",
                uf: "SP"
            },
            contato: {
                nomeResponsavel: "Gerente " + est.nomeFantasia,
                telefone: "11999999999",
                email: `contato@${est.nomeFantasia.toLowerCase().replace(/ /g, '')}.com`
            }
        };

        const res = await fetch(`${ARRECADACAO_API_URL}/usuarios-musica`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const json = await res.json();
            console.log(`  [OK] Usuário Criado: ${est.nomeFantasia} (ID: ${json.id})`);
            mapas.usuarios.push(json.id);
            salvarMapas();
        } else {
            console.warn(`  [AVISO] Falha ao criar ${est.nomeFantasia}:`, await res.text());
        }
    }
    console.log(`\nGeração de Usuários finalizada.`);
}

main();