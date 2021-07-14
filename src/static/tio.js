function execute(header, code, footer, flags, input, callback) {
  $.get("https://lyxal.pythonanywhere.com", function(value) {
    var head = value.indexOf("<session-code>");
    var tail = value.indexOf("</session-code>");
    var session = value.substring(head + 14, tail);
    $.post("https://lyxal.pythonanywhere.com/execute", {
      header: header,
      code: code,
      footer: footer,
      flags: flags,
      inputs: input,
      session: session
    }, function(value) {
      callback([value.stdout, value.stderr]);
    });
  });
}

function vyxal_permalink(header, code, footer, flags, input) {
    var undone_url = "?flags=" + flags + "&code=" + encodeURIComponent(code) + "&inputs=" + encodeURIComponent(input);
    undone_url += "&header=" + encodeURIComponent(header) + "&footer=" + encodeURIComponent(footer);

    return "https://lyxal.pythonanywhere.com" + undone_url.replaceAll("(", "%28").replaceAll("[", "%5B").replaceAll("]", "%5D").replaceAll(")", "%29");
}

window.last_focus = "code";

$(document).ready(function() {
  var collapsible = M.Collapsible.getInstance(document.getElementById("boxes"));

  if (window.location.hash) {
    var [header, code, footer, flags, stdin] = decode(window.location.hash.substring(1));
    $("#header").val(header);
    $("#code").val(code);
    $("#footer").val(footer);
    $("#flags").val(flags);
    $("#stdin").val(stdin);
    if (header) collapsible.open(1);
    if (footer) collapsible.open(3);
    if (flags) collapsible.open(4);
    if (stdin) collapsible.open(5);
    updateAll();
  }

  $(".tio-field").on("input", function(e) {
    field_updated(e.currentTarget);
  });

  $("#header, #code, #footer, #flags, #stdin").on("focusin", function(e) {
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
  if (element.id === "flags") return;
  var label = element.parentNode.parentNode.parentNode.children[0].children[1];
  var bytes = element.value.length;
  label.innerHTML = label.innerHTML.replace(/\d+ bytes?/, bytes + " byte" + "s".repeat(bytes != 1));
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

  (function(sid, header, code, footer, flags) {
    execute(header, code, footer, flags, $("#stdin").val(), function(result) {
      if (canceled[sid]) return;

      running = false;

      $("#stdout").val(result[0]);
      $("#stderr").val(result[1]);

      updateAll();

      $("#run").text("RUN");
    });
  })(seshcounter, $("#header").val(), $("#code").val(), $("#footer").val(), $("#flags").val());
}

function updateAll() {
  for (var id of ["header", "code", "footer", "flags", "stdin", "stdout", "stderr"]) {
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
  var items = [$("#header").val(), $("#code").val(), $("#footer").val(), $("#flags").val(), $("#stdin").val()];
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
  var flags = $("#flags").val();
  $("#stdout").val("# [Vyxal]" + (flags.length ? " `" + flags + "`" : "") + ", " + code.length + " byte" + "s".repeat(code.length != 1) + "\n\n" + (code.length ? code.split("\n").map(function(line) {
    return "    " + line;
  }).join("\n") : "<pre><code></code></pre>") + "\n\n[Try It Online!](" + document.location + ")\n\n[Vyxal]: https://github.com/Vyxal/Vyxal").select().focus();
  updateAll();
  scroll();
}

function cmc() {
  document.location = url();
  var code = $("#code").val();
  var flags = $("#flags").val();
  $("#stdout").val("Vyxal" + (flags.length ? " `" + flags + "`" : "") + ", " + code.length + " byte" + "s".repeat(code.length != 1) + ": `" + code.replaceAll("`", "\\`") + "` ([Try It Online!](" + document.location + "))").select().focus();
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
  window.open(vyxal_permalink($("#header").val(), $("#code").val(), $("#footer").val(), $("#flags").val(), $("#stdin").val()));
}

function explain() {
  alert("This feature is not implemented!");
}
