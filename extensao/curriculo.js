// Montagem do currículo a partir do perfil e do resultado da análise da vaga.
// Regra de ouro: só entra o que é verdadeiro e comprovado no perfil; nada é inventado.
(function (root) {
  'use strict';
  const MESES = { pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  // Rótulos fixos do currículo nos dois idiomas.
  const L = {
    pt: { atual: 'atual', resumo: 'Resumo', comp: 'Competências', formando: 'Em formação', exp: 'Experiência profissional', proj: 'Projetos', form: 'Formação acadêmica', cursos: 'Cursos', acad: 'Atividades acadêmicas', idiomas: 'Idiomas', hab: 'Habilitação', conq: 'Conquistas', objetivo: 'Objetivo', em: 'em', andamento: 'em andamento', previsao: 'previsão', complementar: 'Formação complementar', base: 'Base metodológica', ferrIA: 'Ferramentas de IA', ingles: 'Inglês', espanhol: 'Espanhol', niveis: { 1: 'básico', 2: 'intermediário', 3: 'avançado', 4: 'fluente' }, cnh: c => `CNH categoria ${c}`, ear: ' com EAR', ctfl: 'certificação CTFL', titulo: 'Currículo' },
    en: { atual: 'present', resumo: 'Summary', comp: 'Skills', formando: 'In progress', exp: 'Professional experience', proj: 'Projects', form: 'Education', cursos: 'Courses', acad: 'Academic activities', idiomas: 'Languages', hab: "Driver's license", conq: 'Achievements', objetivo: 'Objective', em: 'in', andamento: 'in progress', previsao: 'expected', complementar: 'Additional training', base: 'Methodological basis', ferrIA: 'AI tools', ingles: 'English', espanhol: 'Spanish', niveis: { 1: 'basic', 2: 'intermediate', 3: 'advanced', 4: 'fluent' }, cnh: c => `Driver's license, category ${c}`, ear: ' (professional)', ctfl: 'CTFL certification', titulo: 'Resume' }
  };
  const NAO_COMPETENCIA = new Set(['comportamental', 'escolaridade', 'experiencia', 'cnh', 'cnh_ear', 'veiculo_proprio', 'ingles', 'espanhol']);
  const ROTULO_FERR = { sap: 'SAP', totvs: 'TOTVS', solidworks: 'SolidWorks', autocad: 'AutoCAD', figma: 'Figma', jira: 'Jira', glpi: 'GLPI', playwright: 'Playwright', bpmn: 'BPMN', cert_ctfl: 'certificação CTFL', cert_itil: 'ITIL Foundation', servicenow: 'ServiceNow', trello: 'Trello', confluence: 'Confluence' };
  const NIVEL_ESC = { fundamental: 'Ensino fundamental', medio: 'Ensino médio', tecnico: 'Técnico', superior_cursando: 'Superior (cursando)', superior_completo: 'Superior completo', pos: 'Pós-graduação', mestrado: 'Mestrado', doutorado: 'Doutorado' };

  const periodo = (i, f, lg) => {
    lg = lg || 'pt';
    const fmt = s => { if (!s) return null; const [a, m] = s.split('-'); return m ? (lg === 'en' ? `${MESES.en[parseInt(m) - 1]} ${a}` : `${MESES.pt[parseInt(m) - 1]}/${a}`) : a; };
    const a = fmt(i), b = f ? fmt(f) : L[lg].atual;
    return a ? `${a} – ${b}` : '';
  };
  const ordem = s => s ? parseInt(s.slice(0, 4)) * 12 + (s.length > 4 ? parseInt(s.slice(5, 7)) : 1) : -1;
  let IDIOMA = 'pt';
  // Campo no idioma escolhido, com o português como reserva.
  const tr = (o, campo) => (IDIOMA === 'en' && o && o[campo + '_en']) ? o[campo + '_en'] : (o ? o[campo] : '');
  const texto = at => typeof at === 'string' ? at : tr(at, 'texto');
  const tags = at => typeof at === 'string' ? [] : [...(at.habilidades || []), ...(at.destacar_em || [])].filter(h => h !== 'comportamental');
  // Atuais primeiro; depois pela data de saída e de início, da mais recente para a mais antiga.
  const cronologica = (a, b) => ((b.fim ? ordem(b.fim) : 1e9) - (a.fim ? ordem(a.fim) : 1e9)) || (ordem(b.inicio) - ordem(a.inicio));
  const rotuloFerr = f => (f === 'cert_ctfl' ? L[IDIOMA].ctfl : ROTULO_FERR[f]) || f.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

  function tituloDaVaga(txt) {
    const l = (txt.split('\n').find(x => x.trim()) || '').trim();
    if (!l || l.endsWith(':') || /^[-•*\d]/.test(l)) return null;
    if (l.split(/\s+/).length > 10) return null;
    if (/^(requisitos|atividades|responsabilidades|diferenciais|desejável|sobre)/i.test(l)) return null;
    return l;
  }

  function idade(nasc, hoje) {
    if (!nasc) return null; const [a, m, d] = nasc.split('-').map(Number); hoje = hoje || new Date();
    let i = hoje.getFullYear() - a; if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) i--; return i;
  }
  function montar(P, resultado, textoVaga, D, opcoes) {
    opcoes = opcoes || {};
    IDIOMA = opcoes.idioma === 'en' ? 'en' : 'pt'; const T = L[IDIOMA], lg = IDIOMA;
    const HAB = {}, AREA = {};
    for (const [aid, a] of Object.entries(D.areas)) for (const [hid, h] of Object.entries(a.habilidades)) { HAB[hid] = h; AREA[hid] = aid; }
    const AUTORIA = new Set(D.tipos_evidencia.exigem_autoria_de_codigo);
    const itens = resultado.itens.map(i => ({ nome: i[0], peso: i[1], tipo: i[2], st: i[3], hab: i[5] }));
    const pedidas = new Set(itens.map(i => i.hab));
    const atendidas = new Set(itens.filter(i => i.st === 'sim').map(i => i.hab));
    const parciais = new Set(itens.filter(i => i.st === 'parcial').map(i => i.hab));
    const areasExp = new Set();
    for (const i of itens) if (i.hab === 'experiencia') { const m = i.nome.match(/^Experiência ([a-z_/]+)/); if (m) m[1].split('/').forEach(a => areasExp.add(a)); }

    // Área predominante (informativa).
    const pesoArea = {};
    for (const i of itens) if ((i.st === 'sim' || i.st === 'parcial') && AREA[i.hab] && AREA[i.hab] !== 'transversal') pesoArea[AREA[i.hab]] = (pesoArea[AREA[i.hab]] || 0) + i.peso;
    let area = null, mx = 0; for (const [a, p] of Object.entries(pesoArea)) if (p > mx) { mx = p; area = a; }
    // Resumo por composição: frases do perfil ligadas às habilidades que a vaga pediu e o perfil comprova.
    const pesoHab = {};
    for (const i of itens) if (i.st === 'sim' || i.st === 'parcial') pesoHab[i.hab] = Math.max(pesoHab[i.hab] || 0, i.st === 'sim' ? i.peso : i.peso / 2);
    const frases = (P.frases_resumo || []).map((f, k) => ({ t: tr(f, 'texto'), k, pont: (f.habilidades || []).reduce((s, h) => s + (pesoHab[h] || 0), 0) }))
      .filter(f => f.pont > 0).sort((a, b) => (b.pont - a.pont) || (a.k - b.k)).slice(0, 4);
    const nomeCurso = c => tr(c, 'nome').replace(/^Bootcamp /, '').split(':')[0];
    const ligados = c => c.habilidades.some(h => pedidas.has(h));
    const concluidos = P.cursos.filter(c => c.tipo === 'curso_concluido' && ligados(c)).map(nomeCurso);
    const formando = P.cursos.filter(c => c.tipo === 'curso_andamento' && ligados(c)).map(nomeCurso);
    const fecho = (tr(P, 'resumo_formacao') || '') + (concluidos.length ? ` ${T.complementar}: ${concluidos.join('; ')}.` : '') + (formando.length ? ` ${T.formando}: ${formando.join('; ')}.` : '');
    const resumo = frases.length ? (frases.map(f => f.t).join(' ') + ' ' + fecho).trim() : (tr(P, 'resumo_padrao') || fecho);

    // Competências: só o que a vaga pediu e o perfil comprova; ferramentas pelo nome.
    const competencias = [], emFormacao = [], vistos = new Set();
    for (const i of itens.slice().sort((a, b) => b.peso - a.peso)) {
      if (NAO_COMPETENCIA.has(i.hab) || !HAB[i.hab]) continue;
      const m = i.nome.match(/\(([^)]+)\)$/);
      const nome = m && HAB[i.hab].ferramentas ? m[1].split(' ou ').map(rotuloFerr).join(', ') : tr(HAB[i.hab], 'nome');
      if (vistos.has(nome)) continue;
      if (i.st === 'sim') { competencias.push(nome); vistos.add(nome); }
      else if (i.st === 'parcial') { emFormacao.push(nome); vistos.add(nome); }
    }

    // Experiências: todas, em ordem cronológica inversa; relevantes completas, demais só o cabeçalho.
    const experiencias = P.experiencias.slice().sort(cronologica).map(x => {
      const porArea = (x.areas || []).some(a => areasExp.has(a));
      // Atividade "fixa" (ex.: "código desenvolvido com assistência de IA") acompanha sempre a experiência quando ela aparece completa.
      const sel = x.atividades.filter(at => porArea || tags(at).some(h => pedidas.has(h)));
      const rel = (sel.length ? x.atividades.filter(at => sel.includes(at) || at.fixa) : []).map(texto);
      const vin = tr(x, 'vinculo'), vinculo = vin && x.vinculo !== 'CLT' ? ` (${vin})` : '';
      return { cargo: tr(x, 'cargo'), empresa: tr(x, 'empresa') + vinculo, periodo: periodo(x.inicio, x.fim, lg), itens: rel, resumida: rel.length === 0 };
    });

    // Projetos: só os que comprovam algum requisito (habilidades de código não contam).
    const comprova = p => p.habilidades.filter(h => pedidas.has(h) && !AUTORIA.has(h)).length;
    const projetos = (P.projetos || []).filter(p => comprova(p) > 0)
      .sort((a, b) => (comprova(b) - comprova(a)) || ((b.situacao === 'em_uso') - (a.situacao === 'em_uso')) || cronologica(a, b))
      .map((p, k) => {
        // O projeto que mais comprova a vaga (o primeiro da lista) ganha até 4 tópicos que casam com ela.
        const topicos = k > 0 ? [] : (p.topicos || []).map((t, j) => ({ t: tr(t, 'texto'), j, pont: (t.habilidades || []).reduce((s, h) => s + (pesoHab[h] || 0), 0) }))
          .filter(t => t.pont > 0).sort((a, b) => (b.pont - a.pont) || (a.j - b.j)).slice(0, p.base ? 3 : 4).sort((a, b) => a.j - b.j).map(t => t.t);
        // No projeto em destaque, a base metodológica vem sempre em primeiro lugar.
        if (k === 0 && p.base) topicos.unshift(`${tr(p, 'base_rotulo') || T.base}: ${tr(p, 'base')}`);
        return { nome: tr(p, 'nome'), papel: tr(p, 'papel'), periodo: periodo(p.inicio, p.fim, lg), descricao: tr(p, 'descricao'), topicos, destaque: k === 0 && topicos.length > 0 };
      });

    const formacao = P.formacoes.map(f => `${tr(f, 'tipo') || NIVEL_ESC[f.nivel]} ${T.em} ${tr(f, 'curso').replace(/^Tecnologia em /, '')} · ${f.instituicao}` + (f.inicio ? ` · ${f.inicio}–${f.situacao === 'concluido' ? f.fim : T.andamento}` : ''));
    const cursos = P.cursos.slice().sort((a, b) => (b.habilidades.some(h => pedidas.has(h)) ? 1 : 0) - (a.habilidades.some(h => pedidas.has(h)) ? 1 : 0))
      .map(c => { const n = tr(c, 'nome'); return n + (c.instituicao && !n.includes(c.instituicao) ? ` · ${c.instituicao}` : '') + (c.tipo === 'curso_andamento' ? ` (${T.andamento}` + (c.previsao_fim ? `, ${T.previsao} ${periodo(c.previsao_fim, null, lg).split(' – ')[0]}` : '') + ')' : ''); });
    const academicas = (P.atividades_academicas || []).filter(at => tags(at).some(h => pedidas.has(h))).map(texto);

    // Ferramentas de IA comprovadas no perfil: aparecem quando a vaga é de IA.
    const NOMES_IA = { claude: 'Claude', claude_code: 'Claude Code', chatgpt: 'ChatGPT', gemini: 'Gemini', copilot: 'Copilot', github_copilot: 'GitHub Copilot', cursor: 'Cursor' };
    const vagaIA = ['ia_generativa', 'dev_assistido_ia', 'engenharia_prompt', 'agentes_ia', 'automacao_ia'].some(h => pedidas.has(h));
    const ferramentasIA = vagaIA ? Object.keys(NOMES_IA).filter(f => [...(P.projetos || []), ...(P.experiencias || [])].some(x => (x.ferramentas || []).includes(f))).map(f => NOMES_IA[f]) : [];
    const niv = P.habilidades_com_nivel || {};
    const idiomas = [];
    for (const [h, rot] of [['ingles', T.ingles], ['espanhol', T.espanhol]])
      if (niv[h] && niv[h].nivel) { const det = tr(niv[h], 'detalhe'); idiomas.push(`${rot}: ${T.niveis[niv[h].nivel] || T.niveis[1]}` + (det ? ` (${det})` : '')); }  // idiomas aparecem sempre, pedidos ou não
    let cnh = null;
    if ((pedidas.has('cnh') || pedidas.has('cnh_ear')) && niv.cnh) cnh = T.cnh(niv.cnh.categoria) + (niv.cnh.ear ? T.ear : '');

    const dp = P.dados_pessoais;
    return {
      nome: dp.nome,
      // Em inglês, idade e estado civil ficam de fora: currículos internacionais não costumam trazer esses dados.
      contato: (lg === 'en' ? [tr(dp, 'cidade'), dp.telefone ? '+55 ' + dp.telefone : null, dp.email, dp.linkedin] : [dp.nascimento ? idade(dp.nascimento, opcoes.hoje) + ' anos' : null, dp.estado_civil, dp.cidade, dp.telefone, dp.email, dp.linkedin]).filter(Boolean),
      idioma: lg,
      objetivo: opcoes.cargo !== undefined ? (opcoes.cargo.trim() || null) : tituloDaVaga(textoVaga),
      resumo, competencias, emFormacao, ferramentasIA, experiencias, projetos,
      projetosPrimeiro: projetos.length > 0 && experiencias.every(x => x.resumida), formacao, cursos, academicas, idiomas, cnh,
      conquistas: (lg === 'en' && P.conquistas_en) ? P.conquistas_en : (P.conquistas || []),
      area
    };
  }

  // ---------- HTML (base do PDF) ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function html(cv) {
    const T = L[cv.idioma || 'pt'];
    const sec = (t, c) => c ? `<section><h2>${t}</h2>${c}</section>` : '';
    const lista = l => l.length ? `<ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const fIA = cv.ferramentasIA || [];
    const comp = cv.competencias.length || cv.emFormacao.length || fIA.length
      ? `<p>${esc(cv.competencias.join(' · '))}${fIA.length ? `${cv.competencias.length ? '<br>' : ''}${T.ferrIA}: ${esc(fIA.join(' · '))}` : ''}${cv.emFormacao.length ? `${cv.competencias.length || fIA.length ? '<br>' : ''}<span class="cv-sub">${T.formando}: ${esc(cv.emFormacao.join(' · '))}</span>` : ''}</p>` : '';
    const exps = cv.experiencias.map(x => `<div class="cv-item"><div class="cv-linha"><b>${esc(x.cargo)}</b> · ${esc(x.empresa)}<span class="cv-data">${esc(x.periodo)}</span></div>${lista(x.itens)}</div>`).join('');
    const projs = cv.projetos.map(p => `<div class="cv-item"><div class="cv-linha"><b>${esc(p.nome)}</b> · ${esc(p.papel)}<span class="cv-data">${esc(p.periodo)}</span></div><p>${esc(p.descricao)}</p>${lista(p.topicos || [])}</div>`).join('');
    return `<header><h1>${esc(cv.nome)}</h1><p class="cv-sub">${esc(cv.contato.join(' · '))}</p>${cv.objetivo ? `<p><b>${T.objetivo}:</b> ${esc(cv.objetivo)}</p>` : ''}</header>`
      + sec(T.resumo, cv.resumo ? `<p>${esc(cv.resumo)}</p>` : '')
      + sec(T.comp, comp)
      + (cv.projetosPrimeiro ? sec(T.proj, projs) + sec(T.exp, exps) : sec(T.exp, exps) + sec(T.proj, projs))
      + sec(T.form, lista(cv.formacao))
      + sec(T.cursos, lista(cv.cursos))
      + sec(T.acad, lista(cv.academicas))
      + sec(T.idiomas, lista(cv.idiomas))
      + sec(T.hab, cv.cnh ? `<p>${esc(cv.cnh)}</p>` : '')
      + sec(T.conq, lista(cv.conquistas));
  }

  // ---------- Word (.docx) com a biblioteca docx ----------
  function docxDocumento(cv, docx) {
    const L2 = L[cv.idioma || 'pt'];
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;
    const ps = [];
    const H = t => ps.push(new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999', space: 2 } } }));
    const P = (runs, opt) => ps.push(new Paragraph(Object.assign({ children: runs, spacing: { after: 60 } }, opt || {})));
    const T = (t, o) => new TextRun(Object.assign({ text: t }, o || {}));
    const lista = l => l.forEach(x => P([T(x)], { bullet: { level: 0 } }));
    ps.push(new Paragraph({ children: [T(cv.nome, { bold: true, size: 32 })], alignment: AlignmentType.LEFT }));
    P([T(cv.contato.join(' · '), { color: '555555' })]);
    if (cv.objetivo) P([T(L2.objetivo + ': ', { bold: true }), T(cv.objetivo)]);
    if (cv.resumo) { H(L2.resumo); P([T(cv.resumo)]); }
    const fIA = cv.ferramentasIA || [];
    if (cv.competencias.length || cv.emFormacao.length || fIA.length) {
      H(L2.comp);
      if (cv.competencias.length) P([T(cv.competencias.join(' · '))]);
      if (fIA.length) P([T(L2.ferrIA + ': ' + fIA.join(' · '))]);
      if (cv.emFormacao.length) P([T(L2.formando + ': ' + cv.emFormacao.join(' · '), { color: '555555' })]);
    }
    const experiencia = () => { H(L2.exp);
      for (const x of cv.experiencias) { P([T(x.cargo, { bold: true }), T(' · ' + x.empresa + '  |  ' + x.periodo)], { spacing: { before: 100, after: 40 } }); lista(x.itens); } };
    const projetos = () => { if (!cv.projetos.length) return; H(L2.proj);
      for (const p of cv.projetos) {
        P([T(p.nome, { bold: true }), T(' · ' + p.papel + (p.periodo ? '  |  ' + p.periodo : ''))], { spacing: { before: 100, after: 40 } });
        P([T(p.descricao)]); lista(p.topicos || []);
      } };
    if (cv.projetosPrimeiro) { projetos(); experiencia(); } else { experiencia(); projetos(); }
    H(L2.form); lista(cv.formacao);
    if (cv.cursos.length) { H(L2.cursos); lista(cv.cursos); }
    if (cv.academicas.length) { H(L2.acad); lista(cv.academicas); }
    if (cv.idiomas.length) { H(L2.idiomas); lista(cv.idiomas); }
    if (cv.cnh) { H(L2.hab); P([T(cv.cnh)]); }
    if (cv.conquistas.length) { H(L2.conq); lista(cv.conquistas); }
    return new Document({
      creator: cv.nome, title: L2.titulo + ' - ' + cv.nome,
      styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
      sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: ps }]
    });
  }

  // Word a partir da página (inclui as edições feitas pelo usuário).
  function docxDoDom(raiz, docx) {
    const { Document, Paragraph, TextRun, HeadingLevel, BorderStyle } = docx;
    const ps = [];
    const runs = (no, fmt) => {
      const out = [];
      for (const n of no.childNodes) {
        if (n.nodeType === 3) { if (n.textContent) out.push(new TextRun(Object.assign({ text: n.textContent.replace(/\s+/g, ' ') }, fmt))); continue; }
        if (n.nodeType !== 1) continue;
        const t = n.tagName;
        if (t === 'BR') { out.push(new TextRun({ text: '', break: 1 })); continue; }
        const f = Object.assign({}, fmt);
        if (t === 'B' || t === 'STRONG') f.bold = true;
        if (t === 'I' || t === 'EM') f.italics = true;
        if (n.classList.contains('cv-sub')) f.color = '555555';
        if (n.classList.contains('cv-data')) out.push(new TextRun(Object.assign({ text: '  |  ' }, f)));
        out.push(...runs(n, f));
      }
      return out;
    };
    const BLOCOS = new Set(['P', 'H1', 'H2', 'H3', 'LI', 'UL', 'OL', 'DIV', 'SECTION', 'HEADER', 'ARTICLE']);
    const soInline = el => ![...el.children].some(c => BLOCOS.has(c.tagName));
    const visita = el => {
      for (const n of el.children) {
        const t = n.tagName;
        if (t === 'H1') ps.push(new Paragraph({ children: runs(n, { bold: true, size: 32 }) }));
        else if (t === 'H2' || t === 'H3') ps.push(new Paragraph({ children: runs(n, {}), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999', space: 2 } } }));
        else if (t === 'LI') ps.push(new Paragraph({ children: runs(n, {}), bullet: { level: 0 }, spacing: { after: 40 } }));
        else if (n.classList.contains('cv-linha')) ps.push(new Paragraph({ children: runs(n, {}), spacing: { before: 100, after: 40 } }));
        else if (t === 'P' || (t === 'DIV' && soInline(n))) { if (n.textContent.trim()) ps.push(new Paragraph({ children: runs(n, {}), spacing: { after: 60 } })); }
        else visita(n);
      }
    };
    visita(raiz);
    return new Document({ styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
      sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: ps }] });
  }

  const api = { montar, html, docxDocumento, docxDoDom, tituloDaVaga, idade, rotulos: L };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Curriculo = api;
})(typeof self !== 'undefined' ? self : this);
