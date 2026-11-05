/* Пульс — интерактив промо-сайта (vanilla JS, без зависимостей) */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function fmt(n) { return Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' '); }

  /* ---------- Тема ---------- */
  var themeBtn = $('.theme-toggle');
  var metaTheme = $('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#f6f7fb' : '#0b0d14');
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему');
    }
  }
  applyTheme(root.getAttribute('data-theme') || 'dark');

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('puls-theme', next); } catch (e) { /* хранилище недоступно */ }
    });
  }

  /* ---------- Шапка и мобильное меню ---------- */
  var header = $('.header');
  var burger = $('.burger');
  var nav = $('#site-nav');

  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    if (!burger || !nav) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960) setMenu(false);
    });
  }

  /* ---------- Появление при прокрутке ---------- */
  var reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = el.parentElement ? $$(':scope > .reveal', el.parentElement) : [el];
        var idx = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = Math.min(idx * 70, 350) + 'ms';
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Табы «Как это работает» ---------- */
  var tabs = $$('[role="tab"]');

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.setAttribute('tabindex', selected ? '0' : '-1');
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      // список табов вертикальный, поэтому поддерживаем обе пары стрелок
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        selectTab(next, true);
      }
    });
  });

  /* ---------- Калькулятор экономии ---------- */
  var MIN_PER_LEAD = 6;          // минут экономии на одной заявке
  var HOURS_PER_MANAGER = 6;     // часов в месяц на отчётах и планёрках
  var rManagers = $('#r-managers');
  var rLeads = $('#r-leads');
  var rRate = $('#r-rate');

  function paintRange(input) {
    var min = +input.min, max = +input.max, val = +input.value;
    input.style.setProperty('--p', ((val - min) / (max - min)) * 100 + '%');
  }

  function calc() {
    if (!rManagers || !rLeads || !rRate) return;
    var m = +rManagers.value, l = +rLeads.value, r = +rRate.value;
    var hours = l * MIN_PER_LEAD / 60 + m * HOURS_PER_MANAGER;
    var money = hours * r;
    var maxHours = +rLeads.max * MIN_PER_LEAD / 60 + +rManagers.max * HOURS_PER_MANAGER;

    $('#o-managers').textContent = m;
    $('#o-leads').textContent = fmt(l);
    $('#o-rate').textContent = fmt(r) + ' ₽';
    $('#res-hours').textContent = fmt(hours);
    $('#res-money').textContent = fmt(money);
    $('#res-year').textContent = fmt(money * 12);
    $('#res-bar').style.width = Math.max(4, Math.min(100, hours / maxHours * 100)) + '%';

    [rManagers, rLeads, rRate].forEach(paintRange);
  }

  [rManagers, rLeads, rRate].forEach(function (input) {
    if (input) input.addEventListener('input', calc);
  });
  calc();

  /* ---------- Тарифы: помесячно / за год ---------- */
  var billSwitch = $('#billing-switch');
  var billM = $('#bill-m');
  var billY = $('#bill-y');

  function setBilling(yearly) {
    if (!billSwitch) return;
    billSwitch.setAttribute('aria-checked', String(yearly));
    if (billM) billM.classList.toggle('is-active', !yearly);
    if (billY) billY.classList.toggle('is-active', yearly);
    var key = yearly ? 'year' : 'month';

    $$('.plan__price b').forEach(function (b) {
      var value = fmt(+b.getAttribute('data-' + key));
      if (reduceMotion) { b.textContent = value; return; }
      b.classList.add('is-swapping');
      setTimeout(function () {
        b.textContent = value;
        b.classList.remove('is-swapping');
      }, 160);
    });
    $$('.plan__billed').forEach(function (p) {
      p.textContent = p.getAttribute('data-' + key);
    });
  }

  if (billSwitch) {
    billSwitch.addEventListener('click', function () {
      setBilling(billSwitch.getAttribute('aria-checked') !== 'true');
    });
    if (billM) billM.addEventListener('click', function () { setBilling(false); });
    if (billY) billY.addEventListener('click', function () { setBilling(true); });
    if (billM) billM.classList.add('is-active');
  }

  /* ---------- Сравнение тарифов (сворачивается на мобильных) ---------- */
  var cmpBtn = $('.compare__toggle');
  var cmpBody = $('#compare-body');
  if (cmpBtn && cmpBody) {
    cmpBtn.addEventListener('click', function () {
      var open = cmpBtn.getAttribute('aria-expanded') !== 'true';
      cmpBtn.setAttribute('aria-expanded', String(open));
      cmpBtn.querySelector('span').textContent = open ? 'Скрыть сравнение' : 'Сравнить тарифы подробно';
      cmpBody.classList.toggle('is-open', open);
    });
  }

  /* ---------- FAQ-аккордеон ---------- */
  $$('.acc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.hidden = !open;
    });
  });

  /* ---------- Форма CTA (ничего не отправляет) ---------- */
  var form = $('#cta-form');
  if (form) {
    var email = $('#email', form);
    var msg = $('#email-msg', form);
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function showMsg(text, type) {
      msg.textContent = text;
      msg.className = 'cta__msg' + (type ? ' is-' + type : '');
    }

    email.addEventListener('input', function () {
      if (email.getAttribute('aria-invalid') === 'true' && EMAIL_RE.test(email.value.trim())) {
        email.removeAttribute('aria-invalid');
        showMsg('', '');
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = email.value.trim();
      if (!value) {
        email.setAttribute('aria-invalid', 'true');
        showMsg('Введите адрес электронной почты.', 'error');
        email.focus();
        return;
      }
      if (!EMAIL_RE.test(value)) {
        email.setAttribute('aria-invalid', 'true');
        showMsg('Похоже, в адресе опечатка. Пример: name@company.ru', 'error');
        email.focus();
        return;
      }
      email.removeAttribute('aria-invalid');
      showMsg('Готово! Это демо-страница, поэтому письмо не отправлено — но в настоящем Пульсе доступ уже ждал бы вас в почте.', 'success');
      form.reset();
    });
  }
})();
