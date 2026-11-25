{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * Fire TV Card (FR)
 * Carte Home Assistant pour vos Fire TV / Android TV (intégration Android Debug Bridge) :
 * capture de l'écran quand elle est possible, tuile de l'appli quand elle est protégée (Netflix, Free TV…),
 * titre en cours, télécommande, applis favorites. Plusieurs TV, style verre, thème clair/sombre, éditeur visuel.
 */

const CARD_VERSION = "1.0.1";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

const DEFAULTS = {
  title: "",
  theme: "auto", nuance: "theme", intensite: 1,
  columns: 0,          // 0 = automatique
  refresh: 10,         // secondes entre deux rechargements de la caméra de capture
  logos: false,        // true : logos perso dans logos_path (<clé>.png), sinon icônes
  logos_path: "/local/image/logos/",
  favorites: [],       // applis favorites par défaut (identifiants ou clés)
  tvs: [],
};

/* Applis connues : clé, nom, couleur, icône, protégée (capture bloquée), identifiants Android.
 * « protégée » : la capture d'écran est noire ou absente, la carte affiche toujours la tuile. */
const APPS = [
  ["accueil", "Accueil", "#5b6cff", "mdi:home-outline", false, ["com.amazon.tv.launcher", "com.google.android.tvlauncher", "com.google.android.apps.tv.launcherx"]],
  ["oqee", "Free TV (OQEE)", "#d6313a", "mdi:television-classic", true, ["net.oqee.androidtv.amazon", "net.oqee.androidtv", "net.oqee.android"]],
  ["netflix", "Netflix", "#c4161c", "mdi:movie-open-outline", true, ["com.netflix.ninja", "com.netflix.mediaclient"]],
  ["prime", "Prime Video", "#1f8fd6", "mdi:play-box-outline", true, ["com.amazon.firebat", "com.amazon.avod", "com.amazon.avod.thirdpartyclient"]],
  ["disney", "Disney+", "#1f3f9c", "mdi:castle", true, ["com.disney.disneyplus"]],
  ["appletv", "Apple TV", "#3a3d44", "mdi:television-play", true, ["com.apple.atve.amazon.appletv", "com.apple.atve.androidtv.appletv"]],
  ["canal", "Canal+", "#2b2b2b", "mdi:television-shimmer", true, ["com.canal.android.canal", "com.canalplus.canalplus"]],
  ["max", "Max", "#2c48c8", "mdi:filmstrip", true, ["com.wbd.stream", "com.hbo.hbonow"]],
  ["paramount", "Paramount+", "#1c5fd4", "mdi:image-filter-hdr", true, ["com.cbs.ott", "com.cbs.ca"]],
  ["tf1", "TF1+", "#1d4fb8", "mdi:numeric-1-box-outline", true, ["fr.tf1.mytf1", "fr.tf1.tfou"]],
  ["m6", "M6+", "#5a2fb0", "mdi:numeric-6-box-outline", true, ["fr.m6.m6replay", "fr.m6.m6replay.by"]],
  ["francetv", "france.tv", "#2a6fe0", "mdi:television-guide", true, ["fr.francetv.pluzz", "fr.francetelevisions.francetv"]],
  ["molotov", "Molotov", "#e8492b", "mdi:television-box", true, ["tv.molotov.app"]],
  ["arte", "Arte", "#ef6a1c", "mdi:palette-outline", false, ["tv.arte.plus7"]],
  ["youtube", "YouTube", "#e3262b", "mdi:play-circle-outline", false, ["com.amazon.firetv.youtube", "com.google.android.youtube.tv", "com.google.android.youtube.tvkids"]],
  ["twitch", "Twitch", "#8247e5", "mdi:message-video", false, ["tv.twitch.android.viewer", "tv.twitch.android.app"]],
  ["spotify", "Spotify", "#1db954", "mdi:music-circle-outline", false, ["com.spotify.tv.android"]],
  ["deezer", "Deezer", "#a238ff", "mdi:music-note-outline", false, ["deezer.android.tv"]],
  ["plex", "Plex", "#e5a00d", "mdi:plex", false, ["com.plexapp.android"]],
  ["kodi", "Kodi", "#17b2e7", "mdi:kodi", false, ["org.xbmc.kodi"]],
  ["vlc", "VLC", "#f08a00", "mdi:cone", false, ["org.videolan.vlc"]],
  ["crunchyroll", "Crunchyroll", "#f47521", "mdi:animation-play-outline", true, ["com.crunchyroll.crunchyroid"]],
  ["silk", "Navigateur", "#3f7fd8", "mdi:web", false, ["com.amazon.cloud9"]],
  ["reglages", "Paramètres", "#6d7487", "mdi:cog-outline", false, ["com.amazon.tv.settings.v2", "com.amazon.tv.settings", "com.android.tv.settings"]],
];
const APP_BY_ID = {};
APPS.forEach((a) => a[5].forEach((id) => { APP_BY_ID[id] = a; }));
const APP_BY_KEY = Object.fromEntries(APPS.map((a) => [a[0], a]));

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const bad = (st) => !st || st.state === "unavailable" || st.state === "unknown";
const safeUrl = (u) => u && !/^\s*(javascript|vbscript|data:text)/i.test(String(u));
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const OFF = ["off", "standby", "unavailable", "unknown"];
const STATUS = { playing: "En lecture", paused: "En pause", idle: "Inactif", on: "Allumé", buffering: "Chargement", standby: "En veille", off: "Éteint", unavailable: "Injoignable", unknown: "Inconnu" };

// Nom lisible d'un identifiant inconnu : « com.exemple.super_appli » → « Super appli ».
function prettyId(id) {
  const parts = String(id || "").split(".").filter((p) => !["com", "fr", "net", "tv", "org", "android", "androidtv", "amazon", "app", "firetv"].includes(p));
  const p = (parts[parts.length - 1] || id || "").replace(/[_-]+/g, " ");
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

// Appli en cours : d'abord les applis perso de la config, puis la table des applis connues.
function appInfo(cfg, tv, appId, appName) {
  const custom = [...(tv.apps || []), ...(cfg.apps || [])].find((a) => a && (a.id === appId || (Array.isArray(a.ids) && a.ids.includes(appId))));
  if (custom) return { key: custom.key || prettyId(appId).toLowerCase(), name: custom.name || appName || prettyId(appId), color: custom.color || "#5b6cff",
    icon: custom.icon || "mdi:application-outline", prot: !!custom.protected, logo: custom.logo || "" };
  const a = APP_BY_ID[appId];
  if (a) return { key: a[0], name: a[1], color: a[2], icon: a[3], prot: a[4], logo: "" };
  if (!appId && !appName) return null;
  return { key: "", name: appName || prettyId(appId), color: "#6d7487", icon: "mdi:application-outline", prot: false, logo: "" };
}

// Favori : identifiant Android ou clé de la table (ex. « netflix »).
function favInfo(f) {
  const a = APP_BY_KEY[f] || APP_BY_ID[f];
  return a ? { id: a[5][0], key: a[0], name: a[1], color: a[2], icon: a[3] } : { id: f, key: "", name: prettyId(f), color: "#6d7487", icon: "mdi:application-outline" };
}

// URL d'image d'une entité (camera.*, image.* ou media_player.*), "" si absente.
function picUrl(hass, eid, tick) {
  const s = eid && hass.states[eid];
  if (bad(s) || !s.attributes || !s.attributes.entity_picture) return "";
  const u = String(s.attributes.entity_picture);
  const full = typeof hass.hassUrl === "function" ? hass.hassUrl(u) : u;
  const d = eid.startsWith("image.") ? s.state : eid.startsWith("camera.") ? tick : "";
  return d ? full + (full.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(d) : full;
}

// Zone de l'écran dans la photo du téléviseur (en % : gauche, haut, largeur, hauteur).
function screenArea(v) {
  const n = String(v ?? "").split(/[,; ]+/).map(Number).filter(Number.isFinite);
  return n.length === 4 ? n : [3, 4, 94, 86];
}

class FireTvCard extends HTMLElement {
  static getConfigElement() { return document.createElement("firetv-card-editor"); }

  static getStubConfig(hass) {
    const mp = hass ? Object.keys(hass.states).filter((e) => e.startsWith("media_player.") && /fire|android/i.test(e)) : [];
    return { ...DEFAULTS, title: "Fire TV", favorites: ["oqee", "netflix", "prime", "youtube"],
      tvs: (mp.length ? mp.slice(0, 3) : ["media_player.fire_tv"]).map((e) => ({ entity: e })) };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
    this._tick = String(Math.floor(Date.now() / 1000));
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config };
    if (!Array.isArray(this._config.tvs)) this._config.tvs = [];
    this._sig = "";
    this._timer();
    if (this._hass) this._render();
  }

  connectedCallback() { this._timer(); }
  disconnectedCallback() { clearInterval(this._iv); this._iv = null; }

  // Rechargement périodique des caméras de capture (fichier mis à jour par une automatisation).
  _timer() {
    clearInterval(this._iv); this._iv = null;
    if (!this.isConnected || !this._config) return;
    if (!this._config.tvs.some((t) => t.screenshot_entity && String(t.screenshot_entity).startsWith("camera."))) return;
    const s = Math.max(3, Number(this._config.refresh) || 10);
    this._iv = setInterval(() => {
      this._tick = String(Math.floor(Date.now() / 1000));
      if (!this._hass) return;
      this.shadowRoot.querySelectorAll("img[data-cam]").forEach((img) => {
        const t = this._config.tvs[Number(img.dataset.cam)];
        const u = t && picUrl(this._hass, t.screenshot_entity, this._tick);
        if (u) { const n = new Image(); n.onload = () => { img.src = u; }; n.src = u; }
      });
    }, s * 1000);
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const sig = this._config.tvs.map((t) => {
      const s = t.entity && hass.states[t.entity];
      const a = (s && s.attributes) || {};
      const sc = t.screenshot_entity && hass.states[t.screenshot_entity];
      return [s ? s.state : "x", a.app_id, a.app_name, a.source, a.media_title, a.media_series_title, a.entity_picture, a.is_volume_muted,
        sc ? sc.state + (sc.attributes && sc.attributes.entity_picture) : ""].join("|");
    }).join(";") + "#" + (this._isDark() ? "d" : "l");
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  getCardSize() { return 2 + this._config.tvs.length * 4; }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    if (typeof dm === "boolean") return dm;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  _more(id) {
    if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } }));
  }

  // Les boutons Retour / Accueil passent par ADB : uniquement pour l'intégration Android Debug Bridge.
  _isAdb(eid) {
    const e = this._hass.entities && this._hass.entities[eid];
    return !e || !e.platform || e.platform === "androidtv";
  }

  _logo(app, i) {
    const c = this._config;
    const src = app.logo || (c.logos && app.key ? String(c.logos_path || "").replace(/\/?$/, "/") + app.key + ".png" : "");
    const icon = `<ha-icon icon="${esc(app.icon)}"></ha-icon>`;
    return safeUrl(src) ? `<span class="lg has"><img data-logo="${i}" src="${esc(src)}" alt="">${icon}</span>` : `<span class="lg">${icon}</span>`;
  }

  _screen(t, i, s, on) {
    const h = this._hass, c = this._config, a = (s && s.attributes) || {};
    if (!on) return `<div class="offscr"><ha-icon icon="mdi:power"></ha-icon>${s && s.state === "unavailable" ? "<small>Injoignable</small>" : ""}</div>`;
    const appId = a.app_id || a.source || "";
    const app = appInfo(c, t, appId, a.app_name);
    const forced = (t.tile_apps || []).includes(appId) || (app && (t.tile_apps || []).includes(app.key));
    const cam = t.screenshot_entity ? picUrl(h, t.screenshot_entity, this._tick) : "";
    const shot = cam || (t.use_screencap === false ? "" : picUrl(h, t.entity, ""));
    if (shot && !(app && app.prot) && !forced)
      return `<img class="shot" ${cam ? `data-cam="${i}"` : ""} src="${esc(shot)}" alt="">`;
    const title = a.media_series_title && a.media_title ? `${a.media_series_title} · ${a.media_title}` : a.media_title || "";
    const ap = app || { key: "accueil", name: "Allumé", color: "#5b6cff", icon: "mdi:television", logo: "" };
    return `<div class="tile" style="--app:${esc(ap.color)}">
        ${this._logo(ap, i)}
        <b>${esc(cut(ap.name, 28))}</b>
        ${title ? `<small>${esc(cut(String(title), 48))}</small>` : ""}
      </div>`;
  }

  _render() {
    const c = this._config, h = this._hass;
    if (!c || !h) return;
    const dark = this._isDark();
    const cols = Number(c.columns) > 0 ? Number(c.columns) : 0;

    const cards = c.tvs.map((t, i) => {
      const s = t.entity ? h.states[t.entity] : null;
      const st = s ? String(s.state) : "unavailable";
      const on = !!s && !OFF.includes(st);
      const a = (s && s.attributes) || {};
      const name = t.name || a.friendly_name || `TV ${i + 1}`;
      const playing = st === "playing";
      const art = this._screen(t, i, s, on);
      const framed = safeUrl(t.tv_picture);
      const [l, tp, w, hh] = screenArea(t.screen_area);
      const scr = framed
        ? `<div class="tvimg"><img class="frame" src="${esc(t.tv_picture)}" alt=""><div class="ov" style="left:${l}%;top:${tp}%;width:${w}%;height:${hh}%">${art}</div></div>`
        : `<div class="tvbox"><div class="bezel"><div class="ov full">${art}</div></div><div class="foot"></div></div>`;
      const favs = (Array.isArray(t.favorites) && t.favorites.length ? t.favorites : c.favorites || []).map(favInfo);
      const adb = this._isAdb(t.entity);
      const dis = on ? "" : "disabled";
      return `
      <div class="tv ${on ? "on" : "off"} ${playing ? "play" : ""}" data-i="${i}">
        <div class="top"><b>${esc(name)}</b><span class="st"><i></i>${STATUS[st] || st}</span></div>
        <div class="art" data-more="${i}" title="Détails">${scr}</div>
        <div class="btns">
          <button class="b pw" data-pw="${i}" title="${on ? "Éteindre" : "Allumer"}"><ha-icon icon="mdi:power"></ha-icon></button>
          ${adb ? `<button class="b" data-key="${i}" data-k="BACK" title="Retour" ${dis}><ha-icon icon="mdi:arrow-u-left-top"></ha-icon></button>
          <button class="b" data-key="${i}" data-k="HOME" title="Accueil" ${dis}><ha-icon icon="mdi:home-outline"></ha-icon></button>` : ""}
          <button class="b" data-svc="${i}" data-s="media_play_pause" title="Lecture / pause" ${dis}><ha-icon icon="${playing ? "mdi:pause" : "mdi:play"}"></ha-icon></button>
          <button class="b" data-svc="${i}" data-s="volume_down" title="Baisser le son" ${dis}><ha-icon icon="mdi:volume-minus"></ha-icon></button>
          <button class="b" data-svc="${i}" data-s="volume_up" title="Monter le son" ${dis}><ha-icon icon="mdi:volume-plus"></ha-icon></button>
        </div>
        ${favs.length ? `<div class="favs">${favs.map((f, k) => `<button class="fav" style="--app:${esc(f.color)}" data-fav="${i}" data-f="${k}" title="Lancer ${esc(f.name)}" ${dis}><ha-icon icon="${esc(f.icon)}"></ha-icon>${esc(cut(f.name, 14))}</button>`).join("")}</div>` : ""}
      </div>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        ha-card.dark {
          --tv-text:#f4f6fb; --tv-muted:#a9afc0; --tv-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%));
          --tv-border:rgba(255,255,255,.14); --tv-shadow:0 .6em 2em rgba(0,0,0,.35);
          --tv-glass:rgba(255,255,255,.07); --tv-glass-b:rgba(255,255,255,.13); --tv-fill:rgba(255,255,255,.09); --tv-fill-b:rgba(255,255,255,.16);
          --tv-on:#3ddc84; --tv-play:#4fa3ff; --tv-err:#ff5a5f; --tv-off:#8a8f9c; --tv-bezel:#0d0f15; --tv-bezel-b:#3a3f4d;
        }
        ha-card.light {
          --tv-text:#1c2030; --tv-muted:#5d6477; --tv-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%));
          --tv-border:rgba(20,24,40,.12); --tv-shadow:0 .4em 1.4em rgba(20,24,40,.12);
          --tv-glass:rgba(255,255,255,.7); --tv-glass-b:rgba(20,24,40,.1); --tv-fill:rgba(20,24,40,.06); --tv-fill-b:rgba(20,24,40,.14);
          --tv-on:#1a9d55; --tv-play:#1f6fd6; --tv-err:#d32f35; --tv-off:#8a8f9c; --tv-bezel:#16181f; --tv-bezel-b:#4a4f5c;
        }
        ha-card { display:flex; flex-direction:column; gap:12px; padding:16px; overflow:hidden; color:var(--tv-text);
          border-radius:24px; border:1px solid var(--tv-border); background:var(--tv-bg); box-shadow:var(--tv-shadow); }
        ha-icon { --mdc-icon-size:1.2em; flex:none; }
        button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; -webkit-tap-highlight-color:transparent; }
        h2 { margin:0; font-size:1.1em; font-weight:650; }
        .grid { display:grid; gap:12px; grid-template-columns:${cols ? `repeat(${cols},minmax(0,1fr))` : "repeat(auto-fit,minmax(15em,1fr))"}; }
        .tv { display:flex; flex-direction:column; gap:10px; padding:14px; border-radius:18px; background:var(--tv-glass); border:1px solid var(--tv-glass-b);
          -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); min-width:0; }
        .tv.on { box-shadow:inset 0 0 2.4em color-mix(in srgb, var(--tv-on) 12%, transparent); }
        .tv.play { box-shadow:inset 0 0 2.4em color-mix(in srgb, var(--tv-play) 16%, transparent); }
        .top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .top b { font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .st { display:flex; align-items:center; gap:.4em; font-size:.78em; font-weight:600; color:var(--tv-off); white-space:nowrap; }
        .st i { width:.6em; height:.6em; border-radius:50%; background:currentColor; box-shadow:0 0 .5em currentColor; }
        .tv.on .st { color:var(--tv-on); } .tv.play .st { color:var(--tv-play); }
        .art { cursor:pointer; display:flex; justify-content:center; }
        .tvbox { width:100%; max-width:380px; }
        .bezel { position:relative; aspect-ratio:16/9; border-radius:10px; padding:2.2%; background:var(--tv-bezel); border:1px solid var(--tv-bezel-b); }
        .foot { width:28%; height:6px; margin:0 auto; border-radius:0 0 6px 6px; background:var(--tv-bezel-b); }
        .tvimg { position:relative; width:100%; max-width:380px; } .frame { display:block; width:100%; height:auto; }
        .ov { position:absolute; overflow:hidden; border-radius:4px; background:#05060a; }
        .ov.full { inset:2.2%; }
        .shot { display:block; width:100%; height:100%; object-fit:cover; }
        .offscr { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.3em; color:#5a5f6b; }
        .offscr ha-icon { --mdc-icon-size:2em; opacity:.7; } .offscr small { font-size:.75em; }
        .tile { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.35em; padding:.6em; text-align:center;
          background:linear-gradient(145deg, color-mix(in srgb,var(--app) 78%,#000) 0%, color-mix(in srgb,var(--app) 40%,#05060a) 100%); color:#fff; }
        .tile b { font-size:1em; font-weight:650; line-height:1.15; } .tile small { font-size:.78em; opacity:.85; line-height:1.2; }
        .lg { width:3.2em; height:3.2em; border-radius:.9em; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.16); overflow:hidden; }
        .lg ha-icon { --mdc-icon-size:1.8em; } .lg img { display:none; width:100%; height:100%; object-fit:contain; }
        .lg.has img { display:block; } .lg.has ha-icon { display:none; } .lg.has.err img { display:none; } .lg.has.err ha-icon { display:block; }
        .lg.has:not(.err) { background:transparent; }
        .btns { display:flex; gap:.4em; }
        .b { flex:1; display:flex; align-items:center; justify-content:center; padding:.6em .2em; border-radius:1em; background:var(--tv-fill); border:1px solid var(--tv-fill-b); }
        .b.pw { color:var(--tv-err); } .tv.off .b.pw { color:var(--tv-on); }
        .b:disabled { opacity:.35; cursor:default; } .b:not(:disabled):active { background:var(--tv-fill-b); }
        .favs { display:flex; flex-wrap:wrap; gap:.4em; }
        .fav { display:flex; align-items:center; gap:.35em; padding:.4em .7em; border-radius:2em; font-size:.8em; font-weight:600;
          background:color-mix(in srgb,var(--app) 16%,transparent); border:1px solid color-mix(in srgb,var(--app) 40%,transparent); }
        .fav ha-icon { --mdc-icon-size:1.1em; color:color-mix(in srgb,var(--app) 75%,var(--tv-text)); }
        .fav:disabled { opacity:.4; cursor:default; }
        .fav:not(:disabled):active { background:color-mix(in srgb,var(--app) 30%,transparent); }
        .empty { color:var(--tv-muted); font-size:.9em; }
      </style>
      <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(this._config, dark)}">
        ${c.title ? `<h2>${esc(c.title)}</h2>` : ""}
        ${cards ? `<div class="grid">${cards}</div>` : `<div class="empty">Ajoutez un Fire TV dans l'éditeur de la carte.</div>`}
      </ha-card>`;

    const root = this.shadowRoot, tv = (el, k) => c.tvs[Number(el.dataset[k])];
    root.querySelectorAll("img[data-logo]").forEach((img) => img.addEventListener("error", () => img.parentElement.classList.add("err")));
    root.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () => { const t = tv(el, "more"); this._more(t && t.entity); }));
    root.querySelectorAll("[data-pw]").forEach((el) => el.addEventListener("click", () => {
      const t = tv(el, "pw"); if (!t || !t.entity) return;
      const s = h.states[t.entity];
      h.callService("media_player", s && !OFF.includes(s.state) ? "turn_off" : "turn_on", { entity_id: t.entity });
    }));
    root.querySelectorAll("[data-svc]").forEach((el) => el.addEventListener("click", () => {
      const t = tv(el, "svc"); if (t && t.entity) h.callService("media_player", el.dataset.s, { entity_id: t.entity });
    }));
    root.querySelectorAll("[data-key]").forEach((el) => el.addEventListener("click", () => {
      const t = tv(el, "key"); if (t && t.entity) h.callService("androidtv", "adb_command", { entity_id: t.entity, command: el.dataset.k });
    }));
    root.querySelectorAll("[data-fav]").forEach((el) => el.addEventListener("click", () => {
      const t = tv(el, "fav"); if (!t || !t.entity) return;
      const list = Array.isArray(t.favorites) && t.favorites.length ? t.favorites : c.favorites || [];
      const f = favInfo(list[Number(el.dataset.f)]);
      h.callService("media_player", "select_source", { entity_id: t.entity, source: f.id });
    }));
  }
}

/* ---------- Éditeur visuel ---------- */
const APP_OPTIONS = APPS.filter((a) => a[0] !== "accueil" && a[0] !== "reglages").map((a) => ({ value: a[0], label: a[1] }));
const LABELS = { ...GV_LABELS,
  title: "Titre (facultatif)", theme: "Thème", columns: "Colonnes (0 = automatique)", refresh: "Rafraîchissement de la caméra de capture (secondes)",
  logos: "Utiliser mes logos (dossier ci-dessous, fichiers <clé>.png)", logos_path: "Dossier des logos", favorites: "Applis favorites (toutes les TV)",
  entity: "Fire TV (media_player)", name: "Nom (facultatif)", screenshot_entity: "Caméra de capture (facultatif, ex. caméra « Fichier local »)",
  use_screencap: "Utiliser la capture de l'intégration ADB", tile_apps: "Toujours afficher la tuile pour ces applis",
  tv_picture: "Photo du téléviseur (facultatif, ex. /local/image/tv.png)", screen_area: "Zone de l'écran dans la photo, en % : gauche, haut, largeur, hauteur",
};
const TV_SCHEMA = [
  { name: "entity", selector: { entity: { domain: "media_player" } } },
  { name: "name", selector: { text: {} } },
  { name: "favorites", selector: { select: { multiple: true, custom_value: true, options: APP_OPTIONS } } },
  { name: "screenshot_entity", selector: { entity: { domain: ["camera", "image"] } } },
  { name: "use_screencap", selector: { boolean: {} } },
  { name: "tile_apps", selector: { select: { multiple: true, custom_value: true, options: APP_OPTIONS } } },
  { name: "tv_picture", selector: { text: {} } },
  { name: "screen_area", selector: { text: {} } },
];

class FireTvCardEditor extends HTMLElement {
  setConfig(config) {
    const next = { ...DEFAULTS, ...config, tvs: (config.tvs || []).map((t) => ({ ...t })) };
    const same = this._config && this._built && next.tvs.length === this._config.tvs.length;
    this._config = next;
    if (!same) return this._build();
    this.querySelectorAll("ha-form").forEach((f, i) => { f.data = i === 0 ? this._config : { use_screencap: true, ...this._config.tvs[i - 1] }; });
  }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
  }

  _emit() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _build() {
    this._built = true;
    this.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = `.tvb{border:1px solid var(--divider-color);border-radius:12px;padding:10px;margin:12px 0}
      .tvb .h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:600}
      .tvb button,.add{cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:8px;padding:6px 10px}
      .add{width:100%;margin-top:4px}`;
    this.appendChild(style);

    const main = document.createElement("ha-form");
    main.hass = this._hass;
    main.data = this._config;
    main.computeLabel = (s) => LABELS[s.name] || s.name;
    main.schema = [
      { name: "title", selector: { text: {} } },
      { type: "grid", name: "", schema: [
        { name: "columns", selector: { number: { min: 0, max: 6, mode: "box" } } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: "Automatique (thème de Home Assistant)" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" } ] } } }, ...GV_FIELDS,
      ] },
      { name: "favorites", selector: { select: { multiple: true, custom_value: true, options: APP_OPTIONS } } },
      { name: "refresh", selector: { number: { min: 3, max: 300, mode: "box", unit_of_measurement: "s" } } },
      { name: "logos", selector: { boolean: {} } },
      { name: "logos_path", selector: { text: {} } },
    ];
    main.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = { ...this._config, ...ev.detail.value, tvs: this._config.tvs };
      this._emit();
    });
    this.appendChild(main);

    this._config.tvs.forEach((t, i) => {
      const box = document.createElement("div");
      box.className = "tvb";
      box.innerHTML = `<div class="h"><span>TV ${i + 1}</span><span><button data-up="${i}" title="Monter">↑</button> <button data-down="${i}" title="Descendre">↓</button> <button data-del="${i}" title="Supprimer">✕</button></span></div>`;
      const f = document.createElement("ha-form");
      f.hass = this._hass;
      f.data = { use_screencap: true, ...t };
      f.computeLabel = (s) => LABELS[s.name] || s.name;
      f.schema = TV_SCHEMA;
      f.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config.tvs[i] = { ...ev.detail.value };
        this._emit();
      });
      box.appendChild(f);
      this.appendChild(box);
    });

    const add = document.createElement("button");
    add.className = "add";
    add.textContent = "+ Ajouter un Fire TV";
    add.addEventListener("click", () => { this._config.tvs.push({ entity: "" }); this._emit(); this._build(); });
    this.appendChild(add);

    this.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { this._config.tvs.splice(Number(b.dataset.del), 1); this._emit(); this._build(); }));
    this.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => this._move(Number(b.dataset.up), -1)));
    this.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => this._move(Number(b.dataset.down), 1)));
  }

  _move(i, d) {
    const j = i + d, a = this._config.tvs;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    this._emit();
    this._build();
  }
}

customElements.define("firetv-card", FireTvCard);
customElements.define("firetv-card-editor", FireTvCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "firetv-card",
  name: "Fire TV Card (FR)",
  description: "Vos Fire TV : capture de l'écran ou tuile de l'appli en cours, télécommande et applis favorites.",
  preview: true,
});

console.info(
  `%c FIRETV-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#5b6cff;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#5b6cff;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px"
);
}
