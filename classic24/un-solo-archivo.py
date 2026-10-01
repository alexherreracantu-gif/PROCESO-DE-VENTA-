# Arma la app completa en UN solo archivo HTML (estilos, código e ícono adentro).
# Sirve para abrirla en la compu con doble clic o subirla a cualquier hosting gratis.
# Uso: python3 classic24/un-solo-archivo.py classic24-app.html
import base64, os, re, sys

aqui = os.path.dirname(os.path.abspath(__file__))
leer = lambda n: open(os.path.join(aqui, n), encoding="utf-8").read()
html = leer("index.html")
icono = base64.b64encode(open(os.path.join(aqui, "icons/icon-180.png"), "rb").read()).decode()
html = html.replace('<link rel="manifest" href="manifest.webmanifest" />\n', "")
html = html.replace('href="icons/icon-180.png"', 'href="data:image/png;base64,' + icono + '"')
html = html.replace('<link rel="stylesheet" href="styles.css" />', "<style>\n" + leer("styles.css") + "</style>")
js = leer("app.js").replace("</script", "<\\/script")
html = html.replace('<script src="app.js"></script>', "<script>\n" + js + "\n</script>")
open(sys.argv[1], "w", encoding="utf-8").write(html)
print(len(html), "bytes →", sys.argv[1])
