# Junta una página y sus assets/*.js en un solo archivo (para publicarla en claude.ai).
# Uso: python3 tools/empaquetar.py salida.html               (empaqueta index.html)
#      python3 tools/empaquetar.py portal.html salida.html   (empaqueta otra página)
import re, sys
import os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
entrada, salida = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ("index.html", sys.argv[1])
s = open(root + entrada).read()
title = re.search(r"<title>.*?</title>", s, re.S).group(0)
links = "\n".join(re.findall(r'<link [^>]*fonts\.(?:googleapis|gstatic)[^>]*>', s))
style = re.search(r"<style>.*?</style>", s, re.S).group(0)
body = re.search(r"<body>(.*)</body>", s, re.S).group(1)
def inline(m):
    return "<script>\n" + open(root + m.group(1)).read().replace("</script", "<\\/script") + "\n</script>"
body = re.sub(r'<script src="(assets/[^"]+)"></script>', inline, body)
out = title + "\n" + links + "\n" + style + "\n" + body
open(salida, "w").write(out)
print(len(out), "bytes")
