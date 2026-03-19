(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function inline(md) {
    var s = escapeHtml(md);
    // inline code first
    s = s.replace(/`([^`]+)`/g, function (_m, code) {
      return "<code>" + escapeHtml(code) + "</code>";
    });
    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_m, text, url) {
      var safeUrl = String(url).replace(/"/g, "%22");
      return '<a href="' + safeUrl + '" target="_blank" rel="noreferrer">' + text + "</a>";
    });
    return s;
  }

  function renderMarkdown(md) {
    var lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
    var out = [];
    var inCode = false;
    var codeLang = "";
    var codeLines = [];

    function flushCode() {
      if (!inCode) return;
      out.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
      inCode = false;
      codeLang = "";
      codeLines = [];
    }

    var i = 0;
    while (i < lines.length) {
      var line = lines[i];

      // fenced code blocks ```
      var fence = line.match(/^```(\w+)?\s*$/);
      if (fence) {
        if (inCode) {
          flushCode();
        } else {
          inCode = true;
          codeLang = fence[1] || "";
          codeLines = [];
        }
        i++;
        continue;
      }
      if (inCode) {
        codeLines.push(line);
        i++;
        continue;
      }

      // hr
      if (/^\s*---\s*$/.test(line)) {
        out.push("<hr/>");
        i++;
        continue;
      }

      // headings
      var h = line.match(/^(#{1,3})\s+(.+)\s*$/);
      if (h) {
        var level = h[1].length;
        out.push("<h" + level + ">" + inline(h[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      // blockquote (single line)
      var bq = line.match(/^\s*>\s?(.*)$/);
      if (bq) {
        out.push("<blockquote><p>" + inline(bq[1]) + "</p></blockquote>");
        i++;
        continue;
      }

      // unordered list
      if (/^\s*[-*]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
          i++;
        }
        out.push(
          "<ul>" +
            items
              .map(function (x) {
                return "<li>" + inline(x) + "</li>";
              })
              .join("") +
            "</ul>",
        );
        continue;
      }

      // ordered list: 1. xxx
      if (/^\s*\d+\.\s+/.test(line)) {
        var oitems = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          oitems.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
          i++;
        }
        out.push(
          "<ol>" +
            oitems
              .map(function (x) {
                return "<li>" + inline(x) + "</li>";
              })
              .join("") +
            "</ol>",
        );
        continue;
      }

      // blank line
      if (!line.trim()) {
        i++;
        continue;
      }

      // paragraph (merge consecutive non-empty lines)
      var p = [line.trimEnd()];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*---\s*$/.test(lines[i])) {
        // stop paragraph if list starts
        if (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]) || /^\s*>\s?/.test(lines[i]) || /^```/.test(lines[i])) break;
        p.push(lines[i].trimEnd());
        i++;
      }
      out.push("<p>" + inline(p.join("\n")) + "</p>");
    }

    flushCode();
    return out.join("\n");
  }

  window.FEDZX = window.FEDZX || {};
  window.FEDZX.renderMarkdownLite = renderMarkdown;
})();

