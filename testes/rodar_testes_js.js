// Roda a mesma suíte de regressão contra o motor JavaScript da extensão.
const fs=require('fs'),path=require('path');
const BASE=path.resolve(__dirname,'..');
const Motor=require(path.join(BASE,'extensao','motor.js'));
const D=JSON.parse(fs.readFileSync(path.join(BASE,'dicionario_sinonimos.json'),'utf8'));
const C=JSON.parse(fs.readFileSync(path.join(BASE,'testes','casos.json'),'utf8'));
const [a,m]=C.data_referencia.split('-').map(Number);
const M=Motor.criar(D,{hoje:a*12+m-1});
const P=JSON.parse(fs.readFileSync(path.join(BASE,C.perfil),'utf8'));
const canon=x=>JSON.stringify(x,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,k2)=>(o[k2]=v[k2],o),{}):v);
let total=0,falhas=0;const falha=s=>{falhas++;console.log('  FALHOU',s);};
for(const c of C.casos){
  const txt=fs.readFileSync(path.join(BASE,'testes','vagas',c.vaga+'.txt'),'utf8');total++;
  const [res,escs,exps]=M.analisar(txt);
  const req={};for(const[k,v]of Object.entries(res)){req[k]={};for(const[x,y]of Object.entries(v))if(x!=='termo')req[k][x]=y;}
  const obt={requisitos:req,escolaridade:escs,experiencia:exps};
  if(canon(obt)!==canon(c.analise)){falha(c.vaga+': leitura da vaga difere do Python');console.log('    JS :',canon(obt).slice(0,400));console.log('    PY :',canon(c.analise).slice(0,400));}
  if(c.comparacao){total++;const r=M.comparar(P,txt);const it={};for(const i of r.itens)it[i[0]]=i[3];
    if(r.cobertura.confianca!==c.comparacao.confianca||r.cobertura.reconhecidas!==c.comparacao.cobertura[0]||r.cobertura.linhas!==c.comparacao.cobertura[1])falha(`${c.vaga}: cobertura difere do Python (${c.comparacao.cobertura} ${c.comparacao.confianca} x ${r.cobertura.reconhecidas}/${r.cobertura.linhas} ${r.cobertura.confianca})`);
    if(r.percentual!==c.comparacao.percentual||canon(it)!==canon(c.comparacao.itens)){falha(`${c.vaga}: comparação difere (${c.comparacao.percentual}% PY x ${r.percentual}% JS)`);}}
}
for(const c of C.nivel_da_vaga||[]){total++;const r=M.comparar(P,fs.readFileSync(path.join(BASE,'testes','vagas',c.vaga+'.txt'),'utf8'),c.opcoes);
  if(r.percentual!==c.percentual||r.senioridade!==c.senioridade||r.senioridade_origem!==c.origem)falha(`nível da vaga ${c.vaga} ${JSON.stringify(c.opcoes)}: PY ${c.percentual}% ${c.senioridade}/${c.origem} x JS ${r.percentual}% ${r.senioridade}/${r.senioridade_origem}`);}
total++;const[er]=M.validarPerfil(P);if(er.length)falha('perfil principal inválido: '+er.join('; '));
for(const f of fs.readdirSync(path.join(BASE,'testes')).filter(f=>f.startsWith('perfil_quebrado_')).sort()){
  total++;const[e2]=M.validarPerfil(JSON.parse(fs.readFileSync(path.join(BASE,'testes',f),'utf8')));if(!e2.length)falha(f+': erro não detectado');}
total++;if(fs.readFileSync(path.join(BASE,'extensao','dicionario.json'),'utf8')!==fs.readFileSync(path.join(BASE,'dicionario_sinonimos.json'),'utf8'))falha('empacotamento: a cópia do dicionário dentro da extensão está diferente do dicionário principal');
console.log(`${total-falhas}/${total} testes passaram (motor JavaScript)`+(falhas?` — ${falhas} FALHAS`:''));
process.exit(falhas?1:0);
