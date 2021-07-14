import json

from jinja2.filters import FILTERS

with open("src/data/codepage.txt", "r") as f:
    codepage = f.read().strip()
    assert len(set(codepage)) >= 256, "the codepage is missing characters"
    assert len(codepage) <= 256, "the codepage has duplicate values or characters that do not belong"

with open("src/data/tags.json", "r") as f:
    tags = json.load(f)

with open("src/data/shortcuts.json", "r") as f:
    shortcuts = json.load(f)

data = {
    "elements": {},
    "modifiers": {},
    "structures": {}
}

charmap = {char: {
    "elements": [],
    "modifiers": [],
    "structures": [],
    "misc": [],
    "unused": True,
    "exact": False
} for char in codepage}

for key in ["elements", "modifiers", "structures"]:
    with open(f"src/data/{key}.json", "r") as f:
        category = json.load(f)
        for item in category:
            if item["id"] == "":
                continue
            if key != "misc":
                assert item["id"] not in data[key], f"duplicate ID '{item['id']}' for type '{key}'"
                data[key][item["id"]] = item
            for char in item["symbol"]:
                charmap[char][key].append(item)
                charmap[char]["unused"] = False
            if item["symbol"] in charmap:
                charmap[char]["exact"] = True

safe = FILTERS["safe"]

def charlink(char):
    return safe(f"<a href='/codepage/{codepage.index(char)}'><code>{char}</code></a>")
FILTERS["charlink"] = charlink

def taglink(tag):
    return safe(f"<a href='/search?tags={tag}'><kbd>{tag}</kbd></a>")
FILTERS["taglink"] = taglink

def _repr(item):
    return repr(item)
FILTERS["repr"] = _repr
