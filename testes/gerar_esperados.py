# Gera testes/casos.json a partir da saída ATUAL do motor (snapshot revisado manualmente).
import json,sys,os,glob
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import motor_referencia as M
M.HOJE=2026*12+11-1
P=json.load(open('perfil_exemplo.json'));casos=[]
for f in sorted(glob.glob('testes/vagas/*.txt')):
  nome=os.path.basename(f)[:-4];txt=open(f).read()
  res,escs,exps=M.analisar(txt)
  caso={'vaga':nome,'analise':{'requisitos':{k:{x:v[x] for x in v if x not in('termo',)} for k,v in res.items()},'escolaridade':escs,'experiencia':exps}}
  if nome.startswith('v_'):
    r=M.comparar(P,txt)
    caso['comparacao']={'percentual':r['percentual'],'obrigatorios_faltando':r['obrigatorios_faltando'],'itens':{i[0]:i[3] for i in r['itens']},'confianca':r['cobertura']['confianca'],'cobertura':[r['cobertura']['reconhecidas'],r['cobertura']['linhas']]}
  casos.append(caso)
OPS=[('v_sem_nivel_curso',{}),('v_sem_nivel_curso',{'cargo':'Analista de Dados Júnior'}),('v_sem_nivel_curso',{'senioridade':'entrada'}),('v_sem_nivel_curso',{'senioridade':'acima','cargo':'Analista Júnior'}),('v_sem_nivel_curso',{'cargo':'Analista de Dados Sênior'}),('v_pleno_dados',{'cargo':'Analista Júnior'})]
nivel=[]
for v,op in OPS:
  r=M.comparar(P,open(f'testes/vagas/{v}.txt').read(),**op)
  nivel.append({'vaga':v,'opcoes':op,'percentual':r['percentual'],'senioridade':r['senioridade'],'origem':r['senioridade_origem']})
json.dump({'data_referencia':'2026-11','perfil':'perfil_exemplo.json','casos':casos,'nivel_da_vaga':nivel},open('testes/casos.json','w'),ensure_ascii=False,indent=1)
print(len(casos),'casos gravados')
