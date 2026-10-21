/* =========================================================
   KRIYOM Services – shared script
   Each block only runs if its elements exist on the page.
   ========================================================= */

/* ---- Web3Forms key (public by design) ----
   In your Web3Forms dashboard, restrict this key to your own domain
   and turn on spam protection / captcha so bots cannot abuse it. */
var KRIYOM_ACCESS_KEY = "eb726407-d444-4e9c-b95f-6b8a904ccbe6";
var KRIYOM_PHONE_TEXT = "+91 77601 11361";

/* ---- Google Analytics 4 ----
   Replace G-XXXXXXXXXX with your Measurement ID (analytics.google.com ->
   Admin -> Data streams -> your web stream). Analytics loads ONLY after a
   visitor clicks Accept. Leave the placeholder to keep tracking switched off. */
var KRIYOM_GA_ID = "G-XXXXXXXXXX";

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Header height -> CSS variable (no more hardcoded 95px) ---------- */
  var header = document.querySelector("header");
  function setHeaderHeight() {
    if (!header) return;
    document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  }
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight);
  if ("ResizeObserver" in window && header) new ResizeObserver(setHeaderHeight).observe(header);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeaderHeight);

  /* ---------- 2. Mobile menu ---------- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");
  if (toggle && nav) {
    var closeNav = function () {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { closeNav(); toggle.focus(); }
    });
  }

  /* ---------- 3. Intro (first visit of a session only, click to skip) ---------- */
  var intro = document.getElementById("intro");
  var page = document.getElementById("page");
  var introSeen = false;
  try { introSeen = sessionStorage.getItem("kriyomIntroSeen") === "1"; } catch (e) {}
  if (intro) {
    if (introSeen || document.documentElement.classList.contains("skip-intro")) {
      intro.remove();
    } else {
      try { sessionStorage.setItem("kriyomIntroSeen", "1"); } catch (e) {}
      if (page) page.inert = true;
      var introDone = false;
      var endIntro = function () {
        if (introDone) return;
        introDone = true;
        intro.classList.add("hide");
        if (page) page.inert = false;
        setTimeout(function () { intro.remove(); }, 1000);
        document.dispatchEvent(new Event("kriyom:intro-done"));
      };
      intro.addEventListener("click", endIntro);
      setTimeout(endIntro, reduceMotion ? 300 : 1400);
    }
  }

  /* ---------- 4. Hero slider ---------- */
  var track = document.getElementById("track");
  if (track) {
    var slider = document.getElementById("slider");
    var slides = Array.prototype.slice.call(track.querySelectorAll(".slide"));
    var videos = slides.map(function (s) { return s.querySelector("video"); });
    videos.forEach(function (v) {
      if (!v) return;
      var slide = v.closest(".slide");
      var markUnavailable = function () {
        if (slide && (!v.currentSrc || v.error || v.readyState === 0)) slide.classList.add("video-unavailable");
      };
      v.addEventListener("error", markUnavailable);
      v.addEventListener("loadeddata", function () { if (slide) slide.classList.remove("video-unavailable"); });
      var source = v.querySelector("source");
      if (source) source.addEventListener("error", markUnavailable);
    });
    var dots = Array.prototype.slice.call(document.querySelectorAll(".dot"));
    var counter = document.getElementById("counter");
    var pauseBtn = document.getElementById("pauseBtn");
    var total = slides.length;
    var SLIDE_MS = 2000;            // each slide stays for 2 seconds, then slides sideways
    var current = 0;
    var timer = null;
    var userPaused = false;          // slides always advance by themselves
    var onScreen = true;
    var hovering = false;
    var started = !(intro && document.body.contains(intro));   // wait for the intro so slide 1 gets its full 2 s

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function warm(v) {                 // start downloading a video only when it is about to be needed
      if (v && v.preload !== "auto") { v.preload = "auto"; v.load(); }
    }
    function playVideo(v) {
      if (!v || userPaused || !onScreen || document.hidden) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    function pauseOthers() {
      videos.forEach(function (v, i) { if (v && i !== current) v.pause(); });
    }

    function schedule() {
      clearTimeout(timer);
      if (!started || userPaused || hovering || !onScreen || document.hidden) return;
      timer = setTimeout(function () { go(current + 1); }, SLIDE_MS);
    }

    function go(index) {
      current = (index + total) % total;
      track.style.transform = "translate3d(" + (-current * 100) + "%,0,0)";
      slides.forEach(function (s, i) {
        var active = i === current;
        s.setAttribute("aria-hidden", active ? "false" : "true");
        var c = s.querySelector(".content");
        if (c) c.inert = !active;
      });
      dots.forEach(function (d, i) {
        if (i === current) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      counter.textContent = pad(current + 1) + " / " + pad(total);
      warm(videos[current]);
      warm(videos[(current + 1) % total]);
      playVideo(videos[current]);
      setTimeout(pauseOthers, reduceMotion ? 50 : 1000);
      schedule();
    }

    function setPaused(p) {
      userPaused = p;
      if (pauseBtn) {
        pauseBtn.setAttribute("aria-pressed", p ? "true" : "false");
        pauseBtn.setAttribute("aria-label", p ? "Play slideshow" : "Pause slideshow");
      }
      if (p) { videos.forEach(function (v) { if (v) v.pause(); }); clearTimeout(timer); }
      else { playVideo(videos[current]); schedule(); }
    }

    document.getElementById("prevBtn").addEventListener("click", function () { go(current - 1); });
    document.getElementById("nextBtn").addEventListener("click", function () { go(current + 1); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i); }); });
    if (pauseBtn) pauseBtn.addEventListener("click", function () { setPaused(!userPaused); });

    /* pause only while a keyboard user has focus inside the slider */
    slider.addEventListener("focusin", function (e) {
      if (e.target.matches && e.target.matches(":focus-visible")) { hovering = true; clearTimeout(timer); }
    });
    slider.addEventListener("focusout", function () { hovering = false; schedule(); });

    /* keyboard arrows: only when the slider is visible and nobody is typing */
    document.addEventListener("keydown", function (e) {
      if (!onScreen) return;
      var t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowRight") go(current + 1);
      if (e.key === "ArrowLeft") go(current - 1);
    });

    /* swipe */
    var sx = 0, sy = 0;
    slider.addEventListener("touchstart", function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    slider.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(current + (dx < 0 ? 1 : -1));
    }, { passive: true });

    /* stop work when scrolled away or tab hidden */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) { playVideo(videos[current]); schedule(); }
        else { videos.forEach(function (v) { if (v) v.pause(); }); clearTimeout(timer); }
      }, { threshold: 0.15 }).observe(slider);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { videos.forEach(function (v) { if (v) v.pause(); }); clearTimeout(timer); }
      else { playVideo(videos[current]); schedule(); }
    });

    if (!started) document.addEventListener("kriyom:intro-done", function () { started = true; schedule(); });   // start immediately after the intro slides away
    // Do not preload every video. Only the current and next slide are warmed in go().

    setPaused(userPaused);
    go(0);
  }

  /* ---------- 5. Enquiry form (contact.html) ---------- */
  var form = document.getElementById("enquiry-form");
  if (form) {
    var status = document.getElementById("form-status");
    var btn = form.querySelector('button[type="submit"]');
    var btnLabel = btn.textContent;
    var sending = false, lastSig = "", lastAt = 0;

    var show = function (msg, type) {
      status.textContent = msg;
      status.className = "status" + (type ? " " + type : "");
    };
    var unlock = function () {
      sending = false; btn.disabled = false;
      btn.removeAttribute("aria-busy"); btn.textContent = btnLabel;
    };
    var val = function (n) { return (form.elements[n].value || "").trim(); };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;

      /* hidden trap field: bots fill it, people never see it */
      if (form.elements.website && form.elements.website.value) {
        show("Thank you. Your enquiry has been sent.", "ok"); return;
      }
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var d = {
        name: val("name"), company: val("company") || "Not provided",
        phone: val("phone"), email: val("email"),
        service: val("service"), message: val("message")
      };
      var sig = JSON.stringify(d);
      if (sig === lastSig && Date.now() - lastAt < 600000) {
        show("We already have this enquiry. Our team will contact you soon.", "ok"); return;
      }

      sending = true; btn.disabled = true;
      btn.setAttribute("aria-busy", "true"); btn.textContent = "Sending…";
      show("Sending your enquiry…", "");

      var ctrl = ("AbortController" in window) ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          access_key: KRIYOM_ACCESS_KEY,
          subject: "New enquiry from KRIYOM website – " + d.service,
          from_name: "KRIYOM Website",
          name: d.name, company: d.company, phone: d.phone,
          email: d.email, service: d.service, message: d.message,
          consent: "Agreed to privacy notice"
        }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        return res.json().catch(function () { return null; })
          .then(function (json) { return { res: res, json: json }; });
      }).then(function (r) {
        clearTimeout(t);
        if (r.res.ok && r.json && r.json.success) {
          lastSig = sig; lastAt = Date.now();
          document.dispatchEvent(new CustomEvent("kriyom:lead", { detail: { form: "enquiry" } }));
          form.reset();
          show("Thank you. Your enquiry has been sent. Our team will contact you shortly.", "ok");
          btn.textContent = "Sent ✓";
          setTimeout(unlock, 4000);
        } else {
          show(r.res.status === 429
            ? "Too many attempts. Wait a minute, then try again."
            : "We could not send your enquiry. Try again, or call us on " + KRIYOM_PHONE_TEXT + ".", "err");
          unlock();
        }
      }).catch(function () {
        clearTimeout(t);
        show("Could not reach the server. Check your connection and try again, or call us on " + KRIYOM_PHONE_TEXT + ".", "err");
        unlock();
      });
    });
  }

  /* ---------- 5b. Careers form (careers.html) — no file upload ---------- */
  var cvForm = document.getElementById("career-form");
  if (cvForm) {
    var cvStatus = document.getElementById("career-status");
    var careerBtn = cvForm.querySelector('button[type="submit"]');
    var careerBtnLabel = careerBtn.textContent;
    var careerSending = false, careerLastSig = "", careerLastAt = 0;

    var careerShow = function (msg, type) { cvStatus.textContent = msg; cvStatus.className = "status" + (type ? " " + type : ""); };
    var careerUnlock = function () { careerSending = false; careerBtn.disabled = false; careerBtn.removeAttribute("aria-busy"); careerBtn.textContent = careerBtnLabel; };
    var careerVal = function (n) { return (cvForm.elements[n].value || "").trim(); };

    cvForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (careerSending) return;
      if (cvForm.elements.website && cvForm.elements.website.value) { careerShow("Thank you. Your application has been sent.", "ok"); return; }
      if (!cvForm.checkValidity()) { cvForm.reportValidity(); return; }

      var d = {
        name: careerVal("name"), phone: careerVal("phone"), email: careerVal("email"),
        city: careerVal("city"), role: careerVal("role"), experience: careerVal("experience"),
        message: careerVal("message")
      };
      var sig = JSON.stringify(d);
      if (sig === careerLastSig && Date.now() - careerLastAt < 600000) {
        careerShow("We already received this application. Our team will contact you if a suitable opportunity comes up.", "ok"); return;
      }

      careerSending = true; careerBtn.disabled = true; careerBtn.setAttribute("aria-busy", "true"); careerBtn.textContent = "Sending…";
      careerShow("Sending your application…", "");

      var ctrl = ("AbortController" in window) ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          access_key: KRIYOM_ACCESS_KEY,
          subject: "New job application from KRIYOM website – " + d.role,
          from_name: "KRIYOM Website",
          name: d.name, phone: d.phone, email: d.email, city: d.city,
          role: d.role, experience: d.experience, message: d.message,
          consent: "Agreed to privacy notice"
        }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (json) { return { res: res, json: json }; });
      }).then(function (r) {
        clearTimeout(t);
        if (r.res.ok && r.json && r.json.success) {
          careerLastSig = sig; careerLastAt = Date.now();
          cvForm.reset();
          careerShow("Thank you. Your application has been sent. Our team will contact you if a suitable opportunity comes up.", "ok");
          careerBtn.textContent = "Sent ✓";
          document.dispatchEvent(new CustomEvent("kriyom:lead", { detail: { form: "careers" } }));
          setTimeout(careerUnlock, 4000);
        } else {
          careerShow(r.res.status === 429
            ? "Too many attempts. Wait a minute, then try again."
            : "We could not send your application. Try again, or call us on " + KRIYOM_PHONE_TEXT + ".", "err");
          careerUnlock();
        }
      }).catch(function () {
        clearTimeout(t);
        careerShow("Could not reach the server. Check your connection and try again, or call us on " + KRIYOM_PHONE_TEXT + ".", "err");
        careerUnlock();
      });
    });
  }

  /* ---------- 6. Cookie consent + analytics ---------- */
  (function () {
    var CKEY = "kriyomConsent";                       // "granted" | "denied"
    var analyticsOn = /^G-[A-Z0-9]{6,}$/.test(KRIYOM_GA_ID) && KRIYOM_GA_ID !== "G-XXXXXXXXXX";
    var bar = null;

    var getChoice = function () { try { return localStorage.getItem(CKEY); } catch (e) { return null; } };
    var setChoice = function (v) { try { localStorage.setItem(CKEY, v); } catch (e) {} };

    function loadAnalytics() {
      if (!analyticsOn || window.__kriyomGA) return;
      window.__kriyomGA = true;
      window["ga-disable-" + KRIYOM_GA_ID] = false;
      var tag = document.createElement("script");
      tag.async = true;
      tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(KRIYOM_GA_ID);
      document.head.appendChild(tag);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", KRIYOM_GA_ID);
    }

    function removeAnalytics() {                      // used when someone withdraws consent
      window["ga-disable-" + KRIYOM_GA_ID] = true;
      var host = location.hostname, parts = host.split("."), domains = ["", host, "." + host];
      if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
      document.cookie.split(";").forEach(function (c) {
        var name = c.split("=")[0].trim();
        if (name.indexOf("_ga") === 0) {
          domains.forEach(function (d) {
            document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
          });
        }
      });
    }

    function hideBar() {
      if (!bar) return;
      bar.classList.remove("show");
      var b = bar; bar = null;
      setTimeout(function () { b.remove(); }, 400);
    }

    function decide(granted) {
      setChoice(granted ? "granted" : "denied");
      if (granted) loadAnalytics(); else removeAnalytics();
      hideBar();
    }

    function showBar() {
      if (bar) return;
      bar = document.createElement("div");
      bar.className = "cookie-notice";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Cookie choices");
      bar.innerHTML = analyticsOn
        ? '<p>We use analytics cookies (Google Analytics) to count visits and see which pages are useful, so we can improve this site. ' +
          'They are only set if you accept. Essential storage for the site to work is always on. ' +
          '<a href="privacy.html#cookies">Read the privacy notice</a>.</p>' +
          '<div class="cookie-actions"><button type="button" class="btn btn-primary" data-act="accept">Accept analytics</button>' +
          '<button type="button" class="btn btn-ghost" data-act="decline">Decline</button></div>'
        : '<p>We do not use advertising or tracking cookies. This site stores a few small items in your browser to work properly. ' +
          '<a href="privacy.html#cookies">Read the privacy notice</a>.</p>' +
          '<div class="cookie-actions"><button type="button" class="btn btn-primary" data-act="ok">Got it</button></div>';
      bar.addEventListener("click", function (e) {
        var a = e.target.closest("button"); if (!a) return;
        var act = a.getAttribute("data-act");
        if (act === "accept") decide(true);
        else if (act === "decline") decide(false);
        else { setChoice("denied"); hideBar(); }
      });
      document.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add("show"); });
    }

    /* footer link so people can change their mind */
    var settings = document.querySelector("[data-cookie-settings]");
    if (settings && analyticsOn) {
      settings.hidden = false;
      settings.querySelector("a").addEventListener("click", function (e) { e.preventDefault(); showBar(); });
    }

    /* track successful enquiries (only fires if analytics was accepted) */
    document.addEventListener("kriyom:lead", function (e) {
      if (window.gtag && window.__kriyomGA) window.gtag("event", "generate_lead", { form: (e.detail && e.detail.form) || "enquiry" });
    });

    var choice = getChoice();
    if (choice === "granted") loadAnalytics();
    if (choice) return;                               // already decided: stay quiet

    if (intro && document.body.contains(intro)) {
      document.addEventListener("kriyom:intro-done", function () { setTimeout(showBar, 600); });
    } else {
      setTimeout(showBar, 800);
    }
  })();
})();
