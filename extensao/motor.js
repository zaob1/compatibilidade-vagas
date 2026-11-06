// Motor de compatibilidade perfil x vaga (porte fiel de motor_referencia.py).
// Funciona no navegador (window.Motor) e no Node (module.exports).
(function (root) {
  'use strict';
  const WC = '\\p{L}\\p{N}_';
  const N = s => s.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const B = t => new RegExp(`(?<![${WC}\\-])${esc(t)}(?![${WC}\\-])`, 'gu');
  const tem = (re, s) => s.search(re) !== -1;
  const nPal = s => s.trim().split(/\s+/).filter(x => x).length;
  const INTERR = new RegExp(`,|(?<![${WC}])(mas|porem|contudo|entretanto|todavia|no entanto|exceto)(?![${WC}])`, 'u');
  const SPLIT = /[.;•*]\s|^\s*(?:\d+[.)]|[-*•])\s/;
  const CURSO_DESCONHECIDO = /(superior|graduacao|tecnico|tecnologo|bacharelado|licenciatura|pos-graduacao|formacao|curso)( completo| cursando| ou cursando| completo ou cursando)? (em|de) (?!andamento|areas|area|nivel)[a-z]{3,}/;
  const roundPy = x => { const f = Math.floor(x); return Math.abs(x - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); };
  const minTupla = arr => arr.reduce((a, b) => (b[0] < a[0] || (b[0] === a[0] && b[1] < a[1])) ? b : a);
  const porTamanho = arr => arr.slice().sort((a, b) => b.length - a.length);

  function criar(D, opcoes) {
    opcoes = opcoes || {};
    const R = D.regras_contexto, S = R.secoes_da_vaga, E = D.requisitos_especiais;
    const ESC = E.escolaridade, EX = E.experiencia, TE = D.tipos_evidencia;
    const HAB = {}, AREA = {}; let idx = [];
    for (const [aid, a] of Object.entries(D.areas)) {
      for (const [hid, h] of Object.entries(a.habilidades)) {
        HAB[hid] = h; AREA[hid] = aid;
        for (const t of h.termos) idx.push([N(t), hid, null]);
        for (const [k, v] of Object.entries(h.termos_por_nivel || {})) for (const t of v) idx.push([N(t), hid, ['nivel', parseInt(k)]]);
        for (const [k, v] of Object.entries(h.termos_por_categoria || {})) for (const t of v) idx.push([N(t), hid, ['cat', k]]);
        for (const [k, v] of Object.entries(h.ferramentas || {})) for (const t of v) idx.push([N(t), hid, ['ferr', k]]);
      }
    }
    const CURSOS = porTamanho(Object.values(ESC.cursos).flat().map(N));
    const ESCTERMOS = Object.values(ESC.niveis).flat().map(N);
    const ORD = Object.keys(ESC.niveis);
    for (const [k, v] of Object.entries(ESC.niveis)) for (const t of v) idx.push([N(t), 'escolaridade', ['esc', k]]);
    idx = idx.map((x, i) => [x, i]).sort((a, b) => (b[0][0].length - a[0][0].length) || (a[1] - b[1])).map(x => x[0]);
    const IDXRE = idx.map(([t, h, e]) => [B(t), h, e, t]);
    const PN = Object.entries(D.niveis.palavras_nivel).map(([k, ws]) => [parseInt(k), ws.map(w => B(N(w)))]);
    const NUM = {}; for (const [k, v] of Object.entries(EX.numeros_por_extenso)) NUM[N(k)] = v;
    const TEMPO = new RegExp(`(?<![${WC}])\\+?\\s*(\\d+|${Object.keys(NUM).map(esc).join('|')})\\s*(?:\\(\\s*[${WC}]+\\s*\\)\\s*)?\\+?\\s*(anos?|mes|meses)(?![${WC}])`, 'gu');
    const RE = lista => porTamanho(lista).map(e => [B(N(e)), e]);
    const NEG = RE(R.negacao.expressoes), DES = RE(R.desejavel.expressoes), OBR = RE(R.obrigatorio.expressoes);
    const EXCL = RE(EX.exclusoes), EXNEG = RE(EX.negacao), GAT = EX.gatilhos.map(g => B(N(g)));
    const AREAPAL = Object.entries(EX.area_por_palavra).map(([a, ws]) => [a, ws.map(w => B(N(w)))]);
    const AREAVAGA = EX.area_da_vaga.map(w => B(N(w)));
    const CURSO_TERMOS = Object.entries(ESC.cursos).flatMap(([c, ws]) => ws.map(w => [N(w), c])).sort((a, b) => b[0].length - a[0].length).map(([t, c]) => [B(t), c]);
    function cursosNaFrase(fr) {
      const usado = new Array(fr.length).fill(false), achou = new Set();
      for (const [re, c] of CURSO_TERMOS) {
        const g = new RegExp(re.source, re.flags); let m;
        while ((m = g.exec(fr)) !== null) {
          if (m[0].length === 0) { g.lastIndex++; continue; }
          let livre = true; for (let i = m.index; i < m.index + m[0].length; i++) if (usado[i]) { livre = false; break; }
          if (!livre) continue;
          for (let i = m.index; i < m.index + m[0].length; i++) usado[i] = true;
          achou.add(c);
        }
      }
      return [...achou].sort();
    }
    const AFINS = ESC.cursos_afins.map(w => B(N(w)));
    const ESCTRE = ESCTERMOS.map(B), CURSOSPRE = CURSOS.map(B);

    function find(fr, lista) {
      const out = [];
      for (const [re, e] of lista) for (const m of fr.matchAll(re)) out.push([m.index, m.index + m[0].length, e]);
      return out;
    }
    function secao(l) {
      l = N(l).trim(); const dois = l.endsWith(':'); l = l.replace(/:+$/, '').trim();
      if (nPal(l) > 6) return null;
      for (const t of ['ignorar', 'desejavel', 'obrigatorio', 'atividade'])
        if (S[t].some(e => dois ? l.startsWith(N(e)) : l === N(e))) return t;
      return null;
    }
    function tempo(fr) {
      let tot = 0, ok = false;
      for (const m of fr.matchAll(TEMPO)) {
        const n = /^\d+$/.test(m[1]) ? parseInt(m[1]) : NUM[m[1]];
        tot += m[2].startsWith('ano') ? n * 12 : n; ok = true;
      }
      return ok ? tot : null;
    }
    const BULLET = /^\s*([-•*▪●◦·]|\d+[.)])\s/;
    function analisar(txt, stats) {
      const res = {}; let sec = null; const exps = [], escs = []; let nach = 0;
      const primeira = txt.split('\n').find(l => l.trim()) || '';
      for (const linha of txt.split('\n')) {
        const s = secao(linha);
        if (s) { sec = s; continue; }
        if (sec === 'ignorar') continue;
        const antes = [nach, exps.length, escs.length].join();
        for (const fr of N(linha).split(SPLIT)) {
          if (fr === undefined || !fr.trim()) continue;
          const usado = new Array(fr.length).fill(false); const ach = [];
          const livre = (a, b) => { for (let i = a; i < b; i++) if (usado[i]) return false; return true; };
          const marca = (a, b) => { for (let i = a; i < b; i++) usado[i] = true; };
          if (ESCTRE.some(re => tem(re, fr)))
            for (const re of CURSOSPRE) for (const m of fr.matchAll(re)) { const a = m.index, b = a + m[0].length; if (livre(a, b)) marca(a, b); }
          for (const [re, hid, ex, t] of IDXRE)
            for (const m of fr.matchAll(re)) { const a = m.index, b = a + m[0].length; if (!livre(a, b)) continue; marca(a, b); ach.push([a, b, hid, ex, t]); }
          nach += ach.length;
          const neg = find(fr, NEG), des = find(fr, DES), obr = find(fr, OBR);
          const negado = (st, en) => neg.some(n => n[1] <= st && !INTERR.test(fr.slice(n[1], st))) || neg.some(n => n[0] >= en && nPal(fr.slice(en, n[0])) <= 3);
          const peso = st => {
            const c = des.map(p => [Math.abs(st - p[0]), 'desejavel']).concat(obr.map(p => [Math.abs(st - p[0]), 'obrigatorio']));
            const tp = c.length ? minTupla(c)[1] : (sec || 'sem_secao');
            return [{ obrigatorio: 3, desejavel: 1, atividade: 2, sem_secao: 2 }[tp], tp];
          };
          const areasFrase = new Set(), nivEsc = [], tools = {};
          for (const [st, en, hid, ex] of ach)
            if (ex && ex[0] === 'ferr' && !negado(st, en)) (tools[hid] = tools[hid] || new Set()).add(ex[1]);
          for (const [st, en, hid, ex, t] of ach) {
            if (hid === 'escolaridade') { if (!negado(st, en)) nivEsc.push([st, ex[1]]); continue; }
            let nv = null;
            if (ex && ex[0] === 'nivel') nv = ex[1];
            else if (HAB[hid].usa_nivel) {
              const c = [];
              for (const [k, res2] of PN) for (const re of res2) for (const m of fr.matchAll(re)) c.push([Math.abs(m.index - st), k]);
              nv = (c.length ? minTupla(c) : [0, 1])[1];
            }
            // habilidades com nível: cada nível pedido é um requisito separado
            const key = hid + (tools[hid] ? '|' + [...tools[hid]].sort().join('/') : '') + (nv ? '#' + nv : '');
            if (negado(st, en)) { (res[key] = res[key] || { hab: hid }).negado = t; continue; }
            areasFrase.add(AREA[hid]);
            let [p, tp] = peso(st);
            if (HAB[hid].tipo === 'comportamental') p /= 2;
            const r = res[key] = res[key] || { hab: hid };
            if (tools[hid]) r.ferramentas = [...tools[hid]].sort();
            if (p > (r.peso || 0)) Object.assign(r, { peso: p, tipo: tp, termo: t });
            if (nv && nv > (r.nivel || 0)) r.nivel = nv;
            const kb = [];
            for (const [k, res2] of PN) for (const re of res2) for (const m of fr.matchAll(re)) kb.push([Math.abs(m.index - st), k]);
            const b1 = kb.length > 0 && minTupla(kb)[1] === 1;
            r.basico = (r.basico === undefined ? true : r.basico) && b1;
            if (!r.basico) delete r.basico;
            if (ex && ex[0] === 'cat') r.cat = ex[1];
          }
          if (nivEsc.length) {
            const nivel = nivEsc.map(x => x[1]).reduce((a, b) => ORD.indexOf(b) < ORD.indexOf(a) ? b : a);
            let cursos = cursosNaFrase(fr);
            const afins = AFINS.some(re => tem(re, fr));
            if (!cursos.length && tem(CURSO_DESCONHECIDO, fr)) cursos = ['nao_reconhecido'];
            const [p, tp] = peso(nivEsc[0][0]);
            escs.push({ nivel, cursos, aceita_afins: afins, peso: p, tipo: tp });
          }
          let gat = GAT.some(re => tem(re, fr));
          let mz = tempo(fr);
          if (find(fr, EXCL).length) { gat = false; mz = null; }
          if (gat || mz !== null) {
            if (find(fr, EXNEG).length) { exps.push({ negado: true }); continue; }
            if (gat && negado(fr.length, fr.length) && !INTERR.test(fr)) { exps.push({ negado: true }); continue; }
            let ar = new Set(areasFrase);
            if (!ar.size) ar = new Set(AREAPAL.filter(([a, rs]) => rs.some(re => tem(re, fr))).map(x => x[0]));
            if (!ar.size && AREAVAGA.some(re => tem(re, fr))) ar = new Set(['da_vaga']);
            if (!gat && !ar.size) continue;
            if (mz === null && areasFrase.size) continue;
            const habsFrase = new Set(ach.map(a => a[2]));
            const hs = Object.keys(res).filter(k => habsFrase.has(res[k].hab) && 'peso' in res[k]);
            if (mz !== null && hs.length) { for (const h of hs) res[h].meses_minimos = Math.max(mz, res[h].meses_minimos || 0); continue; }
            const [p, tp] = peso(0);
            const areas = [...ar].sort();
            exps.push({ meses: mz, areas: areas.length ? areas : ['qualquer'], peso: p, tipo: tp });
          }
        }
        if (stats) {
          const np = linha.split(/\s+/).filter(x => x).length;
          const conta = (['obrigatorio', 'desejavel', 'atividade'].includes(sec) || BULLET.test(linha)) && np >= 3 && !(linha === primeira && np <= 10 && !linha.trim().endsWith(':'));
          if (conta) {
            (stats.linhas = stats.linhas || []).push(linha.trim());
            const k = [nach, exps.length, escs.length].join() !== antes ? 'reconhecidas' : 'nao_reconhecidas';
            (stats[k] = stats[k] || []).push(linha.trim());
          }
        }
      }
      const tot = {};
      for (const v of Object.values(res)) if ('peso' in v) tot[AREA[v.hab]] = (tot[AREA[v.hab]] || 0) + v.peso;
      delete tot.transversal;
      let dom = 'qualquer', mx = -Infinity;
      for (const [k, v] of Object.entries(tot)) if (v > mx) { mx = v; dom = k; }
      for (const e of exps) if (e.areas && e.areas.length === 1 && e.areas[0] === 'da_vaga') e.areas = [dom];
      return [res, escs, exps];
    }

    // ---------- senioridade da vaga ----------
    const SEN = D.senioridade;
    const SENRE = l => l.map(w => B(N(w)));
    const SEN_ENT = SENRE(SEN.entrada_explicita), SEN_ACI = SENRE(SEN.acima), SEN_CAR = SENRE(SEN.entrada_por_cargo);
    function detectarSenioridade(txt, cargo) {
      const linhas = []; let sec = null, titulo = null;
      for (const l of txt.split('\n')) {
        const s = secao(l);
        if (s) { sec = s; continue; }
        if (sec === 'ignorar' || !l.trim()) continue;
        if (titulo === null) titulo = N(l);
        linhas.push(N(l));
      }
      const t = linhas.join('\n'), has = (x, rs) => rs.some(re => tem(re, x));
      if (has(t, SEN_ENT)) return 'entrada';
      if (has(t, SEN_ACI)) return 'acima';
      if (titulo && has(titulo, SEN_CAR)) return 'entrada';
      if (cargo) {
        const c = N(cargo);
        if (has(c, SEN_ENT) || has(c, SEN_CAR)) return 'entrada';
        if (has(c, SEN_ACI)) return 'acima';
      }
      return 'indefinida';
    }
    const GRUPOS_CURSO = Object.values((ESC.cursos_correlatos || {}).grupos || {});
    const correlatos = c => new Set(GRUPOS_CURSO.filter(g => g.includes(c)).flat().filter(x => x !== c));
    const cursosDaFormacao = f => { const s = new Set(); if (f.curso_id) s.add(f.curso_id); if (N(f.tipo || '').startsWith('tecnolog')) s.add('tecnologia'); return s; };
    // ---------- comparação ----------
    const AUTORIA = new Set(TE.exigem_autoria_de_codigo);
    const COB_CNH = HAB.cnh.cobertura, COB_ESC = ESC.cobertura;
    const mes = (s, fim) => { if (!s) return null; const p = s.split('-'); return parseInt(p[0]) * 12 + (p.length > 1 ? parseInt(p[1]) : (fim ? 12 : 1)) - 1; };
    let HOJE = opcoes.hoje != null ? opcoes.hoje : (() => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); })();
    const meses = per => { const ms = new Set(); for (const [i, f] of per) { if (i === null) continue; const fim = f !== null ? f : HOJE; for (let m = i; m <= fim; m++) ms.add(m); } return ms.size; };
    const DATA = /^[0-9]{4}(-(0[1-9]|1[0-2]))?$/;

    function validarPerfil(P) {
      const erros = [], avisos = [];
      const obj = x => x && typeof x === 'object' && !Array.isArray(x);
      if (!obj(P)) return [['o perfil precisa ser um objeto JSON'], avisos];
      for (const k of ['versao_esquema', 'dados_pessoais', 'formacoes', 'experiencias', 'projetos', 'cursos', 'habilidades_com_nivel', 'lacunas'])
        if (!(k in P)) erros.push(`esquema: campo obrigatório ausente: ${k}`);
      if (erros.length) return [erros, avisos];
      if (!obj(P.dados_pessoais) || typeof P.dados_pessoais.nome !== 'string' || P.dados_pessoais.nome.length < 2) erros.push('esquema: dados_pessoais: nome obrigatório');
      if (obj(P.dados_pessoais) && P.dados_pessoais.nascimento != null && !/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(P.dados_pessoais.nascimento)) erros.push('esquema: dados_pessoais/nascimento: use AAAA-MM-DD');
      for (const k of ['formacoes', 'experiencias', 'projetos', 'cursos', 'lacunas']) if (!Array.isArray(P[k])) erros.push(`esquema: ${k} precisa ser uma lista`);
      if (erros.length) return [erros, avisos];
      const enumOk = (v, l, onde) => { if (!l.includes(v)) erros.push(`esquema: ${onde}: valor inválido '${v}'`); };
      const dataOk = (v, onde) => { if (v != null && !(typeof v === 'string' && DATA.test(v))) erros.push(`esquema: ${onde}: data inválida '${v}' (use AAAA ou AAAA-MM)`); };
      const listaIds = (v, onde) => { if (v === undefined) return; if (!Array.isArray(v) || v.some(x => typeof x !== 'string' || !/^[a-z0-9_]+$/.test(x))) erros.push(`esquema: ${onde}: lista de ids inválida`); else if (new Set(v).size !== v.length) erros.push(`esquema: ${onde}: itens repetidos`); };
      P.formacoes.forEach((f, i) => { for (const k of ['id', 'nivel', 'curso', 'situacao']) if (!(k in f)) erros.push(`esquema: formacoes/${i}: ${k} obrigatório`); enumOk(f.nivel, ['fundamental', 'medio', 'tecnico', 'superior_cursando', 'superior_completo', 'pos', 'mestrado', 'doutorado'], `formacoes/${i}/nivel`); enumOk(f.situacao, ['concluido', 'cursando', 'trancado'], `formacoes/${i}/situacao`); dataOk(f.inicio, `formacoes/${i}/inicio`); dataOk(f.fim, `formacoes/${i}/fim`); });
      for (const [k, tipos, req] of [['experiencias', ['profissional'], ['empresa', 'cargo', 'atividades']], ['projetos', ['projeto_proprio', 'projeto_assistido_ia'], ['nome', 'descricao']]])
        P[k].forEach((x, i) => { for (const c of ['id', 'tipo', 'inicio', 'fim', 'habilidades', ...req]) if (!(c in x)) erros.push(`esquema: ${k}/${i}: ${c} obrigatório`); enumOk(x.tipo, tipos, `${k}/${i}/tipo`); dataOk(x.inicio, `${k}/${i}/inicio`); dataOk(x.fim, `${k}/${i}/fim`); for (const c of ['areas', 'habilidades', 'habilidades_pontuais', 'ferramentas']) listaIds(x[c], `${k}/${i}/${c}`); });
      P.cursos.forEach((c, i) => { for (const k of ['id', 'tipo', 'nome', 'habilidades']) if (!(k in c)) erros.push(`esquema: cursos/${i}: ${k} obrigatório`); enumOk(c.tipo, ['curso_concluido', 'curso_andamento'], `cursos/${i}/tipo`); listaIds(c.habilidades, `cursos/${i}/habilidades`); listaIds(c.ferramentas, `cursos/${i}/ferramentas`); });
      if (!obj(P.habilidades_com_nivel)) erros.push('esquema: habilidades_com_nivel precisa ser um objeto');
      else for (const [h, v] of Object.entries(P.habilidades_com_nivel)) {
        if (!Array.isArray(v.evidencias) || !v.evidencias.length) erros.push(`esquema: habilidades_com_nivel/${h}: evidencias obrigatórias`);
        if ('nivel' in v && !(Number.isInteger(v.nivel) && v.nivel >= 1 && v.nivel <= 4)) erros.push(`esquema: habilidades_com_nivel/${h}/nivel: use 1 a 4`);
        if ('categoria' in v) enumOk(v.categoria, ['A', 'B', 'AB', 'C', 'D', 'E'], `habilidades_com_nivel/${h}/categoria`);
      }
      if (erros.length) return [erros, avisos];
      const FERR = {}; for (const [h, hb] of Object.entries(HAB)) for (const f of Object.keys(hb.ferramentas || {})) FERR[f] = h;
      const ids = ['formacoes', 'experiencias', 'projetos', 'cursos'].flatMap(k => P[k].map(x => x.id));
      for (const i of new Set(ids.filter((x, j) => ids.indexOf(x) !== j))) erros.push(`id repetido: ${i}`);
      for (const x of [...P.experiencias, ...P.projetos]) {
        const i = mes(x.inicio), f = mes(x.fim, true);
        if (i !== null && i > HOJE) erros.push(`${x.id}: início no futuro`);
        if (i !== null && f !== null && f < i) erros.push(`${x.id}: fim antes do início`);
        if (i === null) avisos.push(`${x.id}: sem data de início; o tempo de uso das habilidades não será contado`);
        for (const a of x.areas || []) if (!(a in D.areas)) erros.push(`${x.id}: área inexistente no dicionário: ${a}`);
        const habs = new Set([...(x.habilidades || []), ...(x.habilidades_pontuais || [])]);
        for (const fe of x.ferramentas || []) if (fe in FERR && !habs.has(FERR[fe])) erros.push(`${x.id}: ferramenta ${fe} pertence à habilidade ${FERR[fe]}, que não está listada neste item`);
        if (x.tipo === 'projeto_assistido_ia') for (const h of habs) if (AUTORIA.has(h)) avisos.push(`${x.id}: ${h} exige autoria de código e não será contada a partir de projeto assistido por IA`);
      }
      for (const x of [...P.experiencias, ...P.projetos, ...P.cursos]) {
        for (const h of new Set([...(x.habilidades || []), ...(x.habilidades_pontuais || [])])) if (!(h in HAB)) erros.push(`${x.id}: habilidade inexistente no dicionário: ${h}`);
        for (const fe of x.ferramentas || []) if (!(fe in FERR)) erros.push(`${x.id}: ferramenta inexistente no dicionário: ${fe}`);
      }
      for (const x of P.experiencias) {
        const habs = new Set([...(x.habilidades || []), ...(x.habilidades_pontuais || [])]);
        (x.atividades || []).forEach((at, j) => {
          if (typeof at === 'string') return;
          if (!at || typeof at.texto !== 'string') { erros.push(`esquema: ${x.id}: atividade ${j + 1} sem texto`); return; }
          for (const h of at.habilidades || []) if (!habs.has(h)) erros.push(`${x.id}: atividade ${j + 1} cita a habilidade ${h}, que não está nas habilidades da experiência`);
          for (const h of at.destacar_em || []) if (!(h in HAB)) erros.push(`${x.id}: atividade ${j + 1}: destacar_em inexistente no dicionário: ${h}`);
        });
      }
      for (const x of P.projetos) (x.topicos || []).forEach((t, j) => { for (const h of t.habilidades || []) if (!(x.habilidades || []).includes(h)) erros.push(`${x.id}: tópico ${j + 1} cita a habilidade ${h}, que não está nas habilidades do projeto`); });
      (P.atividades_academicas || []).forEach((at, j) => { if (at && typeof at === 'object') for (const h of at.destacar_em || []) if (!(h in HAB)) erros.push(`atividades_academicas ${j + 1}: destacar_em inexistente: ${h}`); });
      (P.frases_resumo || []).forEach((f, j) => {
        if (!f || typeof f.texto !== 'string' || f.texto.length < 10) { erros.push(`frases_resumo ${j + 1}: texto obrigatório`); return; }
        for (const h of f.habilidades || []) if (!(h in HAB)) erros.push(`frases_resumo ${j + 1}: habilidade inexistente: ${h}`);
        if (!(f.habilidades || []).length) erros.push(`frases_resumo ${j + 1}: ligue a frase a pelo menos uma habilidade`);
      });
      for (const f of P.formacoes) if (f.curso_id && !(f.curso_id in ESC.cursos)) avisos.push(`${f.id}: curso_id ${f.curso_id} não existe no dicionário; exigências de curso darão 'verificar'`);
      for (const [h, v] of Object.entries(P.habilidades_com_nivel)) {
        if (!(h in HAB)) { erros.push(`habilidades_com_nivel: habilidade inexistente: ${h}`); continue; }
        if ('nivel' in v && !HAB[h].usa_nivel) erros.push(`habilidades_com_nivel: ${h} não usa nível`);
        if ('categoria' in v && !HAB[h].usa_categoria) erros.push(`habilidades_com_nivel: ${h} não usa categoria`);
        for (const e of v.evidencias) {
          if (!ids.includes(e) && e !== 'documento' && e !== 'declaracao_nivel') erros.push(`habilidades_com_nivel: ${h}: evidência inexistente: ${e}`);
          if (e === 'declaracao_nivel' && !HAB[h].usa_nivel) erros.push(`habilidades_com_nivel: ${h}: declaração de nível só vale para idiomas e habilidades com nível`);
        }
      }
      return [erros, avisos];
    }

    function carregarPerfil(P) {
      const ev = {}; const add = (h, x) => (ev[h] = ev[h] || []).push(x);
      for (const e of [...P.experiencias, ...P.projetos]) {
        for (const h of e.habilidades || []) add(h, [e.tipo, mes(e.inicio), mes(e.fim, true), e.id, new Set(e.ferramentas || [])]);
        for (const h of e.habilidades_pontuais || []) add(h, [e.tipo, null, null, e.id, new Set(e.ferramentas || [])]);
      }
      for (const c of P.cursos) for (const h of c.habilidades || []) add(h, [c.tipo, null, null, c.id, new Set(c.ferramentas || [])]);
      for (const [h, v] of Object.entries(P.habilidades_com_nivel || {})) for (const x of v.evidencias || []) if (x === 'documento' || x === 'declaracao_nivel') add(h, [x, null, null, x, new Set()]);
      return ev;
    }
    function avaliarHab(h, req, P, ev, sen) {
      const L = ev[h] || [], niv = (P.habilidades_com_nivel || {})[h] || {};
      let validas = L.filter(e => e[0] !== 'curso_andamento' && !(e[0] === 'projeto_assistido_ia' && AUTORIA.has(h)) && !(e[0] === 'declaracao_nivel' && !HAB[h].usa_nivel));
      if (!validas.length) {
        if (L.some(e => e[0] === 'curso_andamento')) {
          if (sen === 'entrada') return ['parcial', 'em formação (crédito parcial: vaga de entrada)'];
          if (req.basico || (req.nivel === 1 && HAB[h].usa_nivel)) return ['parcial', 'em formação (crédito parcial: vaga pede só noções)'];
          return ['nao', 'em formação (curso em andamento)'];
        }
        if (L.some(e => e[0] === 'projeto_assistido_ia')) return ['nao', 'só em projeto assistido por IA (não comprova autoria de código)'];
        return ['nao', 'sem evidência no perfil'];
      }
      if (req.ferramentas) {
        validas = validas.filter(e => req.ferramentas.some(f => e[4].has(f)));
        if (!validas.length) return ['nao', 'pede ' + req.ferramentas.join(' ou ') + '; perfil não comprova'];
      }
      if (req.nivel && HAB[h].usa_nivel) { const t = niv.nivel || 1; if (t < req.nivel) return ['nao', `pede nível ${req.nivel}, perfil tem ${t}`]; }
      if (req.cat) { const t = niv.categoria; if (!t || !(COB_CNH[t] || []).includes(req.cat)) return ['nao', `pede CNH ${req.cat}, perfil tem ${t}`]; }
      if (req.meses_minimos) {
        const m = meses(validas.filter(e => ['profissional', 'projeto_proprio', 'projeto_assistido_ia'].includes(e[0])).map(e => [e[1], e[2]]));
        if (m < req.meses_minimos) return ['nao', `pede ${req.meses_minimos} meses, perfil tem ${m}`];
      }
      return ['sim', 'evidência: ' + [...new Set(validas.map(e => e[3]))].sort().join(', ')];
    }
    function comparar(P, txt, op) {
      op = op || {};
      const [erros] = validarPerfil(P);
      if (erros.length) throw new Error('Perfil inválido: ' + erros.join('; '));
      const st_ = {}; const ev = carregarPerfil(P); const [res, escs, exps] = analisar(txt, st_); const itens = [];
      let sen, origem;
      if (op.senioridade === 'entrada' || op.senioridade === 'acima') { sen = op.senioridade; origem = 'declarada'; }
      else { sen = detectarSenioridade(txt); origem = 'texto'; if (sen === 'indefinida' && op.cargo) { sen = detectarSenioridade(txt, op.cargo); if (sen !== 'indefinida') origem = 'cargo'; } }
      for (const r of Object.values(res)) {
        if (!('peso' in r)) continue;
        const h = r.hab, [st, mot] = avaliarHab(h, r, P, ev, sen);
        itens.push([HAB[h].nome + (r.ferramentas ? ' (' + r.ferramentas.join(' ou ') + ')' : '') + (r.nivel && HAB[h].usa_nivel ? ' (' + D.niveis.rotulos[r.nivel] + ')' : ''), r.peso, r.tipo, st, mot, h]);
      }
      const ok = P.formacoes.filter(f => f.situacao === 'concluido' || f.nivel === 'superior_cursando');
      for (const e of escs) {
        const nivelOk = ok.some(f => (COB_ESC[f.nivel] || []).includes(e.nivel)); let st, mot;
        if (e.nivel === 'tecnico' && !ok.some(f => f.nivel === 'tecnico') && ok.some(f => ['superior_completo', 'pos', 'mestrado', 'doutorado'].includes(f.nivel))) [st, mot] = ['verificar', 'pede técnico; perfil tem superior'];
        else if (!nivelOk) [st, mot] = ['nao', `pede ${e.nivel}`];
        else if (e.cursos.includes('nao_reconhecido')) [st, mot] = ['verificar', 'curso pedido não reconhecido pelo dicionário; confira'];
        else if (e.cursos.length && !ok.some(f => [...cursosDaFormacao(f)].some(c => e.cursos.includes(c)))) {
          const corr = ok.filter(f => [...cursosDaFormacao(f)].some(c => [...correlatos(c)].some(x => e.cursos.includes(x))));
          if (e.aceita_afins && corr.length) [st, mot] = ['sim', 'curso correlato: ' + corr.map(f => f.curso).join(', ') + ' (vaga aceita áreas correlatas)'];
          else if (e.aceita_afins) [st, mot] = ['verificar', 'curso diferente, vaga aceita áreas afins'];
          else [st, mot] = ['nao', 'curso pedido: ' + e.cursos.join(', ')];
        }
        else [st, mot] = ['sim', 'formação: ' + ok.map(f => f.curso).join(', ')];
        itens.push(['Escolaridade: ' + e.nivel + (e.cursos.length ? ' em ' + e.cursos.join('/') : ''), e.peso, e.tipo, st, mot, 'escolaridade']);
      }
      for (const e of exps) {
        if (e.negado) continue;
        let pro = P.experiencias.filter(x => x.tipo === 'profissional');
        if (!(e.areas.length === 1 && e.areas[0] === 'qualquer')) pro = pro.filter(x => (x.areas || []).some(a => e.areas.includes(a)));
        const m = meses(pro.map(x => [mes(x.inicio), mes(x.fim, true)]));
        const need = e.meses || 1;
        const vago = e.areas.length === 1 && e.areas[0] === 'qualquer' && !e.meses;
        itens.push([`Experiência ${e.areas.join('/')}` + (e.meses ? ` (${e.meses} meses)` : ''), e.peso, e.tipo, vago ? 'verificar' : (m >= need ? 'sim' : 'nao'), vago ? 'experiência sem área nem tempo definidos; confira' : `perfil tem ${m} meses`, 'experiencia']);
      }
      const tot = itens.filter(i => i[3] !== 'verificar').reduce((s, i) => s + i[1], 0);
      const okp = itens.filter(i => i[3] === 'sim').reduce((s, i) => s + i[1], 0) + SEN.credito_parcial * itens.filter(i => i[3] === 'parcial').reduce((s, i) => s + i[1], 0);
      const CB = D.cobertura, nl = (st_.linhas || []).length, nr = (st_.reconhecidas || []).length, frac = nl ? nr / nl : 1;
      const confianca = frac >= CB.alta ? 'alta' : (frac >= CB.media ? 'media' : 'baixa');
      return { percentual: tot ? roundPy(100 * okp / tot) : null, itens, obrigatorios_faltando: itens.filter(i => i[2] === 'obrigatorio' && i[3] === 'nao').length, senioridade: sen, senioridade_origem: origem,
        cobertura: { linhas: nl, reconhecidas: nr, confianca, nao_reconhecidas: st_.nao_reconhecidas || [] } };
    }
    return { analisar, comparar, validarPerfil, setHoje: h => { HOJE = h; }, nomeArea: h => (D.areas[AREA[h]] || {}).nome };
  }
  const api = { criar, normalizar: N };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Motor = api;
})(typeof self !== 'undefined' ? self : this);
