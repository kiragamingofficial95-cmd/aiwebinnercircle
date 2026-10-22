import re
src=open('src/data/transcripts.ts',encoding='utf-8').read()
contents=re.findall(r'content:\s*`([\s\S]*?)`', src)
print('num transcripts:', len(contents))
total=sum(len(c) for c in contents)
print('total chars:', total)
print('avg:', total//len(contents))
print('first 5 lengths:', [len(c) for c in contents[:5]])
PY