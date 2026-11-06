// Testes de honestidade da geração de currículo.
const fs=require('fs'),path=require('path');const BASE=path.resolve(__dirname,'..');
const Motor=require(path.join(BASE,'extensao','motor.js')),CV=require(path.join(BASE,'extensao','curriculo.js'));
const D=JSON.parse(fs.readFileSync(path.join(BASE,'dicionario_sinonimos.json'),'utf8'));
const P=JSON.parse(fs.readFileSync(path.join(BASE,'perfil_exemplo.json'),'utf8'));
const M=Motor.criar(D,{hoje:2026*12+10});
const textosPerfil=new Set(P.experiencias.flatMap(x=>x.atividades.map(a=>typeof a==='string'?a:a.texto)));
let total=0,falhas=0;const ok=(c,m)=>{total++;if(!c){falhas++;console.log('  FALHOU',m);}};
const gerar=(v,op)=>{const t=fs.readFileSync(path.join(BASE,'testes','vagas',v+'.txt'),'utf8');const r=M.comparar(P,t);return [r,CV.montar(P,r,t,D,Object.assign({hoje:new Date(2026,10,5)},op||{}))];};
for(const v of fs.readdirSync(path.join(BASE,'testes','vagas')).filter(f=>f.startsWith('v_')).map(f=>f.slice(0,-4))){
  const [r,cv]=gerar(v);
  ok(cv.experiencias.length===P.experiencias.length,`${v}: todas as experiências presentes`);
  for(const x of cv.experiencias)for(const it of x.itens)ok(textosPerfil.has(it),`${v}: texto de experiência vem do perfil`);
  const naoAtende=new Set(r.itens.filter(i=>i[3]!=='sim').map(i=>i[0]));
  const nomesSim=new Set(r.itens.filter(i=>i[3]==='sim').map(i=>i[5]));
  for(const c of cv.competencias){const hab=Object.values(D.areas).flatMap(a=>Object.entries(a.habilidades)).find(([k,h])=>h.nome===c);
    if(hab)ok(nomesSim.has(hab[0]),`${v}: competência "${c}" só se atendida`);}
  ok(cv.emFormacao.every(n=>r.itens.some(i=>i[3]==='parcial')),`${v}: "em formação" só com crédito parcial`);
  ok(!cv.competencias.some(c=>/python|sql|power bi/i.test(c)),`${v}: Python/SQL/Power BI nunca como competência`);
  ok(cv.projetos.every(p=>P.projetos.find(x=>x.nome===p.nome)),`${v}: projetos vêm do perfil`);
  ok(!/Operador Logístico|Aplicativo de transporte|Fábrica Exemplo|autopeças|Faculdade Exemplo/i.test(cv.resumo),`${v}: resumo sem nomes de empresa`);
  cv.projetos.forEach((p,k)=>{const orig=P.projetos.find(x=>x.nome===p.nome);
    ok(k===0||p.topicos.length===0,`${v}: só o projeto em destaque tem tópicos`);
    ok(p.topicos.length<=4,`${v}: no máximo 4 tópicos`);
    for(const tt of p.topicos){if(orig.base&&tt===(orig.base_rotulo||'Base metodológica')+': '+orig.base){ok(true,`${v}: base vem do perfil`);continue;}const o=orig.topicos.find(x=>x.texto===tt);ok(!!o,`${v}: tópico vem do perfil`);
      ok(o&&o.habilidades.some(h=>r.itens.some(i=>i[5]===h&&(i[3]==='sim'||i[3]==='parcial'))),`${v}: tópico ligado a requisito atendido`);}});
  {let resto=cv.resumo;for(const f of P.frases_resumo)resto=resto.replace(f.texto,'');resto=resto.replace(P.resumo_formacao,'').replace(/Formação complementar: [^.]*\)?\./,'').replace(/Em formação: [^.]*\./,'').trim();
   ok(resto===''||resto===P.resumo_padrao,`${v}: resumo só com frases do perfil (sobra: "${resto.slice(0,60)}")`);}
  {const usadas=P.frases_resumo.filter(f=>cv.resumo.includes(f.texto));const ok2=usadas.every(f=>f.habilidades.some(h=>r.itens.some(i=>i[5]===h&&(i[3]==='sim'||i[3]==='parcial'))));
   ok(ok2&&usadas.length<=4,`${v}: frases só de habilidades atendidas, no máximo 4`);}
}
let [r,cv]=gerar('v_qa');
ok(cv.objetivo==='Analista de QA Júnior','v_qa: objetivo = título da vaga');
ok(cv.contato.slice(0,4).join('|')==='36 anos|Solteiro|São Paulo - SP|(11) 90000-0000','contato com idade, estado civil e celular: '+cv.contato.join('|'));
ok(CV.idade('1990-03-10',new Date(2027,2,9))===36&&CV.idade('1990-03-10',new Date(2027,2,10))===37,'idade vira no aniversário');
ok(cv.projetos.every(p=>p.papel==='Idealizador e responsável pelo produto'&&!('link' in p)),'papel padronizado e sem links');
ok(!JSON.stringify(cv).includes('Idiomas)')&&!JSON.stringify(cv).includes('5 apps')&&!JSON.stringify(cv).includes('5 publicados'),'Trilha: app removido fora');
[r,cv]=gerar('v_qa',{cargo:'Engenheiro de Prompt'});ok(cv.objetivo==='Engenheiro de Prompt','cargo digitado substitui o título');
[r,cv]=gerar('v_qa',{cargo:'  '});ok(cv.objetivo===null,'cargo vazio = sem objetivo');
[r,cv]=gerar('v_qa');
ok(/Inglês: básico/.test(cv.idiomas[0]),'v_qa: inglês aparece como básico');
{const proj=JSON.stringify(P.projetos);ok(!/definidos por mim|defined by me|I defined|Duolingo/.test(proj),'projetos: sem "requisitos definidos por mim" e sem referência a Duolingo');
 for(const p of P.projetos) ok(p.origem&&p.origem_en&&p.base&&p.base_en&&p.base_rotulo&&p.base_rotulo_en,`${p.id}: origem, base e rótulo nos dois idiomas`);
 ok(!/nenhuma/i.test(JSON.stringify(P.projetos.map(p=>p.base))),'projetos: nenhuma base vazia ou "nenhuma"');
 {const ped=fs.readFileSync(path.join(BASE,'testes','vagas','v_qa.txt'),'utf8');const cq=CV.montar(P,M.comparar(P,ped),ped,D,{hoje:new Date(2026,10,5)}),cqe=CV.montar(P,M.comparar(P,ped),ped,D,{idioma:'en',hoje:new Date(2026,10,5)});
  ok(cq.projetos[0].topicos[0].startsWith('Como funciona: reúne numa única tela'),'v_qa: Compatibilidade de Vagas em destaque abre com "Como funciona"');
  ok(cqe.projetos[0].topicos[0].startsWith('How it works: brings'),'v_qa: "How it works" em inglês');}
 const prompt=fs.readFileSync(path.join(BASE,'testes','vagas','v_prompt.txt'),'utf8');const cvp=CV.montar(P,M.comparar(P,prompt),prompt,D,{hoje:new Date(2026,10,5)});
 const d0=cvp.projetos[0];ok(d0.topicos[0].startsWith('Base metodológica: '),'v_prompt: projeto em destaque abre com a base metodológica: '+d0.nome);
 ok(d0.topicos.length<=4,'v_prompt: destaque com no máximo 4 tópicos');
 const cve=CV.montar(P,M.comparar(P,prompt),prompt,D,{idioma:'en',hoje:new Date(2026,10,5)});ok(cve.projetos[0].topicos[0].startsWith('Methodological basis: '),'v_prompt: base metodológica em inglês');
 ok(cvp.projetos.slice(1).every(p=>p.topicos.length===0),'v_prompt: base só no projeto em destaque');}
ok(cv.idiomas[1]==='Espanhol: intermediário (B1 no teste de espanhol da EF; estudo em andamento)','v_qa: espanhol B1 aparece sempre: '+cv.idiomas[1]);
ok(cv.cursos.some(c=>/Espanhol: estudo autodidata/.test(c))&&cv.cursos.some(c=>/Inglês: estudo autodidata/.test(c)),'v_qa: cursos autodidatas de inglês e espanhol presentes: '+cv.cursos.join(' / '));
{const ia=(v,lg)=>{const t=fs.readFileSync(path.join(BASE,'testes','vagas',v+'.txt'),'utf8');return CV.montar(P,M.comparar(P,t),t,D,{idioma:lg||'pt',hoje:new Date(2026,10,5)})};
 const a=ia('v_prompt');ok(a.ferramentasIA.join(',')==='Claude,Claude Code,ChatGPT,Gemini','v_prompt: ferramentas de IA comprovadas: '+a.ferramentasIA);
 ok(!a.ferramentasIA.includes('Copilot')&&!a.ferramentasIA.includes('Cursor'),'v_prompt: nenhuma ferramenta sem comprovação');
 ok(/Ferramentas de IA: Claude · Claude Code · ChatGPT · Gemini/.test(CV.html(a)),'v_prompt: linha de ferramentas no HTML');
 ok(/AI tools: Claude/.test(CV.html(ia('v_prompt','en'))),'v_prompt: linha de ferramentas em inglês');
 ok(ia('v_admin').ferramentasIA.length===0,'v_admin: sem linha de ferramentas de IA');
 const r=M.comparar(P,fs.readFileSync(path.join(BASE,'testes','vagas','v_ia_ferramentas.txt'),'utf8'));
 ok(r.itens.some(i=>/github_copilot/.test(i[0])&&i[3]==='nao')&&r.itens.some(i=>/cursor/.test(i[0])&&i[3]==='nao'),'v_ia_ferramentas: Copilot e Cursor não atendidos');
 ok(r.itens.some(i=>/claude_code/.test(i[0])&&i[3]==='sim'),'v_ia_ferramentas: Claude Code atendido');}
for(const v of fs.readdirSync(path.join(BASE,'testes','vagas')).filter(f=>f.startsWith('v_')).map(f=>f.slice(0,-4))){
  const t2=fs.readFileSync(path.join(BASE,'testes','vagas',v+'.txt'),'utf8');const r2=M.comparar(P,t2);
  const pt2=CV.montar(P,r2,t2,D,{hoje:new Date(2026,10,5)}),en2=CV.montar(P,r2,t2,D,{idioma:'en',hoje:new Date(2026,10,5)});
  ok(!/B1|A2|estimad|Duolingo/.test(pt2.idiomas[0]+en2.idiomas[0]+pt2.cursos.join()+en2.cursos.join()),`${v}: inglês sem nível acima de A1, sem estimativa e sem Duolingo`);
  ok(pt2.idiomas[1]==='Espanhol: intermediário (B1 no teste de espanhol da EF; estudo em andamento)'&&en2.idiomas[1]==='Spanish: intermediate (B1 on the EF Spanish test; currently studying)',`${v}: espanhol B1 sempre presente nos dois idiomas`);
  ok(pt2.idiomas.length===2&&/Inglês: básico \(A1 no teste EF SET/.test(pt2.idiomas[0])&&/em andamento/.test(pt2.idiomas[0]),`${v}: idioma sempre presente, com níveis e em andamento`);
  ok(en2.idiomas.length===2&&/English: basic \(A1 on the EF SET test/.test(en2.idiomas[0])&&/currently studying/.test(en2.idiomas[0]),`${v}: idioma sempre presente em inglês`);
  ok(pt2.cursos.some(c=>/^Inglês: estudo autodidata \(em andamento\)$/.test(c)),`${v}: curso de inglês na lista de cursos, em andamento`);
}
ok(!cv.competencias.some(c=>/ágeis|jira|ctfl/i.test(c)),'v_qa: ágeis/Jira/CTFL fora das competências');
ok(cv.experiencias.find(x=>x.empresa.startsWith('Operador')).itens.some(t=>/falha de controle/.test(t)),'v_qa: falha do coletor destacada no operador logístico');
{const[r2,c2]=gerar('v_qa');ok(c2.projetos[0].nome.startsWith('Sistema de compatibilidade'),'v_qa: empate entre projetos em uso, vence o mais recente: '+c2.projetos[0].nome);
 const P2=JSON.parse(JSON.stringify(P));P2.projetos.find(x=>x.id==='proj_curriculo').situacao='em_desenvolvimento';
 const t=fs.readFileSync(path.join(BASE,'testes','vagas','v_qa.txt'),'utf8');const c3=CV.montar(P2,M.comparar(P2,t),t,D,{hoje:new Date(2026,10,5)});
 ok(c3.projetos[0].nome.startsWith('Trilha'),'v_qa: no empate, projeto em uso vence o em desenvolvimento: '+c3.projetos[0].nome);}
[r,cv]=gerar('v_suporte');
ok(cv.projetos.length===0,'v_suporte: sem projetos (nenhum comprova requisito)');
ok(cv.cnh==='CNH categoria AB com EAR','v_suporte: CNH aparece porque a vaga pede');
[r,cv]=gerar('v_estagio_dados');
ok(cv.emFormacao.includes('Python para dados'),'v_estagio_dados: Python em formação');
[r,cv]=gerar('v_desenhista');
ok(cv.competencias.includes('SolidWorks')&&cv.academicas.length===1,'v_desenhista: SolidWorks e atividade acadêmica');
ok(cv.area==='industria_mecanica'&&/SolidWorks/.test(cv.resumo)&&/Formação complementar: Desenho Técnico Mecânico/.test(cv.resumo),'v_desenhista: resumo com SolidWorks e curso concluído ligado');
ok(cv.experiencias.find(x=>x.empresa.startsWith('Aplicativo')).resumida,'v_desenhista: aplicativo de transporte resumido em uma linha');
[r,cv]=gerar('v_prompt');
ok(cv.experiencias.map(x=>x.empresa.split(' ')[0]).join(',')==='Projetos,Aulas,Aplicativo,Comércio,Operador,Fábrica','v_prompt: ordem cronológica (atuais primeiro): '+cv.experiencias.map(x=>x.empresa.split(' ')[0]).join(','));
ok(cv.experiencias.find(x=>x.empresa.startsWith('Aulas')).resumida,'v_prompt: reforço não destacado só por comunicação');
ok(cv.area==='ia_prompt'&&cv.projetos.length>=3&&/Engenharia de prompt/.test(cv.resumo)&&/Em formação: Dados com Python e IA/.test(cv.resumo),'v_prompt: resumo com prompt e cursos em formação');
ok(!cv.projetosPrimeiro,'v_prompt: experiência relevante (Idealizador) vem antes dos projetos');
{const ide=cv.experiencias.find(x=>x.empresa.startsWith('Projetos'));ok(ide&&!ide.resumida&&ide.itens.some(a=>/assistência de IA/.test(a)),'v_prompt: experiência Idealizador completa e com uso de IA declarado');}
{const [r2,cv2]=gerar('v_admin');const ide2=cv2.experiencias.find(x=>x.empresa.startsWith('Projetos'));ok(ide2&&ide2.resumida,'v_admin: experiência Idealizador resumida em vaga fora da área');}
ok(cv.projetos[0].destaque&&cv.projetos[0].topicos.some(t=>/JSON|prompt|alucinação|IA/.test(t)),'v_prompt: destaque com tópicos de prompt: '+cv.projetos[0].nome);
[r,cv]=gerar('v_desenhista');ok(!cv.projetosPrimeiro,'v_desenhista: experiência antes (há experiência relevante)');
[r,cv]=gerar('v_prompt');
// ---------- currículo em inglês ----------
const PROPRIOS=/São Paulo|Tecnólogo|Ciber Exemplo|Copiloto|Faculdade Exemplo|Verso|Trilha|Fluxo Quant|Escola de Informática Exemplo|Escola Técnica Exemplo|Academia Online Exemplo|Candidato Exemplo/g;
const sobra=txt=>txt.replace(PROPRIOS,'').replace(/[\w.+-]+@[\w.-]+/g,'');
for(const v of fs.readdirSync(path.join(BASE,'testes','vagas')).filter(f=>f.startsWith('v_')).map(f=>f.slice(0,-4))){
  const t=fs.readFileSync(path.join(BASE,'testes','vagas',v+'.txt'),'utf8');const r=M.comparar(P,t);
  const en=CV.montar(P,r,t,D,{idioma:'en',cargo:'Test Role',hoje:new Date(2026,10,5)});
  const pt=CV.montar(P,r,t,D,{cargo:'Test Role',hoje:new Date(2026,10,5)});
  const corpo=JSON.stringify({...en,objetivo:null});
  ok(!/[çãõ]|\b(de|para|com|em|que|não)\b/i.test(sobra(corpo)),`${v}: inglês sem palavras em português (achado: ${(sobra(corpo).match(/[^ ]*[çãõ][^ ]*|\b(de|para|com|em|que|não)\b/i)||[''])[0]})`);
  ok(!en.contato.some(c=>/anos|Casado/.test(c)),`${v}: inglês sem idade e estado civil`);
  ok(en.experiencias.length===pt.experiencias.length&&en.projetos.length===pt.projetos.length&&en.competencias.length===pt.competencias.length,`${v}: inglês com a mesma seleção do português`);
  ok(en.experiencias.every((x,k)=>x.itens.length===pt.experiencias[k].itens.length),`${v}: mesmas atividades selecionadas nos dois idiomas`);
  const html=CV.html(en);ok(/<h2>Summary<\/h2>/.test(html)&&!/Resumo|Competências|Experiência profissional/.test(html),`${v}: títulos das seções em inglês`);
}
// docx gerado em Node
const docx=require('/tmp/npmdocx/node_modules/docx');
docx.Packer.toBuffer(CV.docxDocumento(cv,docx)).then(b=>{fs.writeFileSync('/tmp/cv_prompt.docx',b);ok(b.length>3000,'docx gerado');
  
{const st=t=>{const r=M.comparar(P,'Requisitos:\n- Experiência com '+t+'.');return r.itens.map(i=>i[3]).join(',');};
 ok(st('evals com golden dataset')==='nao','dicionário 1.7: evals não atendido (perfil não comprova): '+st('evals com golden dataset'));
 ok(st('prompt injection')==='nao','dicionário 1.7: prompt injection não atendido (perfil não comprova): '+st('prompt injection'));
 ok(st('teste de mutação')==='sim'&&st('ADR')==='sim'&&st('elicitação de requisitos')==='sim'&&st('classificação de intenção')==='sim','dicionário 1.7: termos técnicos comprovados reconhecidos');}
console.log(`${total-falhas}/${total} testes de currículo passaram`+(falhas?` — ${falhas} FALHAS`:''));process.exit(falhas?1:0);});
