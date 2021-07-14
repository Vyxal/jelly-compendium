let codepage  = "¡¢£¤¥¦©¬®µ½¿€ÆÇÐÑ×ØŒÞßæçðıȷñ÷øœþ !\"#$%&'()*+,-./0123456789:;<=>?";
    codepage += "@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~¶";
    codepage += "°¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ƁƇƊƑƓƘⱮƝƤƬƲȤɓƈɗƒɠɦƙɱɲƥʠɼʂƭʋȥẠḄḌẸḤỊḲḶṂṆỌṚṢṬỤṾẈỴẒȦḂ";
    codepage += "ĊḊĖḞĠḢİĿṀṄȮṖṘṠṪẆẊẎŻạḅḍẹḥịḳḷṃṇọṛṣṭ§Äẉỵẓȧḃċḋėḟġḣŀṁṅȯṗṙṡṫẇẋẏż«»‘’“”";

let dictmap = {
  "short": {},
  "long": {}
}

for (var x in dictionary.short) {
  dictmap.short[dictionary.short[x]] = x;
}

for (var x in dictionary.long) {
  dictmap.long[dictionary.long[x]] = x;
}

var warning = false;
var live = true;

function field_updated(element, force = false) {
  if (!live && !force) return;
  var value = element.value;
  if ([...value].some(function(x) {
    return x != "\n" && codepage.indexOf(x) == -1;
  })) {
    $("#failed").show();
    $("#outputbox").hide();
    $("#warning").hide();
  } else {
    $("#failed").hide();
    $("#outputbox").show();
    if (value.match(/^\s*$/)) {
      $("#output").val("");
      $("#warning").hide();
    } else {
      if (value.replace(/"(\\.|[^"])*"|'(\\.|[^'])*'/g, "").match(/^[\[\],\s]*$/)) {
        try {
          value = eval("[" + value + "]");
          if (value.length == 1) value = value[0];
        } catch {

        }
      }
      warning = false;
      $("#output").val(compress(pilcrowify(value)));
      if (warning) {
        $("#warning").show();
      } else {
        $("#warning").hide();
      }
    }
  }
  M.textareaAutoResize($("#output"));
}

function toggle_live() {
  live ^= true;
  $("#toggle-live").html((live ? "DISABLE" : "ENABLE") + " LIVE COMPRESSION");
  $("#update").prop("disabled", live);
}

$(document).ready(function() {
  $("#value").on("input", function(e) {
    field_updated(e.currentTarget);
  });
});

function compress(value, surround_list = false) {
  return "TODO";
  var converted = "";
  for (var f of [trivial, char_list, double_char, compressed_string]) {
    var c = f(value);
    if (c && (converted == "" || c.length < converted.length)) {
      converted = c;
    }
  }
  if (Array.isArray(value)) {
    var list_form = value.map(function(sub) {
      return compress(sub, true);
    }).join(",");
    if (surround_list || value.length == 1) {
      list_form = "[" + list_form + "]";
    }
    if (list_form && (converted == "" || list_form.length < converted.length)) {
      converted = list_form;
    }
  }
  return converted;
}

function pilcrowify(x) {
  if (Array.isArray(x)) {
    return x.map(pilcrowify);
  }
  return x.replaceAll("\n", "¶");
}

function trivial(value) {
  if (Array.isArray(value) && value.every(function(x) {
    return !Array.isArray(x) && [..."«»‘’“”"].every(function(k) {
      return x.indexOf(k) == -1;
    })
  })) {
    var k = value.map(function(x) {
      return "“" + x;
    }).join("") + "”";
    if (value.length == 1) {
      return "[" + k + "]";
    } else {
      return k;
    }
  } else if (!Array.isArray(value) && [..."«»‘’“”"].every(function(k) {
    return value.indexOf(k) == -1;
  })) {
    return "“" + value + "”";
  }
}

function char_list(value) {
  if (!Array.isArray(value)) {
    if (value.length == 1) {
      return "[”" + value + "]";
    } else {
      return [...value].map(function(x) {
        return "”" + x;
      }).join(",");
    }
  }
}

function double_char(value) {
  if (!Array.isArray(value) && value.length == 2) {
    return "⁾" + value;
  }
}

var cache = {}

function compressed_string(value) {
  if (Array.isArray(value) && value.every(function(x) {
    return !Array.isArray(x) && [...x].every(function(k) {
      return codepage.indexOf(k) >= 32 && codepage.indexOf(k) < 128;
    });
  })) {
    var k = value.map(function(x) {
      var k = compressed_string(x);
      return k.substring(0, k.length - 1);
    }).join("") + "»";
    if (value.length == 1) return "[" + k + "]";
    return k;
  } else if (!Array.isArray(value) && [...value].every(function(x) {
    return codepage.indexOf(x) >= 32 && codepage.indexOf(x) < 128;
  })) {
    if (value[value.length - 1] === " ") warning = true;
    var integer = recompress(value)[0];
    builder = "»";
    while (integer) {
      var digit = (integer % 250n) || 250n;
      integer -= digit;
      integer /= 250n;
      builder = codepage[digit - 1n] + builder;
    }
    return "“" + builder;
  }
}

let MAX_DICT_LEN = 58;
let SHORT_SIZE = 20453n;
let LONG_SIZE = 227845n;

function recompress(string) {
  if (string == "") return [0n, 1n];
  if (cache[string] !== undefined) return cache[string];
  // trivially insert the last character in (mode 0)
  var last = recompress(string.substring(0, string.length - 1));
  var best = [last[0] + last[1] * 3n * BigInt(string[string.length - 1] == "¶" || string[string.length - 1] == "\n" ? 95 : string.charCodeAt(string.length - 1) - 32), last[1] * 3n * 96n];
  // console.log("TRIVIAL", string, best);
  // insert the last word in unmodified (mode 1)
  for (var lookback = 1; lookback <= MAX_DICT_LEN; lookback++) {
    if (lookback > string.length) {
      break;
    } else if (lookback == string.length) {
      var find = string;
      var rem = "";
    } else {
      if (string[string.length - lookback - 1] != " ") continue;
      var find = string.substring(string.length - lookback);
      var rem = string.substring(0, string.length - lookback - 1);
    }
    if (dictmap.short[find] !== undefined) {
      var last = recompress(rem);
      var idea = last[0] + last[1] * (1n + 3n * (1n + 2n * BigInt(dictmap.short[find])));
      if (idea < best[0]) {
        best[0] = idea;
        best[1] = last[1] * 3n * 2n * SHORT_SIZE;
        // console.log("SHORT-NORMAL", string, best);
      }
    } else if (dictmap.long[find] !== undefined) {
      var last = recompress(rem);
      var idea = last[0] + last[1] * (1n + 3n * (2n * BigInt(dictmap.long[find])));
      if (idea < best[0]) {
        best[0] = idea;
        best[1] = last[1] * 3n * 2n * LONG_SIZE;
        // console.log("LONG-NORMAL", string, best);
      }
    }
  }
  // insert the last word with flags
  for (var lookback = 1; lookback <= MAX_DICT_LEN; lookback++) {
    if (lookback > string.length) break;
    for (var flag = 0n; flag < 3n; flag++) {
      var find = string.substring(string.length - lookback);
      if (flag != 1n) find = (find[0] == find[0].toUpperCase() ? find[0].toLowerCase() : find[0].toUpperCase()) + find.substring(1);
      if (flag != 0n) {
        if (lookback + 1 == string.length && string[0] == " ") {
          var rem = "";
        } else {
          var rem = string.substring(0, string.length - lookback);
        }
      } else {
        if (lookback == string.length) {
          var rem = "";
        } else if (string[string.length - lookback - 1] != " ") {
          continue;
        } else {
          rem = string.substring(0, string.length - lookback - 1);
        }
      }
      if (dictmap.short[find] !== undefined) {
        var last = recompress(rem);
        var idea = last[0] + last[1] * (2n + 3n * (flag + 3n * (1n + 2n * BigInt(dictmap.short[find]))));
        if (idea < best[0]) {
          best[0] = idea;
          best[1] = last[1] * 3n * 3n * 2n * SHORT_SIZE;
          // console.log("SHORT-FLAGGED", string, best);
        }
      } else if (dictmap.long[find] !== undefined) {
        var last = recompress(rem);
        var idea = last[0] + last[1] * (2n + 3n * (flag + 3n * (2n * BigInt(dictmap.long[find]))));
        if (idea < best[0]) {
          best[0] = idea;
          best[1] = last[1] * 3n * 3n * 2n * LONG_SIZE;
          // console.log("LONG-FLAGGED", string, best);
        }
      }
    }
  }
  return cache[string] = best;
}
