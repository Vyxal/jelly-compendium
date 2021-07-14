$(document).ready(function() {
  M.updateTextFields();
  update_search();

  $(".tagbox").each(function(index, element) {
    var tagname = $(element).attr("data-name");
    var taginfo = $(element).attr("data-info");
    $(element).hover(function(e) {
      if (e.type == "mouseenter") {
        $("#tag-info-header").html("<a href='/search?tags=" + tagname + "'><kbd>" + tagname + "</kbd></a>");
        $("#tag-info").html(taginfo);
      }
    });
  });

  $("input").on("input", function() {
    update_search();
  });

  $("body").on("keydown", function(e) {
    if (e.keyCode == 27) {
      $("#search-box").focus();
    }
  });
});

function get_search() {
  var include = [];
  var tags = [];
  var query = $("#search-box").val();
  var intersect = document.getElementById("switch").checked;
  $(".include").each(function(index, element) {
    if (element.checked) {
      include.push(element.getAttribute("data-category"));
    }
  });
  $(".tag").each(function(index, element) {
    if (element.checked) {
      tags.push(element.parentNode.getAttribute("data-name"));
    }
  });
  return [include, tags, query, intersect];
}

function update_search() {
  var [include, tags, query, intersect] = get_search();
  var query_args = [];
  if (query) {
    query_args.push("q=" + encodeURIComponent(query));
  }
  if (intersect) {
    query_args.push("all=1")
  }
  if (include.length) {
    query_args.push("i=" + include.map(function(x) {
      return encodeURIComponent(x);
    }).join("+"));
  }
  if (tags.length) {
    query_args.push("tags=" + tags.map(function(x) {
      return encodeURIComponent(x);
    }).join("+"));
  }
  window.history.replaceState("", "", "?" + query_args.join("&"));

  var do_major_types = include.indexOf("elements") != -1 || include.indexOf("modifiers") != -1 || include.indexOf("structures") != -1;
  var do_minor_types = include.indexOf("nilads") != -1 || include.indexOf("monads") != -1 || include.indexOf("dyads") != -1 || include.indexOf("triads") != -1;

  if (do_minor_types && !do_major_types) {
    include.push("elements");
  }

  var keywords = query.split(/\W+/).map(function(x) {
    return x.toLowerCase();
  }).filter(function(x) {
    return x.length && [
      "a", "as", "an", "and",
      "o", "or", "of",
      "t", "to", "th", "the",
      "i", "in", "is", "s",
      "f", "fr", "fro", "from",
      "fo", "for"
    ].indexOf(x) == -1;
  });

  $("table#search-results tr").each(function(index, element) {
    if (index == 0) return;
    var tagged = false;
    var notags = true;
    var kws = [];
    var taglist = [];
    for (var property of element.classList) {
      if (property.startsWith("type-")) {
        var type = property.substring(5);
        if (type == "elements" || type == "modifiers" || type == "structures") {
          if (do_minor_types || do_major_types) {
            if (include.indexOf(type) == -1) {
              element.hidden = true;
              return;
            }
          }
        } else {
          if (do_minor_types) {
            if (include.indexOf(type) == -1) {
              element.hidden = true;
              return;
            }
          }
        }
      } else if (property.startsWith("tagged-")) {
        var tag = property.substring(7);
        if (tags.length == 0 || tags.indexOf(tag) != -1) {
          tagged = true;
        }
        taglist.push(tag);
        notags = false;
      } else if (property.startsWith("keyword-")) {
        var keyword = property.substring(8);
        kws.push(keyword);
      } else if (property.startsWith("antiword-")) {
        var antiword = property.substring(9);
        for (var keyword of keywords.slice(0, query.endsWith(" ") ? keywords.length : keywords.length - 1)) {
          if (keyword == antiword) {
            element.hidden = true;
            return;
          }
        }
      }
    }
    for (var keyword of keywords) {
      var found = false;
      for (var kw of kws) {
        if (kw.indexOf(keyword) != -1) {
          found = true;
          break;
        }
      }
      if (!found) {
        element.hidden = true;
        return;
      }
    }
    if (document.getElementById("switch").checked) {
      for (var tag of tags) {
        if (taglist.indexOf(tag) == -1) {
          element.hidden = true;
          return;
        }
      }
    }
    element.hidden = !(tagged || notags);
  });
}

function clear_tags() {
  $(".tag").prop("checked", false);
  update_search();
}
