# Junta index.html y assets/*.js en una sola página (para publicarla en claude.ai).
# Uso: python3 tools/empaquetar.py salida.html
import re, sys
import os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
s = open(root + "index.html").read()
title = re.search(r"<title>.*?</title>", s, re.S).group(0)
links = "\n".join(re.findall(r'<link [^>]*fonts\.(?:googleapis|gstatic)[^>]*>', s))
style = re.search(r"<style>.*?</style>", s, re.S).group(0)
body = re.search(r"<body>(.*)</body>", s, re.S).group(1)
def inline(m):
    return "<script>\n" + open(root + m.group(1)).read().replace("</script", "<\\/script") + "\n</script>"
body = re.sub(r'<script src="(assets/[^"]+)"></script>', inline, body)
out = title + "\n" + links + "\n" + style + "\n" + body
open(sys.argv[1], "w").write(out)
print(len(out), "bytes")
