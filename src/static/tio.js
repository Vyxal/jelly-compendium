function pako_deflate(data) {
  return pako.deflateRaw(data, {"level": 9});
}

function tio_encode(data) {
  return pako_deflate(new TextEncoder("utf-8").encode(data));
}

function to_base64(data) {
  return btoa([...data].map(function(byte) {
    return String.fromCharCode(byte);
  }).join("")).replaceAll("+", "@").replaceAll("=", "");
}

function from_base64(data) {
  return new Uint8Array([...atob(decodeURIComponent(data).replaceAll("@", "+"))].map(function(char) {
    return char.charCodeAt(0);
  }));
}

function convert_bytearray(bytes) {
  var array = new Uint8Array(bytes.length);
  for (var x = 0; x < bytes.length; x++) {
    array[x] = bytes.charCodeAt(x);
  }
  array.head = 0;
  return array;
}

async function TIO(code, input, flags) {
  let encoder = new TextEncoder("utf-8");
  let decoder = new TextDecoder("utf-8");

  let code_length = encoder.encode(code).length;
  let input_length = encoder.encode(input).length;
  let flags_length = flags.length;

  let request_body = "Vlang\x001\x00jelly\x00F.code.tio\x00" + code_length + "\x00" + code + "F.input.tio\x00" + input_length + "\x00" + input + "Vargs\x00" + flags_length + flags.map(function(flag) {
    return "\x00" + flag;
  }).join("") + "\x00R";

  let response = await fetch("https://tio.run/cgi-bin/run/api/", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    },
    "body": tio_encode(request_body)
  });

  let read = (await response.body.getReader().read()).value;
  let text = decoder.decode(read);
  return text.slice(16).split(text.slice(0, 16));
}

function tio_permalink(header, code, footer, input, args) {
  var state = "jelly";

  function insert(x) {
    state += "\xff" + window.unescape(window.encodeURIComponent(x));
  }

  [header, code, footer, input, ...args].forEach(insert);

  return "https://tio.run/##" + to_base64(pako_deflate(convert_bytearray(state)));
}

window.last_focus = "code";

$(document).ready(function() {
  var collapsible = M.Collapsible.getInstance(document.getElementById("boxes"));

  if (window.location.hash) {
    var [header, code, footer, stdin, arguments] = decode(window.location.hash.substring(1));
    $("#header").val(header);
    $("#code").val(code);
    $("#footer").val(footer);
    $("#stdin").val(stdin);
    if (header) collapsible.open(1);
    if (footer) collapsible.open(3);
    if (stdin) collapsible.open(4);
    if (arguments.length) collapsible.open(5);
    for (var x of arguments) {
      add_argument(document.getElementById("append-argument")).children[1].children[0].value = x;
    }
    updateAll();
    update_explain_link();
  }

  $(".add-argument").click(function(e) {
    add_argument(e.currentTarget);
  });
  $(".rm-argument").click(function(e) {
    rm_argument(e.currentTarget);
  });
  $(".tio-field").on("input", function(e) {
    field_updated(e.currentTarget);
    update_explain_link();
  });
  $("#header, #code, #footer, #stdin, .argument").on("focusin", function(e) {
    window.last_focus = e.currentTarget.id;
  });
  $(document).keydown(function(e) {
    if (e.ctrlKey && e.keyCode == 13) {
      e.preventDefault();
      run();
    }
  });
});

function field_updated(element) {
  var label = element.parentNode.parentNode.parentNode.children[0].children[1];
  var bytes = element.value.length;
  label.innerHTML = label.innerHTML.replace(/\d+ bytes?/, bytes + " byte" + "s".repeat(bytes != 1));
}

var counter = 0;
function add_argument(e) {
  counter++;
  var outer_box = document.createElement("div");
  outer_box.innerHTML = "<div class='col s1'><button class='waves-effect green btn add-argument'><i class='material-icons'>add</i></button></div><div class='col s10 input-field argument-inline'><textarea id='argument-field-" + counter + "' class='materialize-textarea monospace argument'></textarea></div><div class='col s1'><button class='waves-effect green btn rm-argument'><i class='material-icons'>remove</i></button></div>";
  outer_box.classList = "argument-box row center-contents";
  $(outer_box).insertBefore(e.parentNode);
  $(outer_box.children[0]).click(function(e) {
    add_argument(e.currentTarget);
  });
  $(outer_box.children[1].children[0]).on("focusin", function(e) {
    window.last_focus = e.currentTarget.id;
  });
  $(outer_box.children[2]).click(function(e) {
    rm_argument(e.currentTarget);
  });
  update_argument_count();
  return outer_box;
}

function rm_argument(e) {
  e.parentNode.remove();
  update_argument_count();
}

function update_argument_count() {
  update_explain_link();
  var args = document.querySelectorAll(".argument-box").length;
  if (args == 0) {
    $("#args-label").text("Arguments (Niladic)");
  } else if (args == 1) {
    $("#args-label").text("Arguments (Monadic)");
  } else if (args == 2) {
    $("#args-label").text("Arguments (Dyadic)");
  } else {
    $("#args-label").text("Arguments (Dyadic, " + (args - 2) + " extra argument" + "s".repeat(args != 3) + ")");
  }
}

function get_code() {
  var header = $("#header").val();
  var code = $("#code").val();
  var footer = $("#footer").val();

  return (header && (header + "\n")) + code + (footer && ("\n" + footer));
}

var canceled = {};
var seshcounter = 0;
var running = false;

function run() {
  if (running) {
    canceled[seshcounter] = true;
    running = false;

    $("#run").text("RUN");
    $("#stdout").val("");
    $("#stderr").val("request canceled by user");

    updateAll();

    return;
  }

  running = true;

  seshcounter++;

  $("#run").text("RUNNING...");

  var code = get_code();

  var arguments = [...$(".argument")].map(function(e) {
    return e.value;
  });

  (function(sid, code, arguments) {
    TIO(code, $("#stdin").val(), arguments).then(function(result) {
      if (canceled[sid]) return;

      running = false;

      $("#stdout").val(result[0]);
      $("#stderr").val(result[1]);

      updateAll();

      $("#run").text("RUN");
    });
  })(seshcounter, code, arguments);
}

function updateAll() {
  for (var id of ["header", "code", "footer", "stdin", "stdout", "stderr"]) {
    M.textareaAutoResize($("#" + id));
    field_updated(document.getElementById(id));
  }
}

function type(char) {
  var target = document.getElementById(window.last_focus);

  var chars = [...target.value];
  chars.splice(target.selectionStart, target.selectionEnd - target.selectionStart, [char]).join("");
  target.value = chars.join("");

  field_updated(target);

  target.focus();
  M.textareaAutoResize($(target));
}

function encode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function decode(str) {
  return JSON.parse(decodeURIComponent(escape(atob(str))));
}

function url() {
  var items = [$("#header").val(), $("#code").val(), $("#footer").val(), $("#stdin").val(), [...$(".argument")].map(function(x) {
    return x.value;
  })];
  return "#" + encode(items);
}

function scroll() {
  $("html, body").animate({
    scrollTop: $("#stdout").offset().top
  });
}

function link() {
  document.location = url();
  $("#stdout").val(window.location).select().focus();
  updateAll();
  scroll();
}

function format() {
  document.location = url();
  var code = $("#code").val();
  $("#stdout").val("# [Jelly], " + code.length + " byte" + "s".repeat(code.length != 1) + "\n\n" + (code.length ? code.split("\n").map(function(line) {
    return "    " + line;
  }).join("\n") : "<pre><code></code></pre>") + "\n\n[Try It Online!](" + document.location + ")\n\n[Jelly]: https://github.com/DennisMitchell/jellylanguage").select().focus();
  updateAll();
  scroll();
}

function cmc() {
  document.location = url();
  var code = $("#code").val().replace("\n", "¶");
  $("#stdout").val("Jelly, " + code.length + " byte" + "s".repeat(code.length != 1) + ": `" + code.replaceAll("`", "\\`") + "` ([Try It Online!](" + document.location + "))").select().focus();
  updateAll();
  scroll();
}

function get_md5() {
  document.location = url();
  var code = $("#code").val().replace("\n", "¶");
  $("#stdout").val(md5(code)).select().focus();
  updateAll();
  scroll();
}

function tio() {
  window.open(tio_permalink($("#header").val(), $("#code").val(), $("#footer").val(), $("#stdin").val(), [...$(".argument")].map(function(e) {
    return e.value;
  })));
}

function update_explain_link() {
  var code = get_code();
  var arity = Math.min(2, $(".argument").length);
  document.getElementById("explainlink").href = "/explain?code=" + encodeURIComponent(escape(code)) + "&arity=" + arity;
}
