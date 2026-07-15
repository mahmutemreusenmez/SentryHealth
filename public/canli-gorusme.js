/*
 * SentryMD canlı görüntülü triyaj hekim/ebe paneli — gerçek WebRTC istemcisi.
 *
 * Bu sitedeki WebSocket sinyal sunucusuna (/rtc) bağlanır, mobil uygulamadaki
 * hasta/anne eşiyle SDP/ICE değişimini yapar ve uzak akışı ekrana yansıtır.
 * Karşı taraftan gelen canlı vital metadata gösterilir; hekim/ebe 3 yönlü sevk
 * kararını mobil ekrana canlı olarak iletir.
 */
(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var room = (params.get("room") || "sentry-triage-demo").slice(0, 80);
  var mode = params.get("mode") === "baby" ? "baby" : "triage";
  var role = params.get("role") || (mode === "baby" ? "nurse" : "clinician");
  var name = params.get("name") || (mode === "baby" ? "Nöbetçi Ebe" : "Triyaj Hekimi");

  var ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  var remoteVideo = document.getElementById("remoteVideo");
  var localVideo = document.getElementById("localVideo");
  var statusPill = document.getElementById("statusPill");
  var statusText = document.getElementById("statusText");
  var connLine = document.getElementById("connLine");
  var metaBody = document.getElementById("metaBody");
  var issuedEl = document.getElementById("issued");
  var roomTag = document.getElementById("roomTag");
  var panelTitle = document.getElementById("panelTitle");
  var referralTitle = document.getElementById("referralTitle");
  var referralButtons = document.getElementById("referralButtons");

  var isCaller = role === "patient" || role === "mother";
  var metaText = params.get("meta") || "";

  roomTag.textContent = "Oda: " + room + " · Rol: " + role;
  if (isCaller) {
    panelTitle.textContent = mode === "baby" ? "SentryBaby · Anne Görüşme" : "SentryCompanion · Hasta Görüşme";
    referralTitle.textContent = "Gelen Sevk / Yönlendirme";
    referralButtons.innerHTML = '<div class="meta-empty">Hekim/ebe kararı burada canlı görünecek.</div>';
  } else if (mode === "baby") {
    panelTitle.textContent = "SentryMD · Ebe / Hemşire Paneli";
    referralTitle.textContent = "Ebe / Hemşire Sevk Kararı";
  }

  var REFERRALS =
    mode === "baby"
      ? [
          { level: "pediatric", cls: "red", prefix: "COC", label: "Uzman Çocuk Hekimine Sevk Et", title: "Uzman Çocuk Hekimine Sevk (Kırmızı)", message: "Öncelikli MHRS randevusu / çocuk polikliniği sevki oluşturuldu." },
          { level: "family-health", cls: "amber", prefix: "ASM", label: "Aile Sağlığı Merkezine Davet Et", title: "Aile Sağlığı Merkezi Daveti (Sarı)", message: "Aşı / yüz yüze kontrol için ASM randevu kartı oluşturuldu." },
          { level: "home", cls: "green", prefix: "EVD", label: "Evde Takibe Devam Et", title: "Evde Takip (Yeşil)", message: "Bebek bakım ve beslenme rehberi uygulamanıza gönderildi." },
        ]
      : [
          { level: "emergency", cls: "red", prefix: "ACL", label: "Kırmızı: Acil Sevk", title: "Acil Sevk (Kırmızı)", message: "En yakın acil servise öncelikli sevk barkodu oluşturuldu." },
          { level: "clinic", cls: "amber", prefix: "POL", label: "Sarı: Poliklinik Sevk", title: "Poliklinik Sevk (Sarı)", message: "İlgili branş polikliniğine MHRS randevu kartı oluşturuldu." },
          { level: "home", cls: "green", prefix: "EVD", label: "Yeşil: Evde Takip", title: "Evde Takip (Yeşil)", message: "Evde takip ve bakım önerileri uygulamanıza gönderildi." },
        ];

  function setStatus(text, cls) {
    statusText.textContent = text;
    statusPill.className = "status-pill" + (cls ? " " + cls : "");
  }
  function setConn(state) {
    connLine.textContent = "Bağlantı: " + state;
  }

  var ws = null;
  var pc = null;
  var localStream = null;
  var peerId = null;
  var dc = null;
  var refButtons = [];

  function wsUrl() {
    var proto = window.location.protocol === "https:" ? "wss" : "ws";
    return proto + "://" + window.location.host + "/rtc";
  }
  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function sendMeta() {
    if (!isCaller || !metaText) return;
    send({ type: "meta", text: metaText, to: peerId });
    if (dc && dc.readyState === "open") dc.send(JSON.stringify({ type: "meta", text: metaText }));
  }

  function renderIncomingReferral(ref) {
    referralButtons.innerHTML = "";
    var card = document.createElement("div");
    var t = document.createElement("div");
    t.style.fontWeight = "700";
    t.style.fontSize = "13px";
    t.textContent = ref.title;
    var m = document.createElement("div");
    m.style.fontSize = "12px";
    m.style.color = "var(--muted)";
    m.style.margin = "6px 0";
    m.textContent = ref.message;
    var c = document.createElement("div");
    c.style.fontWeight = "800";
    c.style.letterSpacing = "2px";
    c.style.fontSize = "16px";
    c.textContent = ref.code;
    card.appendChild(t);
    card.appendChild(m);
    card.appendChild(c);
    referralButtons.appendChild(card);
  }

  function renderMeta(text) {
    metaBody.innerHTML = "";
    var parts = String(text).split("·");
    parts.forEach(function (p) {
      var t = p.trim();
      if (!t) return;
      var row = document.createElement("div");
      row.className = "meta-row";
      var idx = t.indexOf(" ");
      if (idx > 0) {
        var k = document.createElement("span");
        k.textContent = t.slice(0, idx);
        var v = document.createElement("strong");
        v.textContent = t.slice(idx + 1);
        row.appendChild(k);
        row.appendChild(v);
      } else {
        row.textContent = t;
      }
      metaBody.appendChild(row);
    });
  }

  function ensurePc() {
    if (pc) return pc;
    pc = new RTCPeerConnection(ICE);
    if (localStream) {
      localStream.getTracks().forEach(function (t) {
        pc.addTrack(t, localStream);
      });
    }
    pc.ontrack = function (e) {
      remoteVideo.srcObject = e.streams[0];
      setStatus("Karşı taraf bağlandı (canlı video akışı)", "ok");
    };
    pc.onicecandidate = function (e) {
      if (e.candidate) send({ type: "candidate", candidate: e.candidate, to: peerId });
    };
    pc.onconnectionstatechange = function () {
      setConn(pc.connectionState);
      if (pc.connectionState === "connected") {
        setStatus("WebRTC P2P bağlantısı KURULDU", "ok");
        if (isCaller) sendMeta();
        else enableReferrals(true);
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setStatus("Bağlantı koptu", "err");
      }
    };
    pc.ondatachannel = function (e) {
      bindDataChannel(e.channel);
    };
    return pc;
  }

  function bindDataChannel(channel) {
    dc = channel;
    channel.onopen = function () {
      sendMeta();
    };
    channel.onmessage = function (ev) {
      try {
        var data = JSON.parse(ev.data);
        if (data && data.type === "meta" && data.text) renderMeta(data.text);
        else if (data && data.type === "referral" && data.referral) renderIncomingReferral(data.referral);
      } catch (err) {
        /* ignore */
      }
    };
  }

  async function makeOffer() {
    var conn = ensurePc();
    // Kamera olmasa bile ICE müzakeresinin tamamlanması için bir veri kanalı aç.
    var channel = conn.createDataChannel("sentry-meta");
    bindDataChannel(channel);
    var offer = await conn.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await conn.setLocalDescription(offer);
    send({ type: "offer", sdp: conn.localDescription, to: peerId });
  }

  async function handleOffer(msg) {
    peerId = msg.from;
    var conn = ensurePc();
    await conn.setRemoteDescription(msg.sdp);
    var answer = await conn.createAnswer();
    await conn.setLocalDescription(answer);
    send({ type: "answer", sdp: conn.localDescription, to: peerId });
    sendMeta();
  }

  function enableReferrals(enabled) {
    refButtons.forEach(function (b) {
      b.disabled = !enabled;
    });
  }

  function buildReferralButtons() {
    REFERRALS.forEach(function (r) {
      var btn = document.createElement("button");
      btn.className = "ref-btn " + r.cls;
      btn.textContent = r.label;
      btn.disabled = true;
      btn.addEventListener("click", function () {
        var code = r.prefix + "-" + Math.floor(100000 + Math.random() * 900000);
        send({
          type: "referral",
          to: peerId,
          referral: { level: r.level, code: code, title: r.title, message: r.message },
        });
        issuedEl.style.display = "block";
        issuedEl.textContent = "Gönderildi · " + code + " — annenin/hastanın ekranına canlı iletildi";
      });
      referralButtons.appendChild(btn);
      refButtons.push(btn);
    });
  }

  async function start() {
    if (!isCaller) buildReferralButtons();
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
    } catch (err) {
      // Kamera/mikrofon yoksa alıcı (receive-only) modda devam et.
      setStatus("Kamera bulunamadı — yalnızca izleme modunda", "err");
    }

    ws = new WebSocket(wsUrl());
    ws.onopen = function () {
      setStatus("Sinyal sunucusuna bağlanıldı — eş bekleniyor", null);
      send({ type: "join", room: room, role: role, name: name });
    };
    ws.onerror = function () {
      setStatus("Sinyal sunucusuna bağlanılamadı", "err");
    };
    ws.onclose = function () {
      setStatus("Sinyal bağlantısı kapandı", "err");
    };
    ws.onmessage = async function (ev) {
      var msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (err) {
        return;
      }
      if (msg.type === "joined") {
        if (msg.peers && msg.peers.length) {
          peerId = msg.peers[0].id;
          setStatus("Eş bulundu — bağlantı kuruluyor", null);
          await makeOffer();
        }
      } else if (msg.type === "peer-joined") {
        peerId = msg.id;
        setStatus("Karşı taraf katıldı — teklif bekleniyor", null);
      } else if (msg.type === "offer") {
        setStatus("Teklif alındı — yanıtlanıyor", null);
        await handleOffer(msg);
      } else if (msg.type === "answer") {
        if (pc) await pc.setRemoteDescription(msg.sdp);
      } else if (msg.type === "candidate") {
        if (pc && msg.candidate) {
          try {
            await pc.addIceCandidate(msg.candidate);
          } catch (err) {
            /* ignore */
          }
        }
      } else if (msg.type === "meta" && msg.text) {
        renderMeta(msg.text);
      } else if (msg.type === "referral" && msg.referral) {
        renderIncomingReferral(msg.referral);
      } else if (msg.type === "peer-left") {
        setStatus("Karşı taraf ayrıldı", "err");
        enableReferrals(false);
        remoteVideo.srcObject = null;
      }
    };
  }

  window.addEventListener("beforeunload", function () {
    if (pc) pc.close();
    if (ws) ws.close();
    if (localStream) localStream.getTracks().forEach(function (t) { t.stop(); });
  });

  start();
})();
