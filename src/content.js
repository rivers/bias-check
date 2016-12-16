var BC = {};

BC.sources = {};

/**
 * BC.Source
 *
 */
BC.Source = function(domain, name, username, biasScore, qualityScore) {
  this.domain       = domain;
  this.name         = name;
  this.username     = username;
  this.biasScore    = biasScore;
  this.qualityScore = qualityScore;
};

BC.Source.prototype.quality = function() {
  return BC.Source.qualityMap[this.qualityScore];
};

BC.Source.prototype.bias = function() {
  return BC.Source.biasMap[this.biasScore];
};

BC.Source.prototype.buildIconHtml = function() {
  return "<img class=\"bias-check-icon\" src=\"" +
    chrome.extension.getURL("images/icon-16.png") + "\" />";
};

BC.Source.prototype.buildElement = function() {
  var content = "<div class=\"bias-check-container\">";
  content += this.buildIconHtml();
  content += "<span class=\"bias-check-label\">Bias Check</span>";
  content += this.domain + ": ";
  content += this.quality() + ", " + this.bias();
  content += "</div>";

  return $(content);
};

BC.Source.qualityMap = {
  "1":   "Complex",
  "1.5": "Complex/Analytical",
  "2":   "Analytical",
  "2.5": "Analytical/Meets High Standards",
  "3":   "Meets High Standards",
  "3.5": "Meets High Standards/Basic AF",
  "4":   "Basic AF",
  "4.5": "Basic AF/Sensational clickbait",
  "5":   "Sensational clickbait"
};

BC.Source.biasMap = {
  "1":   "Liberal utter garbage/conspiracy theories",
  "1.5": "Liberal utter garbage/hyper-partisan liberal",
  "2":   "Hyper-partisan liberal (questionable journalistic value)",
  "2.5": "Skews liberal/hyper-partisan liberal",
  "3":   "Skews liberal (but still reputable)",
  "3.5": "Mainstream/skews liberal",
  "4":   "Mainstream (minimal partisan bias)",
  "4.5": "Mainstream/skews conservative",
  "5":   "Skews conservative (but still reputable)",
  "5.5": "Skews conservative/hyper-partisan conservative",
  "6":   "Hyper-partisan conservative (questionable journalistic value)",
  "6.5": "Conservative utter garbage/hyper-partisan conservative",
  "7":   "Conservative utter garbage/conspiracy theories"
};

/**
 * domain: [name, bias, quality, username]
 *
 */
BC.domainMap = {
  "abcnews.go.com":       [ "ABC News",                "4",   "3",   "abcnews"              ],
  "addictinginfo.org":    [ "Addicting Info",          "1",   "4.5", "addictinginfoorg"     ],
  "ap.org":               [ "Associated Press",        "4",   "3",   "apnews"               ],
  "bbc.com":              [ "BBC News",                "4",   "2",   "bbcnews"              ],
  "bipartisanreport.com": [ "Bipartisan Report",       "1.5", "4.5", "bipartisanism"        ],
  "breitbart.com":        [ "Breitbart",               "7",   "4.5", "breitbart"            ],
  "cnn.com":              [ "CNN",                     "4",   "4.5", "cnn"                  ],
  "dailycaller.com":      [ "Daily Caller",            "7",   "4.5", "dailycaller"          ],
  "davidwolfe.com":       [ "David Wolfe",             "1",   "4.5", "davidavocadowolfe"    ],
  "economist.com":        [ "The Economist",           "4.5", "1",   "theeconomist"         ],
  "foxnews.com":          [ "Fox News",                "5.5", "3",   "foxnews"              ],
  "huffingtonpost.com":   [ "Huffington Post",         "2",   "2.5", "huffingtonpost"       ],
  "infowars.com":         [ "InfoWars",                "7",   "5",   "infowars-80256732576" ],
  "msnbc.com":            [ "MSNBC",                   "3",   "2",   "msnbc"                ],
  "nbcnews.com":          [ "NBC News",                "4",   "3",   "nbcnews"              ],
  "npr.org":              [ "NPR",                     "4",   "2",   "npr"                  ],
  "nytimes.com":          [ "NY Times",                "4",   "2.5", "nytimes"              ],
  "occupydemocrats.com":  [ "Occupy Democrats",        "2",   "4.5", "occupydemocrats"      ],
  "redstate.com":         [ "RedState",                "6",   "4.5", "redstateblog"         ],
  "reuters.com":          [ "Reuters",                 "4",   "3",   "reuters"              ],
  "slate.com":            [ "Slate",                   "3",   "1.5", "slate"                ],
  "theatlantic.com":      [ "The Atlantic",            "3",   "1",   "theatlantic"          ],
  "theblaze.com":         [ "The Blaze",               "6",   "5",   "theblaze"             ],
  "thefiscaltimes.com":   [ "The Fiscal Times",        "5",   "1.5", "thefiscaltimes"       ],
  "theguardian.com":      [ "The Guardian",            "3.5", "1.5", "theguardian"          ],
  "thehill.com":          [ "The Hill",                "5",   "2",   "thehill"              ],
  "usatoday.com":         [ "USA Today",               "4",   "4",   "usatoday"             ],
  "usuncut.com":          [ "US Uncut",                "2",   "5",   "usauncut"             ],
  "vox.com":              [ "Vox",                     "3",   "2",   "vox"                  ],
  "washingtonpost.com":   [ "Washington Post",         "4",   "2.5", "washingtonpost"       ],
  "wsj.com":              [ "The Wall Street Journal", "4.5", "1.5", "wsj"                  ]
};

BC.scanLock   = false;
BC.scrollLock = false;

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

/**
 * Return most common element in the array.
 *
 */
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

/**
 * Try to extract lowercase username from possible Facebook profile URL.
 *
 */
BC.facebookUsernameFromProfileUrl = function(profileUrl) {
  var pattern = /facebook\.com\/([^\/]+)[\/'"]/;
  var match = pattern.exec(profileUrl);

  return (match ? match[1].toLowerCase() : null);
};

/**
 * Extract username from Facebook profile URL, and if it is associated with one
 * of the known sources, return the domain for that source.
 *
 */
BC.domainFromProfileUrl = function(profileUrl) {
  var username = BC.facebookUsernameFromProfileUrl(profileUrl);

  if (username === null) { return null; }

  for (var domain in BC.sources){
    if (BC.sources[domain].username === username) { return domain; }
  }

  return null;
};

/*
 * Take a link element from a Facebook story and try to return the domain from
 * the href.
 *
 */
BC.domainFromStoryLink = function(element) {
  var link = $(element);

  // Ignore links in comments
  if (link.parents(".UFICommentBody").length) { return null; }

  if (element.hostname === "l.facebook.com") {
    // This is a Facebook proxy with the actual target url in the query string
    var target = BC.queryParameter("u", element.href);
    return BC.domainFromUrl(target);
  } else if (link.hasClass("profileLink")) {
    // This might be a Facebook profile/page link
    var domain = BC.domainFromProfileUrl(element.href);
    if (domain) { return domain; }
  }
};

/*
 * Try to guess the source domain associated with a story element and, if
 * recognized, prepend an info div with bias/quality summary.
 *
 */
BC.processStory = function() {
  // Only process each story once
  if (this.dataset.biasChecked) { return true; }
  this.dataset.biasChecked = true;

  var wrapper = $(this);

  // Skip stories embedded within other stories
  if (wrapper.parents(".userContentWrapper").length) { return true; }

  var domains = [];

  // Extract domains from all links in the story
  wrapper.find("a").each(function() {
    var domain = BC.domainFromStoryLink(this);
    if (domain) { domains.push(domain) };
  });

  // Get the most common domain
  var domain = BC.getMode(domains);
  if (domain === null) { return true; }

  var source = BC.sources[domain];
  if (source === undefined) { return true; }

  // Prepend bias check element to story
  wrapper.prepend(source.buildElement());
};

BC.scan = function() {
  if (BC.scanLock) { return; }

  BC.scanLock = true;
  $(".userContentWrapper").each(BC.processStory);
  BC.scanLock = false;
};

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
  for (var domain in BC.domainMap){
    var info = BC.domainMap[domain];

    var name     = info[0]
      , bias     = info[1]
      , quality  = info[2]
      , username = info[3];

    BC.sources[domain] = new BC.Source(domain, name, username, bias, quality);
  }

  document.addEventListener("scroll", BC.onScroll);
  BC.scan();
};

BC.init();
