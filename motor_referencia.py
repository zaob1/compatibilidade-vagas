import json,re,unicodedata,sys
D=json.load(open('dicionario_sinonimos.json'))
N=lambda s:''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
R=D['regras_contexto'];S=R['secoes_da_vaga'];E=D['requisitos_especiais']
B=r"(?<![\w\-])%s(?![\w\-])"
HAB={};AREA={}
idx=[]
for aid,a in D['areas'].items():
  for hid,h in a['habilidades'].items():
    HAB[hid]=h;AREA[hid]=aid
    for t in h['termos']: idx.append((N(t),hid,None))
    for k,v in h.get('termos_por_nivel',{}).items(): idx+=[(N(t),hid,('nivel',int(k))) for t in v]
    for k,v in h.get('termos_por_categoria',{}).items(): idx+=[(N(t),hid,('cat',k)) for t in v]
    for k,v in h.get('ferramentas',{}).items(): idx+=[(N(t),hid,('ferr',k)) for t in v]
CURSOS=[N(w) for ws in D['requisitos_especiais']['escolaridade']['cursos'].values() for w in ws]
CURSO_TERMOS=sorted([(N(w),c) for c,ws in D['requisitos_especiais']['escolaridade']['cursos'].items() for w in ws],key=lambda x:-len(x[0]))
def cursos_na_frase(fr):
  usado=[False]*len(fr);achou=set()
  for t,c in CURSO_TERMOS:
    for m in re.finditer(B%re.escape(t),fr):
      if any(usado[m.start():m.end()]): continue
      for i in range(m.start(),m.end()): usado[i]=True
      achou.add(c)
  return sorted(achou)
ESCTERMOS=[N(w) for ws in D['requisitos_especiais']['escolaridade']['niveis'].values() for w in ws]
ESC=E['escolaridade'];ORD=list(ESC['niveis'])
for k,v in ESC['niveis'].items(): idx+=[(N(t),'escolaridade',('esc',k)) for t in v]
idx.sort(key=lambda x:-len(x[0]))
PN={int(k):[N(w) for w in v] for k,v in D['niveis']['palavras_nivel'].items()}
EX=E['experiencia'];NUM={N(k):v for k,v in EX['numeros_por_extenso'].items()}
INTERR=r',|(?<!\w)(mas|porem|contudo|entretanto|todavia|no entanto|exceto)(?!\w)'
def find(fr,exprs):
  return [(m.start(),m.end(),e) for e in sorted(exprs,key=len,reverse=True) for m in re.finditer(B%re.escape(N(e)),fr)]
def secao(l):
  l=N(l).strip();dois=l.endswith(':');l=l.rstrip(':').strip()
  if len(l.split())>6: return None
  for t in ['ignorar','desejavel','obrigatorio','atividade']:
    if any((l.startswith(N(e)) if dois else l==N(e)) for e in S[t]): return t
def tempo(fr):
  w='|'.join(map(re.escape,NUM))
  tot=0;ok=False
  for m in re.finditer(r'(?<![\w])\+?\s*(\d+|%s)\s*(?:\(\s*\w+\s*\)\s*)?\+?\s*(anos?|mes|meses)(?!\w)'%w,fr):
    n=int(m.group(1)) if m.group(1).isdigit() else NUM[m.group(1)]
    tot+=n*12 if m.group(2).startswith('ano') else n;ok=True
  return tot if ok else None
BULLET=re.compile(r'^\s*([-•*▪●◦·]|\d+[.)])\s')
def analisar(txt,stats=None):
  res={};sec=None;exps=[];escs=[];nach=0
  primeira=next((l for l in txt.split('\n') if l.strip()),'')
  for linha in txt.split('\n'):
    s=secao(linha)
    if s: sec=s;continue
    if sec=='ignorar': continue
    antes=(nach,len(exps),len(escs))
    for fr in re.split(r'[.;•*]\s|^\s*(?:\d+[.)]|[-*•])\s',N(linha)):
      if not fr.strip(): continue
      usado=[False]*len(fr);ach=[]
      if any(re.search(B%re.escape(w),fr) for w in ESCTERMOS):
        for w in sorted(CURSOS,key=len,reverse=True):
          for m in re.finditer(B%re.escape(w),fr):
            if any(usado[m.start():m.end()]): continue
            for i in range(m.start(),m.end()): usado[i]=True
      for t,hid,ex in idx:
        for m in re.finditer(B%re.escape(t),fr):
          if any(usado[m.start():m.end()]): continue
          for i in range(m.start(),m.end()): usado[i]=True
          ach.append((m.start(),m.end(),hid,ex,t))
      nach+=len(ach)
      neg=find(fr,R['negacao']['expressoes']);des=find(fr,R['desejavel']['expressoes']);obr=find(fr,R['obrigatorio']['expressoes'])
      def negado(st,en): return any(n[1]<=st and not re.search(INTERR,fr[n[1]:st]) for n in neg) or any(n[0]>=en and len(fr[en:n[0]].split())<=3 for n in neg)
      def peso(st,hid=None):
        c=[(abs(st-p[0]),'desejavel') for p in des]+[(abs(st-p[0]),'obrigatorio') for p in obr]
        tp=min(c)[1] if c else (sec or 'sem_secao')
        return {'obrigatorio':3,'desejavel':1,'atividade':2,'sem_secao':2}[tp],tp
      areas_frase=set()
      niv_esc=[]
      tools={}
      for st,en,hid,ex,t in ach:
        if ex and ex[0]=='ferr' and not negado(st,en): tools.setdefault(hid,set()).add(ex[1])
      for st,en,hid,ex,t in ach:
        if hid=='escolaridade':
          if not negado(st,en): niv_esc.append((st,ex[1]))
          continue
        nv=None
        if ex and ex[0]=='nivel': nv=ex[1]
        elif HAB[hid].get('usa_nivel'):
          b=min([(abs(m.start()-st),k) for k,ws in PN.items() for w in ws for m in re.finditer(B%re.escape(w),fr)] or [(0,1)])
          nv=b[1]
        # habilidades com nível: cada nível pedido é um requisito separado ("intermediário obrigatório" e "avançado desejável")
        key=hid+('|'+'/'.join(sorted(tools[hid])) if hid in tools else '')+('#%d'%nv if nv else '')
        if negado(st,en): res.setdefault(key,{'hab':hid})['negado']=t;continue
        areas_frase.add(AREA[hid])
        p,tp=peso(st)
        if HAB[hid].get('tipo')=='comportamental': p/=2
        r=res.setdefault(key,{'hab':hid})
        if hid in tools: r['ferramentas']=sorted(tools[hid])
        if p>r.get('peso',0): r.update(peso=p,tipo=tp,termo=t)
        if nv and nv>r.get('nivel',0): r['nivel']=nv
        kb=[(abs(m.start()-st),k) for k,ws in PN.items() for w in ws for m in re.finditer(B%re.escape(w),fr)]
        b1=bool(kb) and min(kb)[1]==1
        r['basico']=r.get('basico',True) and b1
        if not r['basico']: r.pop('basico')
        if ex and ex[0]=='cat': r['cat']=ex[1]
      if niv_esc:
        nivel=min((n for _,n in niv_esc),key=ORD.index)
        cursos=cursos_na_frase(fr)
        afins=any(re.search(B%re.escape(N(w)),fr) for w in ESC['cursos_afins'])
        if not cursos and re.search(r'(superior|graduacao|tecnico|tecnologo|bacharelado|licenciatura|pos-graduacao|formacao|curso)( completo| cursando| ou cursando| completo ou cursando)? (em|de) (?!andamento|areas|area|nivel)[a-z]{3,}',fr): cursos=['nao_reconhecido']
        p,tp=peso(niv_esc[0][0])
        escs.append(dict(nivel=nivel,cursos=cursos,aceita_afins=afins,peso=p,tipo=tp))
      gat=any(re.search(B%re.escape(N(g)),fr) for g in EX['gatilhos'])
      mz=tempo(fr)
      if find(fr,EX['exclusoes']): gat=False;mz=None
      if gat or mz is not None:
        if find(fr,EX['negacao']): exps.append({'negado':True});continue
        if gat and negado(len(fr),len(fr)) and not re.search(INTERR,fr): exps.append({'negado':True});continue
        ar=set(areas_frase)
        if not ar: ar={a for a,ws in EX['area_por_palavra'].items() for w in ws if re.search(B%re.escape(N(w)),fr)}
        if not ar and any(re.search(B%re.escape(N(w)),fr) for w in EX['area_da_vaga']): ar={'da_vaga'}
        if not gat and not ar: continue
        if mz is None and areas_frase: continue
        hs=[k for k,v in res.items() if v.get('hab') in {a[2] for a in ach} and 'peso' in v]
        if mz is not None and hs:
          for h in hs: res[h]['meses_minimos']=max(mz,res[h].get('meses_minimos',0))
          continue
        p,tp=peso(0)
        exps.append(dict(meses=mz,areas=sorted(ar) or ['qualquer'],peso=p,tipo=tp))
    if stats is not None:
      conta=(sec in('obrigatorio','desejavel','atividade') or BULLET.match(linha)) and len(linha.split())>=3 and not (linha==primeira and len(linha.split())<=10 and not linha.strip().endswith(':'))
      if conta:
        stats.setdefault('linhas',[]).append(linha.strip())
        if (nach,len(exps),len(escs))!=antes: stats.setdefault('reconhecidas',[]).append(linha.strip())
        else: stats.setdefault('nao_reconhecidas',[]).append(linha.strip())
  # resolve 'da_vaga'
  tot={}
  for h,v in res.items():
    if 'peso' in v: tot[AREA[v['hab']]]=tot.get(AREA[v['hab']],0)+v['peso']
  tot.pop('transversal',None)
  dom=max(tot,key=tot.get) if tot else 'qualquer'
  for e in exps:
    if e.get('areas')==['da_vaga']: e['areas']=[dom]
  return res,escs,exps

# ================= COMPARAÇÃO PERFIL x VAGA (v1.3) =================
from datetime import date
TE=D['tipos_evidencia'];AUTORIA=set(TE['exigem_autoria_de_codigo'])
COB_CNH=HAB['cnh']['cobertura'];COB_ESC=ESC['cobertura']
def _mes(s,fim=False):
  if not s: return None
  p=s.split('-'); return int(p[0])*12+(int(p[1]) if len(p)>1 else (12 if fim else 1))-1
HOJE=date.today().year*12+date.today().month-1
def _meses(periodos):
  ms=set()
  for i,f in periodos:
    if i is None: continue
    ms.update(range(i,(f if f is not None else HOJE)+1))
  return len(ms)
def carregar_perfil(P):
  ev={}  # hab -> list of (tipo, inicio, fim, id)
  for e in P.get('experiencias',[])+P.get('projetos',[]):
    for h in e.get('habilidades',[]):
      ev.setdefault(h,[]).append((e['tipo'],_mes(e.get('inicio')),_mes(e.get('fim'),True),e['id'],set(e.get('ferramentas',[]))))
    for h in e.get('habilidades_pontuais',[]):
      ev.setdefault(h,[]).append((e['tipo'],None,None,e['id'],set(e.get('ferramentas',[]))))
  for c in P.get('cursos',[]):
    for h in c.get('habilidades',[]): ev.setdefault(h,[]).append((c['tipo'],None,None,c['id'],set(c.get('ferramentas',[]))))
  for h,v in P.get('habilidades_com_nivel',{}).items():
    for x in v.get('evidencias',[]):
      if x in ('documento','declaracao_nivel'): ev.setdefault(h,[]).append((x,None,None,x,set()))
  return ev
def validar_perfil(P,esquema='perfil_schema.json'):
  """Retorna (erros, avisos). Erros impedem o uso do perfil; avisos só informam."""
  erros=[];avisos=[]
  try:
    import jsonschema
    v=jsonschema.Draft202012Validator(json.load(open(esquema)))
    for e in sorted(v.iter_errors(P),key=lambda e:list(e.path)):
      erros.append('esquema: '+'/'.join(map(str,e.path))+': '+e.message)
  except ImportError: avisos.append('biblioteca jsonschema ausente: validação de esquema não executada')
  except FileNotFoundError: avisos.append('arquivo de esquema não encontrado: validação de esquema não executada')
  if erros: return erros,avisos
  FERR={f:h for h,hb in HAB.items() for f in hb.get('ferramentas',{})}
  ids=[x['id'] for k in ('formacoes','experiencias','projetos','cursos') for x in P.get(k,[])]
  for i in {i for i in ids if ids.count(i)>1}: erros.append(f'id repetido: {i}')
  for x in P.get('experiencias',[])+P.get('projetos',[]):
    i,f=_mes(x.get('inicio')),_mes(x.get('fim'),True)
    if i is not None and i>HOJE: erros.append(f"{x['id']}: início no futuro")
    if i is not None and f is not None and f<i: erros.append(f"{x['id']}: fim antes do início")
    if i is None: avisos.append(f"{x['id']}: sem data de início; o tempo de uso das habilidades não será contado")
    for a in x.get('areas',[]):
      if a not in D['areas']: erros.append(f"{x['id']}: área inexistente no dicionário: {a}")
    habs=set(x.get('habilidades',[]))|set(x.get('habilidades_pontuais',[]))
    for fe in x.get('ferramentas',[]):
      if fe in FERR and FERR[fe] not in habs: erros.append(f"{x['id']}: ferramenta {fe} pertence à habilidade {FERR[fe]}, que não está listada neste item")
    if x['tipo']=='projeto_assistido_ia':
      for h in habs & AUTORIA: avisos.append(f"{x['id']}: {h} exige autoria de código e não será contada a partir de projeto assistido por IA")
  for x in P.get('experiencias',[])+P.get('projetos',[])+P.get('cursos',[]):
    for h in set(x.get('habilidades',[]))|set(x.get('habilidades_pontuais',[])):
      if h not in HAB: erros.append(f"{x['id']}: habilidade inexistente no dicionário: {h}")
    for fe in x.get('ferramentas',[]):
      if fe not in FERR: erros.append(f"{x['id']}: ferramenta inexistente no dicionário: {fe}")
  for x in P.get('experiencias',[]):
    habs=set(x.get('habilidades',[]))|set(x.get('habilidades_pontuais',[]))
    for j,at in enumerate(x.get('atividades',[])):
      if isinstance(at,str): continue
      for h in at.get('habilidades',[]):
        if h not in habs: erros.append(f"{x['id']}: atividade {j+1} cita a habilidade {h}, que não está nas habilidades da experiência")
      for h in at.get('destacar_em',[]):
        if h not in HAB: erros.append(f"{x['id']}: atividade {j+1}: destacar_em inexistente no dicionário: {h}")
  for x in P.get('projetos',[]):
    for j,t in enumerate(x.get('topicos',[])):
      for h in t.get('habilidades',[]):
        if h not in x.get('habilidades',[]): erros.append(f"{x['id']}: tópico {j+1} cita a habilidade {h}, que não está nas habilidades do projeto")
  for j,at in enumerate(P.get('atividades_academicas',[])):
    if isinstance(at,dict):
      for h in at.get('destacar_em',[]):
        if h not in HAB: erros.append(f"atividades_academicas {j+1}: destacar_em inexistente: {h}")
  for j,f in enumerate(P.get('frases_resumo',[])):
    if not isinstance(f,dict) or not isinstance(f.get('texto'),str) or len(f['texto'])<10: erros.append(f'frases_resumo {j+1}: texto obrigatório');continue
    for h in f.get('habilidades',[]):
      if h not in HAB: erros.append(f'frases_resumo {j+1}: habilidade inexistente: {h}')
    if not f.get('habilidades'): erros.append(f'frases_resumo {j+1}: ligue a frase a pelo menos uma habilidade')
  for f in P.get('formacoes',[]):
    if f.get('curso_id') and f['curso_id'] not in ESC['cursos']: avisos.append(f"{f['id']}: curso_id {f['curso_id']} não existe no dicionário; exigências de curso darão 'verificar'")
  for h,v in P.get('habilidades_com_nivel',{}).items():
    if h not in HAB: erros.append(f'habilidades_com_nivel: habilidade inexistente: {h}');continue
    if 'nivel' in v and not HAB[h].get('usa_nivel'): erros.append(f'habilidades_com_nivel: {h} não usa nível')
    if 'categoria' in v and not HAB[h].get('usa_categoria'): erros.append(f'habilidades_com_nivel: {h} não usa categoria')
    for e in v['evidencias']:
      if e not in ids and e not in ('documento','declaracao_nivel'): erros.append(f'habilidades_com_nivel: {h}: evidência inexistente: {e}')
      if e=='declaracao_nivel' and not HAB[h].get('usa_nivel'): erros.append(f'habilidades_com_nivel: {h}: declaração de nível só vale para idiomas e habilidades com nível')
  faltam=[]
  for x in P.get('experiencias',[]):
    if not x.get('cargo_en'): faltam.append(x['id']+': cargo')
    faltam+= [f"{x['id']}: atividade {j+1}" for j,a in enumerate(x.get('atividades',[])) if isinstance(a,dict) and not a.get('texto_en')]
  for x in P.get('projetos',[]):
    if not x.get('descricao_en'): faltam.append(x['id']+': descrição')
    faltam+= [f"{x['id']}: tópico {j+1}" for j,t in enumerate(x.get('topicos',[])) if not t.get('texto_en')]
  faltam+= [f"frase de resumo {j+1}" for j,f in enumerate(P.get('frases_resumo',[])) if isinstance(f,dict) and not f.get('texto_en')]
  faltam+= [c['id'] for c in P.get('cursos',[]) if not c.get('nome_en')]
  if faltam: avisos.append(f"{len(faltam)} texto(s) sem versão em inglês; o currículo em inglês usará o texto em português nesses pontos: "+', '.join(faltam[:6])+('...' if len(faltam)>6 else ''))
  return erros,avisos
SEN=D['senioridade']
def detectar_senioridade(txt,cargo=None):
  linhas=[];sec=None;titulo=None
  for l in txt.split('\n'):
    s=secao(l)
    if s: sec=s;continue
    if sec=='ignorar' or not l.strip(): continue
    if titulo is None: titulo=N(l)
    linhas.append(N(l))
  t='\n'.join(linhas)
  has=lambda txt,lista: any(re.search(B%re.escape(N(w)),txt) for w in lista)
  if has(t,SEN['entrada_explicita']): return 'entrada'
  if has(t,SEN['acima']): return 'acima'
  if titulo and has(titulo,SEN['entrada_por_cargo']): return 'entrada'
  if cargo:
    c=N(cargo)
    if has(c,SEN['entrada_explicita']) or has(c,SEN['entrada_por_cargo']): return 'entrada'
    if has(c,SEN['acima']): return 'acima'
  return 'indefinida'
GRUPOS_CURSO=ESC.get('cursos_correlatos',{}).get('grupos',{})
def correlatos(c): return {x for g in GRUPOS_CURSO.values() if c in g for x in g}-{c}
def cursos_da_formacao(f):
  cs={f.get('curso_id')}-{None}
  if N(f.get('tipo') or '').startswith('tecnolog'): cs.add('tecnologia')
  return cs
def avaliar_hab(h,req,P,ev,sen='indefinida'):
  L=ev.get(h,[]);niv=P.get('habilidades_com_nivel',{}).get(h,{})
  validas=[e for e in L if e[0] not in ('curso_andamento',) and not (e[0]=='projeto_assistido_ia' and h in AUTORIA) and not (e[0]=='declaracao_nivel' and not HAB[h].get('usa_nivel'))]
  if not validas:
    if any(e[0]=='curso_andamento' for e in L):
      if sen=='entrada': return 'parcial','em formação (crédito parcial: vaga de entrada)'
      if req.get('basico') or req.get('nivel')==1 and HAB[h].get('usa_nivel'): return 'parcial','em formação (crédito parcial: vaga pede só noções)'
      return 'nao','em formação (curso em andamento)'
    if any(e[0]=='projeto_assistido_ia' for e in L): return 'nao','só em projeto assistido por IA (não comprova autoria de código)'
    return 'nao','sem evidência no perfil'
  if req.get('ferramentas'):
    validas=[e for e in validas if e[4]&set(req['ferramentas'])]
    if not validas: return 'nao','pede '+' ou '.join(req['ferramentas'])+'; perfil não comprova'
  if req.get('nivel') and HAB[h].get('usa_nivel'):
    tem=niv.get('nivel',1)
    if tem<req['nivel']: return 'nao',f"pede nível {req['nivel']}, perfil tem {tem}"
  if req.get('cat'):
    tem=niv.get('categoria')
    if not tem or req['cat'] not in COB_CNH.get(tem,[]): return 'nao',f"pede CNH {req['cat']}, perfil tem {tem}"
  if req.get('meses_minimos'):
    m=_meses([(e[1],e[2]) for e in validas if e[0] in ('profissional','projeto_proprio','projeto_assistido_ia')])
    if m<req['meses_minimos']: return 'nao',f"pede {req['meses_minimos']} meses, perfil tem {m}"
  return 'sim','evidência: '+', '.join(sorted({e[3] for e in validas}))
class PerfilInvalido(Exception): pass
def comparar(P,txt,senioridade=None,cargo=None):
  erros,_=validar_perfil(P)
  if erros: raise PerfilInvalido('; '.join(erros))
  st_={};ev=carregar_perfil(P);res,escs,exps=analisar(txt,st_);itens=[]
  if senioridade in ('entrada','acima'): sen,origem=senioridade,'declarada'
  else:
    sen=detectar_senioridade(txt);origem='texto'
    if sen=='indefinida' and cargo:
      sen=detectar_senioridade(txt,cargo);origem='cargo' if sen!='indefinida' else 'texto'
  for k,r in res.items():
    if 'peso' not in r: continue
    h=r['hab'];st,mot=avaliar_hab(h,r,P,ev,sen)
    nome=HAB[h]['nome']+(' ('+' ou '.join(r['ferramentas'])+')' if r.get('ferramentas') else '')+(' ('+D['niveis']['rotulos'][str(r['nivel'])]+')' if r.get('nivel') and HAB[h].get('usa_nivel') else '')
    itens.append((nome,r['peso'],r['tipo'],st,mot))
  forms=P.get('formacoes',[])
  for e in escs:
    ok=[f for f in forms if f['situacao']=='concluido' or f['nivel']=='superior_cursando']
    nivel_ok=any(e['nivel'] in COB_ESC.get(f['nivel'],[]) for f in ok)
    if e['nivel']=='tecnico' and not any(f['nivel']=='tecnico' for f in ok) and any(f['nivel'] in('superior_completo','pos','mestrado','doutorado') for f in ok):
      st,mot='verificar','pede técnico; perfil tem superior'
    elif not nivel_ok: st,mot='nao',f"pede {e['nivel']}"
    elif 'nao_reconhecido' in e['cursos']: st,mot='verificar','curso pedido não reconhecido pelo dicionário; confira'
    elif e['cursos'] and not any(cursos_da_formacao(f)&set(e['cursos']) for f in ok):
      corr=[f for f in ok if any(correlatos(c)&set(e['cursos']) for c in cursos_da_formacao(f))]
      if e['aceita_afins'] and corr: st,mot='sim','curso correlato: '+', '.join(f['curso'] for f in corr)+' (vaga aceita áreas correlatas)'
      elif e['aceita_afins']: st,mot='verificar','curso diferente, vaga aceita áreas afins'
      else: st,mot='nao','curso pedido: '+', '.join(e['cursos'])
    else: st,mot='sim','formação: '+', '.join(f['curso'] for f in ok)
    itens.append(('Escolaridade: '+e['nivel']+(' em '+'/'.join(e['cursos']) if e['cursos'] else ''),e['peso'],e['tipo'],st,mot))
  for e in exps:
    if e.get('negado'): continue
    pro=[x for x in P.get('experiencias',[]) if x['tipo']=='profissional']
    if e['areas']!=['qualquer']: pro=[x for x in pro if set(x.get('areas',[]))&set(e['areas'])]
    m=_meses([(_mes(x['inicio']),_mes(x.get('fim'),True)) for x in pro])
    need=e['meses'] or 1
    st='sim' if m>=need else 'nao'
    if e['areas']==['qualquer'] and not e['meses']: st='verificar'
    itens.append((f"Experiência {'/'.join(e['areas'])}"+(f" ({e['meses']} meses)" if e['meses'] else ''),e['peso'],e['tipo'],st,('experiência sem área nem tempo definidos; confira' if st=='verificar' else f'perfil tem {m} meses')))
  tot=sum(i[1] for i in itens if i[3]!='verificar')
  ok=sum(i[1] for i in itens if i[3]=='sim')+SEN['credito_parcial']*sum(i[1] for i in itens if i[3]=='parcial')
  obr=[i for i in itens if i[2]=='obrigatorio' and i[3]=='nao']
  CB=D['cobertura'];nl=len(st_.get('linhas',[]));nr=len(st_.get('reconhecidas',[]))
  frac=nr/nl if nl else 1.0
  conf='alta' if frac>=CB['alta'] else ('media' if frac>=CB['media'] else 'baixa')
  return dict(percentual=round(100*ok/tot) if tot else None,itens=itens,obrigatorios_faltando=len(obr),senioridade=sen,senioridade_origem=origem,
    cobertura=dict(linhas=nl,reconhecidas=nr,confianca=conf,nao_reconhecidas=st_.get('nao_reconhecidas',[])))
def imprimir(r):
  c=r['cobertura']
  print(f"  COMPATIBILIDADE: {r['percentual']}%  | obrigatórios não atendidos: {r['obrigatorios_faltando']} | vaga: {r['senioridade']} | cobertura: {c['reconhecidas']}/{c['linhas']} ({c['confianca']})")
  for l in c['nao_reconhecidas']: print('     não reconhecida:',l[:90])
  for n,p,t,st,m in sorted(r['itens'],key=lambda i:(i[3]!='sim',-i[1])):
    print(f"   [{ {'sim':'OK ','nao':'X  ','verificar':'?  ','parcial':'½  '}[st]}] {n:45} peso {p:<4} {t:11} {m}")

if __name__=='__main__':
  if len(sys.argv)==3 and sys.argv[1]=='--validar':
    er,av=validar_perfil(json.load(open(sys.argv[2])))
    for e in er: print('  ERRO :',e)
    for a in av: print('  AVISO:',a)
    print('  perfil válido' if not er else f'  perfil inválido ({len(er)} erros)')
  elif len(sys.argv)>2:
    imprimir(comparar(json.load(open(sys.argv[2])),open(sys.argv[1]).read()))
  else:
    r,es,ex=analisar(open(sys.argv[1]).read())
    for k,v in r.items(): print(f"  {k:26} {v}")
    for e in es: print('  ESCOLARIDADE',e)
    for e in ex: print('  EXPERIENCIA ',e)
