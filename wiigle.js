var wiiglePage = 1;
var wiigleCallbackNumber = 0;

function wiigleText(value) {
  var box = document.createElement("div");
  box.appendChild(document.createTextNode(value || ""));
  return box.innerHTML;
}

function wiigleDecode(value) {
  var box = document.createElement("textarea");
  box.innerHTML = value || "";
  return box.value;
}

function wiigleQueryValue() {
  var value = document.getElementById("results-query").value;
  if (!value) {
    value = document.getElementById("home-query").value;
  }
  return value.replace(/^\s+|\s+$/g, "").substring(0, 200);
}

function wiigleSearch(page) {
  var query = wiigleQueryValue();
  if (!query) {
    return false;
  }

  wiiglePage = page;
  document.getElementById("home-query").value = query;
  document.getElementById("results-query").value = query;
  document.getElementById("home-page").className = "page home hidden";
  document.getElementById("results-page").className = "";
  document.getElementById("status").innerHTML =
    "Searching Wikipedia for <strong>" + wiigleText(query) + "</strong>...";
  document.getElementById("notice").className = "notice hidden";
  document.getElementById("results").innerHTML = "";
  document.getElementById("pager").innerHTML = "";

  wiigleCallbackNumber++;
  var callbackName = "wiigleReceive" + wiigleCallbackNumber;
  window[callbackName] = function(data) {
    wiigleShowResults(data, query, page);
    window[callbackName] = null;
  };

  var oldScript = document.getElementById("wiigle-api");
  if (oldScript) {
    oldScript.parentNode.removeChild(oldScript);
  }

  var script = document.createElement("script");
  script.id = "wiigle-api";
  script.type = "text/javascript";
  script.src = "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=10&srprop=snippet&srsearch=" +
    encodeURIComponent(query) + "&sroffset=" + ((page - 1) * 10) +
    "&callback=" + callbackName;
  document.getElementsByTagName("head")[0].appendChild(script);
  return false;
}

function wiigleShowResults(data, query, page) {
  var items = [];
  if (data && data.query && data.query.search) {
    items = data.query.search;
  }

  document.title = query + " - Wiigle Search";
  document.getElementById("status").innerHTML =
    "Wikipedia results for <strong>" + wiigleText(query) +
    "</strong> &mdash; page " + page;

  if (!items.length) {
    document.getElementById("notice").className = "notice";
    document.getElementById("notice").innerHTML =
      "No encyclopedia results were found. Try different words.";
    return;
  }

  var output = "";
  var i;
  for (i = 0; i < items.length; i++) {
    var title = items[i].title;
    var url = "https://en.wikipedia.org/wiki/" +
      encodeURIComponent(title.replace(/ /g, "_"));
    var snippet = items[i].snippet || "";
    snippet = wiigleDecode(snippet.replace(/<[^>]*>/g, ""));
    output += '<div class="result">';
    output += '<div class="result-title"><a href="' + url + '">' +
      wiigleText(title) + "</a></div>";
    output += '<div class="result-url">en.wikipedia.org/wiki/' +
      wiigleText(title.replace(/ /g, "_")) + "</div>";
    output += '<div class="result-snippet">' + wiigleText(snippet) +
      "...</div></div>";
  }
  document.getElementById("results").innerHTML = output;

  var pager = "";
  if (page > 1) {
    pager += '<a href="#" onclick="return wiigleSearch(' + (page - 1) +
      ');">&laquo; Previous</a>';
  }
  if (items.length === 10) {
    pager += '<a href="#" onclick="return wiigleSearch(' + (page + 1) +
      ');">Next &raquo;</a>';
  }
  document.getElementById("pager").innerHTML = pager;
}

function wiigleHome() {
  document.title = "Wiigle";
  document.getElementById("home-page").className = "page home";
  document.getElementById("results-page").className = "hidden";
  return false;
}

function wiigleReadLocation() {
  var match = location.search.match(/[?&]q=([^&]*)/);
  if (match) {
    document.getElementById("home-query").value =
      decodeURIComponent(match[1].replace(/\+/g, " "));
    wiigleSearch(1);
  }
}

wiigleReadLocation();