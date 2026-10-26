/* Roman Numerals — standard subtractive notation (1–3999), with a vinculum form for larger numbers. */
(function () {
  "use strict";
  var $ = S3.$;
  var KEY = "roman.v1";
  var TABLE = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  var VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  var PAIRS = ["IV", "IX", "XL", "XC", "CD", "CM"];

  function toRoman(n) {
    var parts = [];
    TABLE.forEach(function (t) { while (n >= t[0]) { parts.push(t); n -= t[0]; } });
    return { roman: parts.map(function (p) { return p[1]; }).join(""), parts: parts };
  }
  // Above 3999: a bar (combining overline) over the thousands multiplies them by 1000.
  function vinculum(n) {
    var th = Math.floor(n / 1000), rest = n % 1000;
    return toRoman(th).roman.split("").map(function (c) { return c + "̅"; }).join("") + toRoman(rest).roman;
  }

  // Returns {value, steps} or {err}.
  function parseRoman(input) {
    var s = String(input || "").trim().toUpperCase().replace(/\s+/g, ""), m;
    if (!s) return { empty: true };
    if ((m = /[^IVXLCDM]/.exec(s))) return { err: "“" + m[0] + "” is not a Roman numeral symbol. Use only I, V, X, L, C, D and M." };
    if ((m = /V{2,}|L{2,}|D{2,}/.exec(s))) return { err: m[0][0] + " never repeats: " + m[0][0] + m[0][0] + " is written " + toRoman(VAL[m[0][0]] * 2).roman + "." };
    if ((m = /I{4,}|X{4,}|C{4,}|M{4,}/.exec(s))) {
      var ch = m[0][0];
      return { err: ch + " appears " + m[0].length + " times in a row; the most is 3." + (ch === "M" ? " Numbers above 3,999 need a vinculum (bar), see the rules." : " " + ch.repeat(4) + " is written " + toRoman(VAL[ch] * 4).roman + ".") };
    }
    for (var i = 0; i < s.length - 1; i++) {
      if (VAL[s[i]] < VAL[s[i + 1]] && PAIRS.indexOf(s[i] + s[i + 1]) < 0)
        return { err: "“" + s[i] + s[i + 1] + "” is not a valid subtraction. Only IV, IX, XL, XC, CD and CM are allowed" +
          (VAL[s[i + 1]] - VAL[s[i]] <= 3999 ? " (" + (VAL[s[i + 1]] - VAL[s[i]]) + " is " + toRoman(VAL[s[i + 1]] - VAL[s[i]]).roman + ")." : ".") };
    }
    var total = 0, steps = [];
    for (i = 0; i < s.length; i++) {
      var v = VAL[s[i]], neg = i + 1 < s.length && v < VAL[s[i + 1]];
      total += neg ? -v : v; steps.push({ sym: s[i], v: neg ? -v : v });
    }
    var canon = toRoman(total).roman;
    if (canon !== s) return { err: "Not in standard form. The symbols add up to " + total + ", which is written " + canon + ".", near: total };
    return { value: total, steps: steps };
  }

  function dateRoman(y, m, d, order, sep) {
    var p = { d: toRoman(d).roman, m: toRoman(m).roman, y: toRoman(y).roman };
    return order.split("").map(function (k) { return p[k]; }).join(sep);
  }

  // ---------- UI ----------
  var nIn = $("#n"), rIn = $("#r"), status = $("#status"), steps = $("#steps");
  function setStatus(text, cls) { status.className = "chip " + (cls || ""); status.textContent = text; }
  function chip(sym, val, minus) { return S3.h("div", { "class": "step" + (minus ? " minus" : "") }, [S3.h("b", { text: sym }), S3.h("span", { text: val })]); }
  function op(t) { return S3.h("span", { "class": "op", text: t }); }
  function save() { S3.store(KEY, { n: nIn.value, date: $("#date").value, order: $("#order").value, sep: $("#sep").value }); }

  function fromNumber() {
    var raw = nIn.value.replace(/[,\s_]/g, "").replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; });
    steps.innerHTML = ""; save();
    if (!raw) { rIn.value = ""; setStatus("Type on either side"); return; }
    if (!/^\d+$/.test(raw)) { rIn.value = ""; setStatus("Whole numbers only", "bad"); return; }
    var n = parseInt(raw, 10);
    if (n === 0) { rIn.value = ""; setStatus("No zero in Roman numerals", "bad"); steps.appendChild(S3.h("div", { "class": "why", text: "The Romans had no numeral for zero; medieval writers used the word nulla (N)." })); return; }
    if (n > 3999999) { rIn.value = ""; setStatus("Too large, even with a vinculum", "bad"); return; }
    if (n > 3999) {
      rIn.value = vinculum(n);
      setStatus("Above 3,999: vinculum notation", "warn");
      steps.appendChild(chip(vinculum(Math.floor(n / 1000) * 1000), (Math.floor(n / 1000) * 1000).toLocaleString()));
      if (n % 1000) { steps.appendChild(op("+")); steps.appendChild(chip(toRoman(n % 1000).roman, String(n % 1000))); }
      steps.appendChild(S3.h("div", { "class": "why", text: "A bar over a numeral multiplies it by 1,000. It is historical notation, not part of the modern standard (1–3,999)." }));
      return;
    }
    var r = toRoman(n);
    rIn.value = r.roman; setStatus("Valid · " + n.toLocaleString() + " = " + r.roman, "ok");
    r.parts.forEach(function (p, i) { if (i) steps.appendChild(op("+")); steps.appendChild(chip(p[1], String(p[0]))); });
    steps.appendChild(op("=")); steps.appendChild(S3.h("span", { "class": "total", text: n.toLocaleString() }));
  }

  function fromRoman() {
    var r = parseRoman(rIn.value);
    steps.innerHTML = "";
    if (r.empty) { nIn.value = ""; setStatus("Type on either side"); save(); return; }
    if (r.err) {
      nIn.value = ""; setStatus("Not a valid Roman numeral", "bad");
      steps.appendChild(S3.h("div", { "class": "why", text: r.err })); save(); return;
    }
    nIn.value = String(r.value); save();
    setStatus("Valid · " + rIn.value.trim().toUpperCase() + " = " + r.value.toLocaleString(), "ok");
    r.steps.forEach(function (s, i) {
      if (i) steps.appendChild(op(s.v < 0 ? "−" : "+"));
      steps.appendChild(chip(s.sym, String(Math.abs(s.v)), s.v < 0));
    });
    steps.appendChild(op("=")); steps.appendChild(S3.h("span", { "class": "total", text: r.value.toLocaleString() }));
  }

  function renderDate() {
    save();
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec($("#date").value), out = $("#date-out");
    out.innerHTML = "";
    if (!m || +m[1] < 1 || +m[1] > 3999) { out.appendChild(S3.h("small", { text: m ? "Years 1 to 3999 only." : "Pick a date." })); return; }
    var y = +m[1], mo = +m[2], d = +m[3], order = $("#order").value, sep = $("#sep").value;
    out.appendChild(document.createTextNode(dateRoman(y, mo, d, order, sep)));
    var plain = { d: d, m: mo, y: y };
    out.appendChild(S3.h("small", { text: order.split("").map(function (k) { return plain[k]; }).join(sep) }));
  }

  // ---------- wiring ----------
  var sv = S3.store(KEY) || {};
  nIn.value = sv.n != null ? sv.n : "1994";
  var t = new Date();
  $("#date").value = sv.date || t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  if (sv.order && /^(dmy|mdy|ymd)$/.test(sv.order)) $("#order").value = sv.order;
  if (sv.sep != null && [" · ", ".", " - ", " / ", " "].indexOf(sv.sep) >= 0) $("#sep").value = sv.sep;
  nIn.addEventListener("input", fromNumber);
  rIn.addEventListener("input", function () {
    var pos = rIn.selectionStart, up = rIn.value.toUpperCase();
    if (up !== rIn.value) { rIn.value = up; rIn.setSelectionRange(pos, pos); }
    fromRoman();
  });
  ["#date", "#order", "#sep"].forEach(function (id) { $(id).addEventListener(id === "#date" ? "input" : "change", renderDate); });
  $("#copy-n").addEventListener("click", function () { if (!nIn.value) return S3.toast("Nothing to copy yet", "error"); S3.copy(nIn.value); S3.done(); });
  $("#copy-r").addEventListener("click", function () { if (!rIn.value) return S3.toast("Nothing to copy yet", "error"); S3.copy(rIn.value); S3.done(); });
  $("#copy-d").addEventListener("click", function () {
    var txt = $("#date-out").firstChild;
    if (!txt || txt.nodeType !== 3) return S3.toast("Pick a date first", "error");
    S3.copy(txt.nodeValue); S3.done();
  });
  fromNumber(); renderDate();

  window.S3_DEMO = function () { nIn.value = "1994"; fromNumber(); $("#date").value = "2026-10-26"; $("#order").value = "dmy"; $("#sep").value = " · "; renderDate(); };

  window.S3_SELFTEST = function () {
    function bad(s) { return !!parseRoman(s).err; }
    var ok = true;
    for (var n = 1; n <= 3999 && ok; n++) ok = parseRoman(toRoman(n).roman).value === n;   // full round trip
    return ok && toRoman(1994).roman === "MCMXCIV" && toRoman(3999).roman === "MMMCMXCIX" && toRoman(4).roman === "IV" && toRoman(2026).roman === "MMXXVI" &&
      parseRoman("mcmxciv").value === 1994 && bad("IIII") && bad("IC") && bad("VV") && bad("MMMM") && bad("IXI") && bad("VX") && bad("ABC") && bad("XCX") &&
      parseRoman("IC").err.indexOf("XCIX") > 0 && vinculum(5000) === "V̅" && vinculum(4321) === "I̅V̅CCCXXI" &&
      dateRoman(2026, 10, 26, "dmy", ".") === "XXVI.X.MMXXVI" && dateRoman(2026, 10, 26, "mdy", " · ") === "X · XXVI · MMXXVI";
  };
})();
