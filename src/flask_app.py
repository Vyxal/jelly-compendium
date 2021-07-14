from page_generators import *

from flask import Flask, abort, render_template
from flask_cors import CORS

from jinja2.exceptions import TemplateNotFound

import unicodedata

app = Flask(__name__)
CORS(app)

@app.route("/")
def serve_root():
    return render_template("index.html")

@app.route("/codepage")
def serve_codepage():
    return render_template("codepage.html", codepage = codepage)

@app.route("/codepage/<int:index>")
def serve_charpage(index):
    if index == 32:
        return render_template("spacepage.html")
    if index == 10:
        return render_template("newlinepage.html")
    if 0 <= index < 256:
        char = codepage[index]
        return render_template("charpage.html", data = charmap[char], char = char, charname = unicodedata.name(char), shortcuts = ", ".join(f"<code>{k}</code>" for k in shortcuts if shortcuts[k] == char))
    abort(404)

@app.route("/misc/<id>")
def serve_misc(id):
    try:
        return render_template(f"misc/{id}.html", **({"shortcuts": shortcuts} if id in ["char-combos", "string-compressor"] else {}))
    except TemplateNotFound:
        abort(404)

@app.route("/<category>/<id>")
def serve_category(category, id):
    if category not in ["elements", "modifiers", "structures"]:
        abort(404)
    if id not in data[category]:
        abort(404)
    return render_template(f"{category}.html", codepage = codepage, data = data[category][id])

@app.route("/search")
def serve_search():
    return render_template("search.html", data = sorted([{**item, "type": category} for category, values in data.items() for item in values.values()], key = lambda x: list(map(codepage.find, x["symbol"]))), tags = sorted({tag for category in ["elements", "modifiers", "structures"] for item in data[category].values() for tag in item["tags"]}), taginfo = tags)

@app.route("/resources")
def serve_resources():
    return render_template("resources.html")

@app.route("/beginners")
def serve_beginners():
    return render_template("beginners.html")

@app.route("/tio")
def serve_tio():
    return render_template("tryit.html", codepage = codepage, shortcuts = shortcuts)

@app.route("/explain")
def serve_explain():
    return render_template("explain.html")

@app.errorhandler(404)
def serve_404(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def serve_500(e):
    return render_template("500.html"), 500

if __name__ == "__main__":
    import sys
    if "port" in sys.argv:
        app.run(port = int(sys.argv[sys.argv.index("port") + 1]))
    else:
        app.run()
