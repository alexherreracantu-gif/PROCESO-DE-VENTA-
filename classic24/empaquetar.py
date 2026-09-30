# Junta index.html, styles.css y app.js en una sola página para publicarla en claude.ai.
# Uso: python3 classic24/empaquetar.py salida.html
import os, re, sys

aqui = os.path.dirname(os.path.abspath(__file__))
leer = lambda n: open(os.path.join(aqui, n), encoding="utf-8").read()
html = leer("index.html")
titulo = re.search(r"<title>.*?</title>", html, re.S).group(0)
cuerpo = re.search(r"<body>(.*)</body>", html, re.S).group(1)
css = leer("styles.css")
# Dentro de claude.ai la página ya trae el margen del notch en :root; la barra superior solo se pega debajo.
css += "\n.topbar{top:env(safe-area-inset-top,0px);padding-top:12px}\n"
js = "window.C24_EMBED = true;\n" + leer("app.js")
cuerpo = cuerpo.replace('<script src="app.js"></script>', "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>")
salida = titulo + "\n<style>\n" + css + "</style>\n" + cuerpo.strip() + "\n"
open(sys.argv[1], "w", encoding="utf-8").write(salida)
print(len(salida), "bytes →", sys.argv[1])
