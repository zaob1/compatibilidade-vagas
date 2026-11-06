# Suíte de regressão: compara o motor atual com os resultados esperados e valida perfis.
import json,sys,os,glob
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));sys.path.insert(0,BASE);os.chdir(BASE)
import motor_referencia as M
C=json.load(open('testes/casos.json'));a,m=C['data_referencia'].split('-');M.HOJE=int(a)*12+int(m)-1
P=json.load(open(C['perfil']));falhas=0;total=0
def falha(msg):
  global falhas;falhas+=1;print('  FALHOU',msg)
for c in C['casos']:
  txt=open(f"testes/vagas/{c['vaga']}.txt").read();total+=1
  res,escs,exps=M.analisar(txt)
  obt={'requisitos':{k:{x:v[x] for x in v if x!='termo'} for k,v in res.items()},'escolaridade':escs,'experiencia':exps}
  obt=json.loads(json.dumps(obt))
  if obt!=c['analise']: falha(f"{c['vaga']}: leitura da vaga mudou")
  if 'comparacao' in c:
    total+=1;r=M.comparar(P,txt);e=c['comparacao']
    it={i[0]:i[3] for i in r['itens']}
    if r['cobertura']['confianca']!=e['confianca'] or [r['cobertura']['reconhecidas'],r['cobertura']['linhas']]!=e['cobertura']: falha(f"{c['vaga']}: cobertura mudou ({e['cobertura']} {e['confianca']} -> {r['cobertura']['reconhecidas']}/{r['cobertura']['linhas']} {r['cobertura']['confianca']})")
    if r['percentual']!=e['percentual'] or it!=e['itens']:
      falha(f"{c['vaga']}: comparação mudou ({e['percentual']}% -> {r['percentual']}%)")
      for k in set(it)|set(e['itens']):
        if it.get(k)!=e['itens'].get(k): print(f"         {k}: esperado {e['itens'].get(k)}, obtido {it.get(k)}")
for c in C.get('nivel_da_vaga',[]):
  total+=1;r=M.comparar(P,open(f"testes/vagas/{c['vaga']}.txt").read(),**c['opcoes'])
  if [r['percentual'],r['senioridade'],r['senioridade_origem']]!=[c['percentual'],c['senioridade'],c['origem']]: falha(f"nível da vaga {c['vaga']} {c['opcoes']}: esperado {c['percentual']}% {c['senioridade']}/{c['origem']}, obtido {r['percentual']}% {r['senioridade']}/{r['senioridade_origem']}")
er,_=M.validar_perfil(P);total+=1
if er: falha('perfil principal inválido: '+'; '.join(er))
for f in sorted(glob.glob('testes/perfil_quebrado_*.json')):
  total+=1;er,_=M.validar_perfil(json.load(open(f)))
  if not er: falha(f'{os.path.basename(f)}: erro não detectado')
print(f'{total-falhas}/{total} testes passaram' + ('' if not falhas else f' — {falhas} FALHAS'))
sys.exit(1 if falhas else 0)
