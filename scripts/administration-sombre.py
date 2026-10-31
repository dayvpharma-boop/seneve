"""Génère src/styles-administration-sombre.css : version sombre des pages d'administration,
dérivée des feuilles existantes (couleurs claires -> couleurs sombres SÉNEVÉ), limitée à l'administration."""
import re,sys
FICHIERS=['styles-administration-bureau.css','styles-administration-mobile.css','styles-administration-tableau.css','styles-pilotage-maquette.css','styles-etats-administration.css','styles-edition-administration.css','styles-registres-administration.css','styles-recommandations-administration.css','styles-registres-fideles.css','styles-tableau-fidele.css']
RACINES=['.admin-maquette','.am-page','.af-page','.admin-fidele','.ae-page']
TEXTE={'000':'f5f5f5','000000':'f5f5f5','1d1c13':'f5f5f5','4a463f':'bfbdbe','755b00':'e6c364','785d00':'e6c364','ba1a1a':'ffb4ab','93000a':'ffdad6','fff':'121212','ffffff':'121212'}
FOND={'fff':'232122','ffffff':'232122','f9f3e4':'2a2829','f3edde':'2a2829','eee8d9':'353334','e8e2d3':'353334','fff9ea':'121212','fffdf6':'232122','f5f7fe':'121212','000':'f5f5f5','000000':'f5f5f5','1d1c13':'f5f5f5','ffdad6':'5c1a16','755b00':'e6c364','785d00':'e6c364'}
TRAIT={'ccc6bd':'3d3b3c','eee8d9':'3d3b3c','e8e2d3':'3d3b3c','d0c5b2':'3d3b3c','ded6c4':'3d3b3c','aaa08a':'8a8788','000':'8a8788','000000':'8a8788','1d1c13':'8a8788','4a463f':'8a8788','755b00':'e6c364','fff':'232122','ffffff':'232122'}
HEX=re.compile(r'#([0-9a-fA-F]{3,8})\b')
def table(prop):
  p=prop.strip().lower()
  if p in('color','caret-color','fill','stroke','-webkit-text-fill-color','text-decoration-color'):return TEXTE
  if p.startswith('background'):return FOND
  if p.startswith('border') or p.startswith('outline'):return TRAIT
  return None
def convertir(valeur,t):
  ok=[False]
  def r(m):
    h=m.group(1).lower();base,alpha=(h[:6],h[6:]) if len(h)==8 else (h,'')
    if base in t: ok[0]=True;return '#'+t[base]+alpha
    return m.group(0)
  v=HEX.sub(r,valeur)
  # Couleurs nommées (white, black) : mêmes équivalences que #fff et #000.
  def nom(m):
    h={'white':'fff','black':'000'}[m.group(1).lower()]
    if h in t: ok[0]=True;return '#'+t[h]
    return m.group(0)
  v=re.sub(r'(?<![-\w])(white|black)(?![-\w])',nom,v,flags=re.I)
  return v if ok[0] else None
def separer(t):
  parts,prof,cur=[],0,''
  for c in t:
    if c=='(':prof+=1
    elif c==')':prof-=1
    if c==',' and prof==0:parts.append(cur);cur=''
    else:cur+=c
  parts.append(cur);return [x for x in parts if x.strip()]
def portee(sel):
  sel=sel.strip()
  if any(r in sel for r in RACINES):return ':root[data-apparence="sombre"] '+sel
  return ':root[data-apparence="sombre"] :is('+','.join(RACINES)+') '+sel
def regles(css):
  css=re.sub(r'/\*.*?\*/','',css,flags=re.S);i=0;n=len(css)
  while i<n:
    j=css.find('{',i)
    if j<0:break
    tete=css[i:j].strip()
    if tete.startswith('@'):
      prof=1;k=j+1
      while prof and k<n:
        prof+= {'{':1,'}':-1}.get(css[k],0);k+=1
      if tete.startswith('@media') or tete.startswith('@supports'):
        for s,d in regles(css[j+1:k-1]):yield (tete+'|'+s if '|' not in s else s),d
      i=k;continue
    k=css.find('}',j);yield tete,css[j+1:k];i=k+1
def generer(dossier):
  sortie=['/* Mode sombre de l’administration (31/10/2026), généré par scripts/administration-sombre.py (python3 scripts/administration-sombre.py src) à partir des feuilles claires. */',
   ':root[data-apparence="sombre"] body:has(:is(.admin-maquette,.am-page,.af-page,.ae-page)){background:#121212;color:#f5f5f5}']
  for f in FICHIERS:
    for tete,corps in regles(open(dossier+'/'+f).read()):
      if tete.startswith('@') and '|' not in tete:continue
      media=None
      if '|' in tete:media,tete=tete.split('|',1)
      if tete.startswith('@') or not tete:continue
      decl=[]
      for d in corps.split(';'):
        if ':' not in d:continue
        prop,val=d.split(':',1);t=table(prop)
        if not t:continue
        nv=convertir(val,t)
        if nv:decl.append(f'{prop.strip()}:{nv.strip()}')
      if not decl:continue
      sel=','.join(portee(s) for s in separer(tete))
      regle=sel+'{'+';'.join(decl)+'}'
      sortie.append(f'{media}{{{regle}}}' if media else regle)
  return '\n'.join(sortie)+'\n'
if __name__=='__main__':
  open(sys.argv[1]+'/styles-administration-sombre.css','w').write(generer(sys.argv[1]))
