import { chromium } from 'playwright';
import fs from 'fs';

const EVIDENCE_DIR = '/home/tsgomes/mcad/tasks/plataforma/prd-perfis-builtin-rbac/qa-evidence/qa_task_00_preflight_setup_e_dados';
const REQ_LOG = EVIDENCE_DIR + '/requests.log';
const CREDS_FILE = '/home/tsgomes/mcad/.env_qa';
const BASE_URL = 'https://mcad.tasso.dev.br';
const BFF_URL = 'https://mcad-bff.tasso.dev.br';

function fp(t){ return t? '...'+t.slice(-6) : '-'; }
function parseCreds(text){
  const records = text.split(/-{5,}\n?/g);
  const out=[];
  for(const rec of records){
    const hint=(rec.match(/Hint:\s*([^\r\n]+)/i)||[])[1]?.trim();
    const email=(rec.match(/Endereço de e-mail:\s*([^\r\n]+)/i)||[])[1]?.trim();
    const senha=(rec.match(/(?:Nova\s+)?Senha:\s*([^\r\n]+)/i)||[])[1]?.trim();
    if(hint&&email&&senha)out.push({hint,email,senha});
  }
  return out;
}

async function login(browser, cred){
  const context = await browser.newContext({ viewport:{width:1366,height:768} });
  const page = await context.newPage();
  let token=null;
  page.on('request',(req)=>{ if(req.url().startsWith(BFF_URL)){ const a=req.headers()['authorization']; if(a?.startsWith('Bearer ')&&!token) token=a.slice(7); } });
  await page.goto(BASE_URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForURL(/logto\.app/,{timeout:30000}).catch(()=>{});
  await page.locator('input[name="identifier"], input[type="email"], input[autocomplete="username"]').first().fill(cred.email).catch(()=>{});
  await page.locator('button[type="submit"]').first().click().catch(()=>{});
  await page.waitForSelector('input[type="password"]',{timeout:15000}).catch(()=>{});
  await page.locator('input[type="password"]').first().fill(cred.senha).catch(()=>{});
  await page.locator('button[type="submit"]').first().click().catch(()=>{});
  await page.waitForURL(/mcad\.tasso\.dev\.br/,{timeout:45000}).catch(()=>{});
  const t0=Date.now();
  while(!token&&Date.now()-t0<15000)await page.waitForTimeout(250);
  return {context,page,token};
}

const creds = parseCreds(fs.readFileSync(CREDS_FILE,'utf8'));
const analista = creds.find(c=>c.hint==='analista.dev');
const browser = await chromium.launch({headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
const {context,page,token} = await login(browser, analista);
console.error('logged in, fp=',fp(token));

const allCadastroKeys = [];
for(let p=0; p<5; p++){
  const r = await page.request.get(`${BFF_URL}/v1/permissions?domain=cadastro&page=${p}&size=20`, { headers:{Authorization:`Bearer ${token}`}, timeout:30000 });
  fs.appendFileSync(REQ_LOG, `${new Date().toISOString()}\tGET\t/v1/permissions?domain=cadastro&page=${p}\tstatus=${r.status()}\tjwt=${fp(token)}\t[paginate]\n`);
  if(!r.ok()) break;
  const body = await r.json();
  for(const c of (body.content||[])) allCadastroKeys.push(c.key);
  if (body.totalPages <= p+1) break;
}
// Also list keys containing 'titular'
const titular = allCadastroKeys.filter(k=>k.toLowerCase().includes('titular'));
fs.writeFileSync(EVIDENCE_DIR + '/cadastro_permission_keys.json', JSON.stringify({total: allCadastroKeys.length, all: allCadastroKeys, titular_keys: titular, has_ver_cpf_completo: allCadastroKeys.includes('cadastro:default:titular:ver-cpf-completo')}, null, 2));
console.error('total cadastro perms:', allCadastroKeys.length);
console.error('titular keys:', titular);
console.error('has cadastro:default:titular:ver-cpf-completo:', allCadastroKeys.includes('cadastro:default:titular:ver-cpf-completo'));

await context.close();
await browser.close();
