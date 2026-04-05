(function () {
  var container = document.getElementById("signal-carousel");
  if (!container) return;

  var INTERVAL = 6000; // 6秒切换
  var CAROUSEL_COUNT = 6; // 轮播文章数量

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getShortAnswer(a) {
    return a && (a.shortAnswer || a.short_answer || "");
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(iso));
    } catch (e) { return ""; }
  }

  function getCmsBase() {
    var meta = document.querySelector('meta[name="fedzx-cms-base"]');
    if (meta) return meta.getAttribute("content").replace(/\/+$/, "");
    return "https://cms.fedzx.com";
  }

  function todayKey() {
    var d = new Date();
    return "carousel-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Check localStorage cache — only fetch once per day
  var cached = null;
  try {
    var raw = localStorage.getItem(todayKey());
    if (raw) cached = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  if (cached && cached.items && cached.items.length) {
    renderSlides(cached.items);
  } else {
    // Fetch from CMS API
    fetch(getCmsBase() + "/api/public/articles", { mode: "cors" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var items = (data && data.items) || [];
        // Sort by publishedAt desc, take top N
        items.sort(function (a, b) {
          var da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          var db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return db - da;
        });
        items = items.slice(0, CAROUSEL_COUNT);

        // Cache for today
        try {
          localStorage.setItem(todayKey(), JSON.stringify({ items: items, fetchedAt: new Date().toISOString() }));
        } catch (e) { /* storage full, ignore */ }

        // Clean up old cache entries
        try {
          for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf("carousel-") === 0 && key !== todayKey()) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) { /* ignore */ }

        renderSlides(items);
      })
      .catch(function () {
        if (cached && cached.items) {
          renderSlides(cached.items); // fallback to stale cache
        } else {
          container.innerHTML = '<div class="carousel-loading">信号加载失败</div>';
        }
      });
  }

  function renderSlides(items) {
    if (!items.length) {
      container.innerHTML = '<div class="carousel-loading">暂无文章</div>';
      return;
    }

    var current = 0;
    var timer = null;

    var trackHtml = '<div class="carousel-track">';
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      var title = a.title || "";
      var desc = getShortAnswer(a) || (a.summary || "");
      var date = a.publishedAt ? formatDate(a.publishedAt) : "";
      var slug = a.slug || "#";
      var cls = i === 0 ? " active" : "";

      if (desc.length > 80) desc = desc.substring(0, 80) + "...";

      trackHtml += '<div class="carousel-slide' + cls + '" data-index="' + i + '">'
        + '<a href="/articles/' + encodeURIComponent(slug) + '/" style="display:flex;align-items:flex-start;gap:12px;text-decoration:none;color:inherit;">'
        + '<span class="carousel-icon">📡</span>'
        + '<div class="carousel-content">'
        + '<div class="carousel-title">' + escapeHtml(title) + '</div>'
        + '<div class="carousel-desc">' + escapeHtml(desc) + '</div>'
        + '</div>'
        + '</a>'
        + '</div>';
    }
    trackHtml += '</div>';

    var dotsHtml = '<div class="carousel-dots">';
    for (var d = 0; d < items.length; d++) {
      dotsHtml += '<div class="carousel-dot' + (d === 0 ? ' active' : '') + '" data-dot="' + d + '"></div>';
    }
    dotsHtml += '</div>';

    var arrowHtml = '<a class="carousel-arrow" href="#" id="carousel-next">→</a>';

    container.innerHTML = trackHtml + dotsHtml + arrowHtml;

    var slides = container.querySelectorAll('.carousel-slide');
    var dots = container.querySelectorAll('.carousel-dot');

    function goTo(index) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = index % items.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function next() {
      goTo(current + 1);
    }

    function startTimer() {
      stopTimer();
      timer = setInterval(next, INTERVAL);
    }
    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    for (var ci = 0; ci < dots.length; ci++) {
      dots[ci].addEventListener('click', function (e) {
        goTo(parseInt(this.getAttribute('data-dot')));
        startTimer();
      });
    }

    var nextBtn = document.getElementById('carousel-next");
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        next();
        startTimer();
      });
    }

    container.addEventListener('mouseenter', stopTimer);
    container.addEventListener('mouseleave', startTimer);

    var touchStartX = 0;
    container.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      stopTimer();
    }, { passive: true });
    container.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) next();
        else goTo((current - 1 + items.length) % items.length);
      }
      startTimer();
    }, { passive: true });

    if (items.length <= 1) {
      stopTimer();
      var dotsContainer = container.querySelector('.carousel-dots');
      if (dotsContainer) dotsContainer.style.display = 'none';
      var arrow = container.querySelector('.carousel-arrow');
      if (arrow) arrow.style.display = 'none';
    } else {
      startTimer();
    }
  }
})();
