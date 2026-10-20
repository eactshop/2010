/* =========================================================
   Bốc Thăm Quà Tặng 20/10 — script.js
   Vanilla JavaScript: bốc thăm theo trọng số, quản lý số lượng,
   lưu localStorage, hiệu ứng, chia sẻ & tải ảnh kết quả.
   ========================================================= */
(function () {
  "use strict";

  /* =======================================================
     1. CẤU HÌNH — chỉnh sửa tại đây
     ======================================================= */

  // Đổi giá trị này khi bạn thay đổi danh sách/số lượng quà
  // để mọi trình duyệt tự đặt lại dữ liệu cũ.
  const DATA_VERSION = "2010-v2";
  const STORAGE_KEY = "boc-tham-20-10";

  /**
   * Danh sách quà.
   * - id:       mã duy nhất (không trùng)
   * - name:     tên quà
   * - image:    đường dẫn ảnh (vd "images/binh.png"). Để "" sẽ dùng hình minh họa emoji.
   * - emoji:    hình minh họa dự phòng
   * - tone:     màu nền hình minh họa
   * - wish:     lời chúc riêng của món quà
   * - quantity: số lượng
   * - weight:   trọng số xác suất (càng lớn càng dễ trúng; 0 = không bao giờ trúng)
   */
  const GIFTS = [
    {
      id: "tien-100k",
      name: "Lì xì 100.000đ",
      image: "",
      emoji: "💵",
      tone: "#DDF5E2",
      wish: "Một chút lộc nhỏ để bạn tự thưởng ly trà sữa thật ngon!",
      quantity: 2,
      weight: 2,
    },
    {
      id: "tien-200k",
      name: "Lì xì 200.000đ",
      image: "",
      emoji: "💸",
      tone: "#D9F1FF",
      wish: "Lộc vừa vừa cho một buổi hẹn hò hoặc mua sắm thật vui!",
      quantity: 2,
      weight: 2,
    },
    {
      id: "tien-500k",
      name: "Lì xì 500.000đ",
      image: "",
      emoji: "💰",
      tone: "#FFE2C6",
      wish: "Giải thưởng lớn nhất – may mắn đã gọi tên bạn rồi!",
      quantity: 1,
      weight: 1,
    },
  ];

  // Lời chúc ngẫu nhiên ghép cùng phần quà (thêm/sửa thoải mái).
  const WISHES = [
    "Chúc bạn luôn xinh đẹp, mạnh khỏe, luôn mỉm cười và gặp thật nhiều may mắn trong công việc cũng như cuộc sống. Chúc bạn có một ngày 20/10 thật ngọt ngào và tràn đầy yêu thương! 💗",
    "Chúc bạn luôn xinh đẹp, rạng rỡ và hạnh phúc. 🌷",
    "Chúc công việc thuận lợi, cuộc sống ngập tràn niềm vui. ✨",
    "Chúc bạn luôn tự tin, tỏa sáng và đạt được những điều mình mong muốn. 🌟",
    "Chúc mỗi ngày của bạn đều ngọt ngào như món quà hôm nay. 🍬",
    "Chúc bạn luôn được yêu thương, trân trọng và gặp nhiều may mắn. 🍀",
    "Chúc bạn có thật nhiều sức khỏe, năng lượng tích cực và những nụ cười giòn tan bên đồng nghiệp. 😊",
    "Cảm ơn bạn vì đã luôn tận tâm và mang lại không khí ấm áp cho cả team. Chúc bạn một ngày 20/10 thật trọn vẹn! 💐",
    "Chúc bạn luôn bình an, vui vẻ và có thật nhiều khoảnh khắc đáng nhớ bên những người thân yêu. 💞",
    "Chúc bạn luôn giữ được nét dịu dàng, sự mạnh mẽ và trái tim ấm áp của mình. 🎀",
    "Chúc mọi dự định của bạn đều suôn sẻ, mọi ước mơ đều sớm thành hiện thực. 🌈",
    "Chúc bạn luôn là phiên bản hạnh phúc nhất của chính mình – hôm nay và mãi về sau. 🌸",
  ];

  const WISH_TONES = ["#FFE1EB", "#E8D9FF", "#D9F1FF", "#FFE2C6", "#DDF5E2"];
  const SHAKE_MS = 1600;

  /* =======================================================
     2. TIỆN ÍCH
     ======================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  let toastTimer;
  function toast(msg, type = "", ms = 3200) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast show " + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = "toast " + type), ms);
  }

  /* =======================================================
     3. LƯU TRỮ (localStorage, có dự phòng bộ nhớ tạm)
     ======================================================= */
  const storage = (function () {
    let ok = true;
    let memory = null;
    try {
      const k = "__test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
    } catch (e) {
      ok = false;
    }
    return {
      ok,
      get() {
        if (!ok) return memory;
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY));
        } catch (e) {
          return null;
        }
      },
      set(v) {
        if (!ok) { memory = v; return; }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
        } catch (e) {
          memory = v;
          toast("Không lưu được dữ liệu vào trình duyệt.", "error");
        }
      },
      clear() {
        memory = null;
        if (ok) try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* bỏ qua */ }
      },
    };
  })();

  function freshState() {
    const stock = {};
    GIFTS.forEach((g) => (stock[g.id] = Math.max(0, Math.floor(g.quantity) || 0)));
    return { version: DATA_VERSION, stock, history: [], participant: "", myResult: null };
  }

  function loadState() {
    const saved = storage.get();
    if (!saved || saved.version !== DATA_VERSION || typeof saved.stock !== "object") return freshState();

    // Đồng bộ với cấu hình hiện tại & chặn dữ liệu bị sửa sai (âm, quá số lượng)
    const base = freshState();
    GIFTS.forEach((g) => {
      const n = Math.floor(Number(saved.stock[g.id]));
      base.stock[g.id] = Number.isFinite(n) ? Math.min(Math.max(0, n), base.stock[g.id]) : base.stock[g.id];
    });
    base.history = Array.isArray(saved.history) ? saved.history.slice(0, 500) : [];
    base.participant = typeof saved.participant === "string" ? saved.participant.slice(0, 40) : "";
    base.myResult = saved.myResult && saved.myResult.giftId ? saved.myResult : null;
    return base;
  }

  let state = loadState();
  const save = () => storage.set(state);

  /* =======================================================
     4. THUẬT TOÁN BỐC THĂM THEO TRỌNG SỐ
     ======================================================= */
  function availableGifts() {
    return GIFTS.filter((g) => state.stock[g.id] > 0 && g.weight > 0);
  }

  function totalRemaining() {
    return GIFTS.reduce((s, g) => s + (state.stock[g.id] || 0), 0);
  }

  /** Chọn 1 phần quà dựa trên trọng số, chỉ trong những quà còn hàng. */
  function pickWeighted() {
    const pool = availableGifts();
    if (!pool.length) return null;
    const total = pool.reduce((s, g) => s + g.weight, 0);
    let r = Math.random() * total;
    for (const g of pool) {
      r -= g.weight;
      if (r < 0) return g;
    }
    return pool[pool.length - 1]; // phòng sai số làm tròn
  }

  const randomWish = () => WISHES[Math.floor(Math.random() * WISHES.length)];
  const giftById = (id) => GIFTS.find((g) => g.id === id);

  /* =======================================================
     5. HÌNH MINH HỌA SVG (không phụ thuộc ảnh bên ngoài)
     ======================================================= */
  const OUT = "#F2BFD0";
  const ART = {
    cat() {
      return `
<svg viewBox="0 0 220 245" role="img" aria-label="Mèo trắng ôm hộp quà">
  <path d="M168 205 C205 195 210 150 186 132" fill="none" stroke="${OUT}" stroke-width="24" stroke-linecap="round"/>
  <path d="M168 205 C205 195 210 150 186 132" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round"/>
  <ellipse cx="110" cy="188" rx="64" ry="50" fill="#fff" stroke="${OUT}" stroke-width="3.5"/>
  <ellipse cx="84" cy="234" rx="20" ry="10" fill="#fff" stroke="${OUT}" stroke-width="3.5"/>
  <ellipse cx="136" cy="234" rx="20" ry="10" fill="#fff" stroke="${OUT}" stroke-width="3.5"/>
  <path d="M46 74 L52 16 L98 46 Z" fill="#fff" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M174 74 L168 16 L122 46 Z" fill="#fff" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M58 60 L61 32 L84 47 Z" fill="#FFC2D6"/>
  <path d="M162 60 L159 32 L136 47 Z" fill="#FFC2D6"/>
  <ellipse cx="110" cy="96" rx="74" ry="60" fill="#fff" stroke="${OUT}" stroke-width="3.5"/>
  <g transform="translate(156 40) rotate(18)">
    <path d="M0 0 L-16 -10 L-16 10 Z" fill="#FF3F81" stroke="#E62E6E" stroke-width="2" stroke-linejoin="round"/>
    <path d="M0 0 L16 -10 L16 10 Z" fill="#FF3F81" stroke="#E62E6E" stroke-width="2" stroke-linejoin="round"/>
    <circle r="5" fill="#E62E6E"/>
  </g>
  <ellipse cx="82" cy="98" rx="7.5" ry="9.5" fill="#65283D"/>
  <ellipse cx="138" cy="98" rx="7.5" ry="9.5" fill="#65283D"/>
  <circle cx="85" cy="94" r="2.8" fill="#fff"/>
  <circle cx="141" cy="94" r="2.8" fill="#fff"/>
  <ellipse cx="64" cy="117" rx="12" ry="7" fill="#FFB3CB" opacity=".75"/>
  <ellipse cx="156" cy="117" rx="12" ry="7" fill="#FFB3CB" opacity=".75"/>
  <path d="M105 108 H115 L110 114 Z" fill="#FF7FA8" stroke="#FF7FA8" stroke-width="2" stroke-linejoin="round"/>
  <path d="M110 114 Q105 122 98 118 M110 114 Q115 122 122 118" fill="none" stroke="#65283D" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M36 104 L60 108 M36 118 L60 116 M184 104 L160 108 M184 118 L160 116" stroke="#E6B3C4" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="76" y="154" width="68" height="54" rx="8" fill="#FF3F81"/>
  <rect x="70" y="142" width="80" height="18" rx="6" fill="#FF6E9F"/>
  <rect x="104" y="142" width="12" height="66" fill="#FFE1EB"/>
  <ellipse cx="98" cy="136" rx="13" ry="8" fill="#FFE1EB" stroke="#FF3F81" stroke-width="3" transform="rotate(-20 98 136)"/>
  <ellipse cx="122" cy="136" rx="13" ry="8" fill="#FFE1EB" stroke="#FF3F81" stroke-width="3" transform="rotate(20 122 136)"/>
  <circle cx="110" cy="140" r="6" fill="#FF3F81"/>
  <circle cx="88" cy="186" r="3" fill="#fff" opacity=".7"/>
  <circle cx="132" cy="176" r="3" fill="#fff" opacity=".7"/>
  <ellipse cx="76" cy="178" rx="15" ry="12" fill="#fff" stroke="${OUT}" stroke-width="3.5"/>
  <ellipse cx="144" cy="178" rx="15" ry="12" fill="#fff" stroke="${OUT}" stroke-width="3.5"/>
</svg>`;
    },
    catPeek() {
      return `
<svg viewBox="0 0 160 112" role="img" aria-label="Mèo trắng cầm bảng lời chúc">
  <path d="M28 54 L32 8 L68 32 Z" fill="#fff" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M132 54 L128 8 L92 32 Z" fill="#fff" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M38 44 L40 22 L58 34 Z" fill="#FFC2D6"/>
  <path d="M122 44 L120 22 L102 34 Z" fill="#FFC2D6"/>
  <ellipse cx="80" cy="66" rx="58" ry="44" fill="#fff" stroke="${OUT}" stroke-width="3"/>
  <g transform="translate(118 28) rotate(18)">
    <path d="M0 0 L-12 -8 L-12 8 Z" fill="#FF3F81"/><path d="M0 0 L12 -8 L12 8 Z" fill="#FF3F81"/><circle r="4" fill="#E62E6E"/>
  </g>
  <path d="M54 66 Q60 58 66 66" fill="none" stroke="#65283D" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M94 66 Q100 58 106 66" fill="none" stroke="#65283D" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="44" cy="80" rx="9" ry="5.5" fill="#FFB3CB" opacity=".8"/>
  <ellipse cx="116" cy="80" rx="9" ry="5.5" fill="#FFB3CB" opacity=".8"/>
  <path d="M76 74 H84 L80 79 Z" fill="#FF7FA8"/>
  <path d="M80 79 Q76 85 71 82 M80 79 Q84 85 89 82" fill="none" stroke="#65283D" stroke-width="2.2" stroke-linecap="round"/>
  <ellipse cx="50" cy="104" rx="15" ry="9" fill="#fff" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="110" cy="104" rx="15" ry="9" fill="#fff" stroke="${OUT}" stroke-width="3"/>
</svg>`;
    },
    tulip(color = "#FF7FA8") {
      return `
<svg viewBox="0 0 60 120" aria-hidden="true">
  <path d="M30 48 Q27 82 30 118" fill="none" stroke="#6FBF8B" stroke-width="4" stroke-linecap="round"/>
  <path d="M30 98 Q8 88 5 64 Q24 70 30 95 Z" fill="#9BD8AE"/>
  <path d="M31 104 Q53 92 55 70 Q37 76 31 101 Z" fill="#86CF9C"/>
  <path d="M13 38 Q10 13 21 7 L30 22 L39 7 Q50 13 47 38 Q30 56 13 38 Z" fill="${color}" stroke="rgba(101,40,61,.15)" stroke-width="2"/>
  <path d="M22 16 Q30 30 30 46" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>
</svg>`;
    },
  };

  function renderArt() {
    $$("[data-art]").forEach((el) => {
      const type = el.dataset.art;
      if (!ART[type]) return;
      const fallback = el.querySelector(".cat-fallback");
      el.insertAdjacentHTML("beforeend", ART[type](el.dataset.color));
      if (fallback) el.classList.add("has-art");
    });
  }

  function giftArtHtml(gift) {
    if (gift.image) {
      // onerror: nếu ảnh lỗi thì quay về emoji
      return `<img src="${escapeHtml(gift.image)}" alt="${escapeHtml(gift.name)}" onerror="this.replaceWith(document.createTextNode('${gift.emoji}'))">`;
    }
    return gift.emoji;
  }

  /* =======================================================
     6. RENDER GIAO DIỆN
     ======================================================= */
  const boxesEl = $("#boxes");
  const boxCards = $$(".box-card", boxesEl);
  const boxBtns = $$(".box-btn", boxesEl);
  let isDrawing = false;

  function renderGiftList() {
    const pool = availableGifts();
    const totalWeight = pool.reduce((s, g) => s + g.weight, 0);
    $("#giftList").innerHTML = GIFTS.map((g) => {
      const left = state.stock[g.id] || 0;
      const pct = g.quantity ? Math.round((left / g.quantity) * 100) : 0;
      const chance = left > 0 && totalWeight ? ((g.weight / totalWeight) * 100).toFixed(1).replace(".0", "") : 0;
      return `
        <article class="gift-item ${left <= 0 ? "is-out" : ""}">
          <div class="gift-thumb" style="--tone:${g.tone}" aria-hidden="true">${giftArtHtml(g)}</div>
          <h3>${escapeHtml(g.name)}</h3>
          <p>${escapeHtml(g.wish)}</p>
          <div class="stock">
            <div class="stock-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${g.quantity}" aria-valuenow="${left}" aria-label="Số lượng còn lại"><span style="width:${pct}%"></span></div>
            <div class="stock-meta"><span>Còn lại: <b>${left}</b> / ${g.quantity}</span><span>Tỉ lệ ~${chance}%</span></div>
          </div>
        </article>`;
    }).join("");
  }

  function renderWishes() {
    $("#wishGrid").innerHTML = WISHES.map(
      (w, i) => `<article class="wish-card" style="--tone:${WISH_TONES[i % WISH_TONES.length]}"><p>${escapeHtml(w)}</p></article>`
    ).join("");
  }

  function renderHistory() {
    const list = $("#historyList");
    if (!state.history.length) {
      list.innerHTML = `<li class="history-empty">Chưa có lượt bốc thăm nào.</li>`;
      return;
    }
    list.innerHTML = state.history
      .map((h) => `<li><span>🎁</span><span>${escapeHtml(h.name || "Bạn ẩn danh")} nhận <b>${escapeHtml(h.giftName)}</b></span><time datetime="${h.time}">${formatTime(h.time)}</time></li>`)
      .join("");
  }

  function renderStatus() {
    const left = totalRemaining();
    const ended = left <= 0;
    const done = !!state.myResult;
    const bar = $("#statusBar");

    bar.classList.toggle("is-ended", ended);
    $("#statusText").textContent = ended
      ? "Đã hết quà – chương trình đã kết thúc 🌷"
      : `Còn ${left} phần quà đang chờ được mở ✨`;

    $("#endedNotice").hidden = !ended || done;
    $("#doneNotice").hidden = !done;
    if (done) $("#doneGiftName").textContent = state.myResult.giftName;

    boxesEl.classList.toggle("is-off", ended || done);
    boxBtns.forEach((b) => {
      b.disabled = isDrawing || (ended && !done);
      b.textContent = done ? "Xem quà của bạn" : ended ? "Đã hết quà" : "Chọn hộp này";
    });
  }

  function renderAll() {
    renderGiftList();
    renderHistory();
    renderStatus();
  }

  /* =======================================================
     7. HIỆU ỨNG
     ======================================================= */
  function burstFrom(el) {
    if (reducedMotion) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const icons = ["💗", "✨", "⭐", "💖", "🌸", "✦", "♥"];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("span");
      p.className = "burst";
      p.textContent = icons[i % icons.length];
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      const dist = 80 + Math.random() * 90;
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist - 30 + "px");
      p.style.setProperty("--rot", Math.random() * 360 - 180 + "deg");
      p.style.color = i % 2 ? "#FF3F81" : "#FFB84D";
      document.body.appendChild(p);
      p.addEventListener("animationend", () => p.remove());
    }
  }

  function confetti(count = 70) {
    if (reducedMotion) return;
    const layer = $("#confettiLayer");
    const colors = ["#FF3F81", "#FF8DB4", "#E8D9FF", "#B9E3FF", "#FFCDA0", "#BDEBC9", "#FFD84D"];
    for (let i = 0; i < count; i++) {
      const c = document.createElement("span");
      const kind = Math.random();
      c.className = "confetti" + (kind > 0.85 ? " heart" : kind > 0.55 ? " round" : "");
      if (kind > 0.85) c.textContent = "♥";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.color = colors[i % 2 ? 0 : 1];
      c.style.setProperty("--sway", Math.random() * 160 - 80 + "px");
      c.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
      c.style.animationDuration = 2.4 + Math.random() * 2 + "s";
      c.style.animationDelay = Math.random() * 0.6 + "s";
      layer.appendChild(c);
      c.addEventListener("animationend", () => c.remove());
    }
  }

  // Trái tim bay & cánh hoa rơi nhẹ nhàng ở nền
  function startAmbient() {
    if (reducedMotion) return;
    const layer = $("#ambient");
    const petalColors = ["#FFB3CB", "#FF8DB4", "#E8D9FF", "#FFD0DF"];
    setInterval(() => {
      if (document.hidden || layer.childElementCount > 14) return;
      const isHeart = Math.random() > 0.5;
      const el = document.createElement("span");
      el.style.left = Math.random() * 100 + "vw";
      el.style.setProperty("--sway", Math.random() * 80 - 40 + "px");
      el.style.animationDuration = 9 + Math.random() * 7 + "s";
      if (isHeart) {
        el.className = "float-heart";
        el.textContent = Math.random() > 0.5 ? "♥" : "♡";
        el.style.fontSize = 12 + Math.random() * 14 + "px";
      } else {
        el.className = "petal";
        el.style.background = petalColors[Math.floor(Math.random() * petalColors.length)];
      }
      layer.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }, 1100);
  }

  /* =======================================================
     8. MODAL KẾT QUẢ
     ======================================================= */
  const modal = $("#resultModal");
  let lastFocus = null;
  let currentResult = null;

  function showResult(result, isPrevious) {
    currentResult = result;
    const gift = giftById(result.giftId) || { emoji: "🎁", tone: "#FFE1EB", wish: "", name: result.giftName };

    $("#resultSub").textContent = isPrevious ? "Kết quả bạn đã bốc trước đó trên trình duyệt này" : "";
    $("#resultFor").textContent = result.name ? `Dành tặng: ${result.name} 💐` : "";
    const art = $("#resultGiftArt");
    art.style.setProperty("--tone", gift.tone);
    art.innerHTML = giftArtHtml(gift);
    $("#resultGiftName").textContent = result.giftName;
    $("#resultGiftNote").textContent = gift.wish || "";
    $("#resultWish").textContent = (result.name ? `Gửi ${result.name} thân mến, ` : "") + result.wish;
    $("#resultDate").textContent = "🌷 Ngày Phụ nữ Việt Nam 20/10 · " + formatTime(result.time);

    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    setTimeout(() => $("#shareBtn").focus(), 50);
    if (!isPrevious) confetti();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* =======================================================
     9. LUỒNG BỐC THĂM
     ======================================================= */
  async function handleBoxClick(card) {
    if (isDrawing) return;

    // Đã bốc trên trình duyệt này → hiển thị lại kết quả cũ
    if (state.myResult) {
      showResult(state.myResult, true);
      return;
    }

    const gift = pickWeighted();
    if (!gift) {
      renderStatus();
      toast("Rất tiếc, tất cả phần quà đã được trao hết 🌷", "error");
      return;
    }

    // 1. Khóa thao tác
    isDrawing = true;
    boxesEl.classList.add("is-locked");
    card.classList.add("is-active");
    boxBtns.forEach((b) => (b.disabled = true));
    const btn = $(".box-btn", card);
    btn.textContent = "Đang mở quà...";

    // Ghi nhận ngay (trừ số lượng, không để âm) để tránh mất dữ liệu nếu tải lại trang
    state.stock[gift.id] = Math.max(0, (state.stock[gift.id] || 0) - 1);
    const name = ($("#nameInput").value || state.participant || "").trim().slice(0, 40);
    const result = {
      giftId: gift.id,
      giftName: gift.name,
      wish: randomWish(),
      name,
      box: Number(card.dataset.index) + 1,
      time: new Date().toISOString(),
    };
    state.participant = name;
    state.myResult = result;
    state.history.unshift(result);
    save();

    try {
      // 2. Rung hộp
      card.classList.add("is-shaking");
      await wait(reducedMotion ? 300 : SHAKE_MS);
      card.classList.remove("is-shaking");

      // 3–4. Mở nắp + lấp lánh
      card.classList.add("is-opened");
      burstFrom($(".gift", card));
      await wait(reducedMotion ? 150 : 900);

      // 5–6. Hiện kết quả
      showResult(result, false);
      renderAll();
      await wait(reducedMotion ? 0 : 600);
    } catch (err) {
      console.error(err);
      toast("Có lỗi khi hiển thị hiệu ứng, nhưng phần quà của bạn đã được ghi nhận.", "error");
      showResult(result, false);
    } finally {
      // 7. Mở khóa
      card.classList.remove("is-opened", "is-active");
      boxesEl.classList.remove("is-locked");
      isDrawing = false;
      renderAll();
    }
  }

  boxCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      // Click vào thẻ (kể cả hình hộp) đều được tính; nút bị disabled thì bỏ qua
      const btn = $(".box-btn", card);
      if (btn.disabled) return;
      if (e.target.closest("button") && e.target.closest("button") !== btn) return;
      handleBoxClick(card);
    });
  });

  /* =======================================================
     10. CHIA SẺ / TẢI ẢNH / VỀ TRANG CHỦ
     ======================================================= */
  function shareText() {
    if (!currentResult) return "";
    return `🎁 Mình vừa nhận được "${currentResult.giftName}" trong chương trình Bốc Thăm Quà Tặng 20/10! 💗\n\n${currentResult.wish}`;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) { /* thử cách khác */ }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  $("#shareBtn").addEventListener("click", async () => {
    const text = shareText();
    if (navigator.share) {
      try {
        const data = { title: "Bốc Thăm Quà Tặng 20/10", text };
        if (/^https?:/.test(location.protocol)) data.url = location.href;
        await navigator.share(data);
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // người dùng tự hủy
      }
    }
    if (await copyText(text)) {
      toast("Đã sao chép lời chúc – bạn có thể dán để chia sẻ nhé! 💗", "success");
    } else {
      window.prompt("Trình duyệt không hỗ trợ chia sẻ. Hãy sao chép lời chúc bên dưới:", text);
    }
  });

  $("#downloadBtn").addEventListener("click", async () => {
    const btn = $("#downloadBtn");
    if (typeof window.html2canvas !== "function") {
      toast("Không tải được thư viện tạo ảnh (cần kết nối Internet). Bạn hãy chụp màn hình để lưu kết quả nhé!", "error", 5000);
      return;
    }
    btn.classList.add("is-loading");
    btn.textContent = "Đang tạo ảnh...";
    try {
      const canvas = await window.html2canvas($("#resultCard"), {
        backgroundColor: "#FFF5F8",
        scale: Math.min(2, window.devicePixelRatio || 1) + 1,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `qua-20-10-${(currentResult && currentResult.giftId) || "ket-qua"}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast("Đã tải ảnh kết quả 📸", "success");
    } catch (err) {
      console.error(err);
      toast("Không thể tạo ảnh trên trình duyệt này. Bạn hãy chụp màn hình nhé!", "error", 5000);
    } finally {
      btn.classList.remove("is-loading");
      btn.textContent = "📸 Tải ảnh kết quả";
    }
  });

  $("#homeBtn").addEventListener("click", () => {
    closeModal();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  $("#viewResultBtn").addEventListener("click", () => {
    if (state.myResult) showResult(state.myResult, true);
  });

  /* =======================================================
     11. TÊN NGƯỜI THAM GIA & CÔNG CỤ TỔ CHỨC
     ======================================================= */
  const nameInput = $("#nameInput");
  nameInput.value = state.participant || "";

  $("#nameForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim().slice(0, 40);
    state.participant = name;
    save();
    $("#nameHint").textContent = name
      ? `Xin chào ${name}! Lời chúc sẽ được gửi riêng đến bạn 💗`
      : "Bạn sẽ bốc thăm ở chế độ ẩn danh.";
  });

  $("#nextPersonBtn").addEventListener("click", () => {
    if (isDrawing) return;
    if (!state.myResult) {
      toast("Lượt hiện tại chưa bốc thăm – người tiếp theo có thể bốc ngay.");
      return;
    }
    if (!confirm("Chuyển sang lượt cho người tiếp theo? Số quà còn lại và lịch sử vẫn được giữ nguyên.")) return;
    state.myResult = null;
    state.participant = "";
    nameInput.value = "";
    $("#nameHint").textContent = "";
    save();
    renderAll();
    toast("Sẵn sàng cho người tiếp theo 🎀", "success");
    document.getElementById("pick").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });

  $("#resetBtn").addEventListener("click", () => {
    if (isDrawing) return;
    if (!confirm("Đặt lại toàn bộ dữ liệu demo? Lịch sử và số lượng quà sẽ trở về ban đầu.")) return;
    storage.clear();
    state = freshState();
    nameInput.value = "";
    $("#nameHint").textContent = "";
    renderAll();
    toast("Đã đặt lại dữ liệu demo ✨", "success");
  });

  /* =======================================================
     12. ĐIỀU HƯỚNG & KHỞI TẠO
     ======================================================= */
  const navToggle = $("#navToggle");
  const mainNav = $("#mainNav");
  function setNav(open) {
    mainNav.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
  }
  navToggle.addEventListener("click", () => setNav(!mainNav.classList.contains("open")));
  $$("a", mainNav).forEach((a) => a.addEventListener("click", () => setNav(false)));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-wrap")) setNav(false);
  });

  const header = $("#siteHeader");
  window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 10), { passive: true });

  function hideLoader() {
    const loader = $("#loader");
    if (!loader || loader.hidden) return;
    loader.classList.add("is-hidden");
    setTimeout(() => (loader.hidden = true), 450);
  }
  window.addEventListener("load", hideLoader);
  setTimeout(hideLoader, 2500); // không chờ quá lâu nếu font/thư viện tải chậm

  try {
    renderArt();
    renderWishes();
    renderAll();
    if (state.participant) $("#nameHint").textContent = `Xin chào ${state.participant}! 💗`;
    startAmbient();
    if (!storage.ok) {
      toast("Trình duyệt đang chặn lưu dữ liệu – kết quả sẽ mất khi tải lại trang.", "error", 5000);
    }
  } catch (err) {
    console.error(err);
    toast("Có lỗi khi khởi tạo trang. Vui lòng tải lại trang.", "error", 6000);
  }
})();
