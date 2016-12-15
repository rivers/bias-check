var BC = {};

BC.domainMap = {
  "abcnews.go.com": ["ABC News", "4", "3"],
  "addictinginfo.org": ["Addicting Info", "1", "4.5"],
  "ap.org": ["AP", "4", "3"],
  "bbc.com": ["BBC", "4", "2"],
  "bipartisanreport.com": ["Bipartisan Report", "4.5", "1.5"],
  "breitbart.com": ["Breitbart", "7", "4.5"],
  "cnn.com": ["CNN", "4", "4.5"],
  "dailycaller.com": ["Daily Caller", "7", "4.5"],
  "davidwolfe.com": ["David Wolfe", "1", "4.5"],
  "economist.com": ["Economist", "4.5", "1"],
  "foxnews.com": ["Fox News", "5.5", "3"],
  "huffingtonpost.com": ["Huffington Post", "2", "2.5"],
  "infowars.com": ["InfoWars", "7", "5"],
  "msnbc.com": ["MSNBC", "3", "2"],
  "nbcnews.com": ["NBC News", "4", "3"],
  "npr.org": ["NPR", "4", "2"],
  "nytimes.com": ["NY Times", "4", "2.5"],
  "occupydemocrats.com": ["Occupy Democrats", "2", "4.5"],
  "redstate.com": ["RedState", "6", "4.5"],
  "reuters.com": ["Reuters", "4", "3"],
  "slate.com": ["Slate", "3", "1.5"],
  "theatlantic.com": ["The Atlantic", "3", "1"],
  "theblaze.com": ["The Blaze", "6", "5"],
  "thefiscaltimes.com": ["The Fiscal Times", "5", "1.5"],
  "theguardian.com": ["The Guardian", "3.5", "1.5"],
  "thehill.com": ["The Hill", "5", "2"],
  "usatoday.com": ["USA Today", "4", "4"],
  "usuncut.com": ["U.S. Uncut", "2", "5"],
  "vox.com": ["Vox", "3", "2"],
  "washingtonpost.com": ["Washington Post", "4", "2.5"],
  "wsj.com": ["WSJ", "4.5", "1.5"]
};

BC.qualityMap = {
  "1": "Complex",
  "1.5": "Complex/Analytical",
  "2": "Analytical",
  "2.5": "Analytical/Meets High Standards",
  "3": "Meets High Standards",
  "3.5": "Meets High Standards/Basic AF",
  "4": "Basic AF",
  "4.5": "Basic AF/Sensational clickbait",
  "5": "Sensational clickbait"
};

BC.biasMap = {
  "1": "Liberal utter garbage/conspiracy theories",
  "1.5": "Liberal utter garbage/hyper-partisan liberal",
  "2": "Hyper-partisan liberal (questionable journalistic value)",
  "2.5": "Skews liberal/hyper-partisan liberal",
  "3": "Skews liberal (but still reputable)",
  "3.5": "Mainstream/skews liberal",
  "4": "Mainstream (minimal partisan bias)",
  "4.5": "Mainstream/skews conservative",
  "5": "Skews conservative (but still reputable)",
  "5.5": "Skews conservative/hyper-partisan conservative",
  "6": "Hyper-partisan conservative (questionable journalistic value)",
  "6.5": "Conservative utter garbage/hyper-partisan conservative",
  "7": "Conservative utter garbage/conspiracy theories"
};

BC.storyMap = {};

BC.scanning = false;

BC.domainFromUrl = function(url) {
  var a = document.createElement("a");
  a.href = url;
  return psl.parse(a.hostname).domain;
};

BC.queryParameter = function(name, url) {
  name = name.replace(/[\[\]]/g, "\\$&");

  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
    , results = regex.exec(url);

  if (!results) { return null; }
  if (!results[2]) { return ""; }

  return decodeURIComponent(results[2].replace(/\+/g, " "));
};

BC.generateGuid = function() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == "x" ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

BC.getMode = function(array) {
  if (array.length === 0) { return null; }
  var modeMap = {};
  var maxEl = array[0], maxCount = 1;
  for (var i = 0; i < array.length; i++) {
    var el = array[i];
    if (modeMap[el] == null) {
      modeMap[el] = 1;
    } else {
      modeMap[el]++;
    }
    if (modeMap[el] > maxCount) {
      maxEl = el;
      maxCount = modeMap[el];
    }
  }
  return maxEl;
};

BC.buildInfoHtml = function(domain, info) {
  var name = info[0]
    , bias = info[1]
    , quality = info[2];

  var content = "<div class=\"bias-check-container\">";
  content += BC.buildIconHtml();
  content += "<span class=\"bias-check-label\">Bias Check</span>";
  content += domain + ': ';
  content += BC.qualityMap[quality];
  content += ", " + BC.biasMap[bias];
  content += "</div>";

  return content;
};

BC.buildIconHtml = function() {
  return "<img class=\"bias-check-icon\" src=\"" +
    chrome.extension.getURL('images/icon-16.png') +
    "\" />";
};

BC.scan = function() {
  if (BC.scanning) { return; }

  BC.scanning = true;

  $(".userContentWrapper").each(function() {
    if (this.dataset.checkBiasId) { return true; }

    var $this = $(this);
    if ($this.parents(".userContentWrapper").length) { return true; }

    var guid = BC.generateGuid();
    this.dataset.checkBiasId = guid;

    var domains = [];

    $this.find("a").each(function() {
      if (this.hostname !== "l.facebook.com") { return true; }
      if ($(this).parents(".UFICommentBody").length) { return true; }
      var target = BC.queryParameter("u", this.href);
      domains.push(BC.domainFromUrl(target));
    });

    var domain = BC.getMode(domains);

    BC.storyMap[guid] = domain;

    if (domain === null) { return true; }

    var info = BC.domainMap[domain];

    if (info === undefined) { return true; }

    $this.prepend($(BC.buildInfoHtml(domain, info)));
  });

  BC.scanning = false;
};

BC.scrollLock = false;

BC.scanWithTimeout = function() {
  BC.scan();
  BC.scrollLock = false;
};

BC.onScroll = function() {
  if (BC.scrollLock) { return; }

  BC.scrollLock = true;
  setTimeout(BC.scanWithTimeout, 500);
};

BC.init = function() {
  document.addEventListener("scroll", BC.onScroll);
  BC.scan();
};

BC.init();
