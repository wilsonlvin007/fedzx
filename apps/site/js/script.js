// UI behaviors for the static site. Designed to survive CMS-driven DOM swaps.
(function () {
  var globalBound = false;

  function ensureGlobalListeners() {
    if (globalBound) return;
    globalBound = true;

    // Delegated click: handles both mobile menu button and anchor smooth-scroll even after DOM replacement.
    document.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;

      // Mobile menu toggle (button can be replaced by CMS).
      var btn = target.closest && target.closest("#mobile-menu-button");
      if (btn) {
        var mobileMenu = document.getElementById("mobile-menu");
        if (mobileMenu) mobileMenu.classList.toggle("hidden");
        return;
      }

      // Smooth scroll for anchors.
      var link = target.closest && target.closest('a[href^="#"]');
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href || href === "#") return;

      var section = document.querySelector(href);
      if (!section) return;

      e.preventDefault();
      var offsetTop = section.offsetTop - 80;
      window.scrollTo({ top: offsetTop, behavior: "smooth" });

      var menu = document.getElementById("mobile-menu");
      if (menu && !menu.classList.contains("hidden")) menu.classList.add("hidden");
    });

    // Navbar shadow
    window.addEventListener("scroll", function () {
      var navbar = document.querySelector(".navbar-sticky");
      if (!navbar) return;
      if (window.scrollY > 10) {
        navbar.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
      } else {
        navbar.style.boxShadow = "none";
      }
    });
  }

  function initHeroCanvas() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas) return;
    if (canvas.dataset && canvas.dataset.fedzxInited === "1") return;
    if (canvas.dataset) canvas.dataset.fedzxInited = "1";

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    var particles = [];
    var particleCount = 50;

    function Particle() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.color = "rgba(59, 130, 246, " + (Math.random() * 0.3 + 0.1) + ")";
    }

    Particle.prototype.update = function () {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
      if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
    };

    Particle.prototype.draw = function () {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    };

    for (var i = 0; i < particleCount; i++) particles.push(new Particle());

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var j = 0; j < particles.length; j++) {
        particles[j].update();
        particles[j].draw();
      }
      requestAnimationFrame(animate);
    }

    animate();
  }

  function reinit() {
    ensureGlobalListeners();
    initHeroCanvas();
  }

  // Expose for CMS loader.
  window.fedzxReinit = reinit;

  document.addEventListener("DOMContentLoaded", function () {
    reinit();
  });
})();

