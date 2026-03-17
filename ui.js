// ============================================================
// LA PAMPA — UI : Nav injection + Drawer + Theme Toggle
// ============================================================

// ── NAV INJECTION ────────────────────────────────────────────
// Injecte le HTML partagé (nav, drawer, bouton thème) dans chaque page

document.body.insertAdjacentHTML('beforeend', `
    <div id="overlay"></div>
    <aside id="drawer">
        <button id="drawer-close">✕</button>
        <div id="drawer-content"></div>
    </aside>

    <button id="theme-toggle" title="Changer de thème">☾</button>

    <nav>
        <div class="nav-brand">
            <a href="main-page.html"><img id="nav-logo" src="img/Logo La Pampa PNG.webp" alt="LA PAMPA"></a>
        </div>
        <div class="nav-links">
            <a href="magazine.html">Magazine</a>
            <a href="index.html">Explorer</a>
            <a href="#" class="nav-link" data-panel="apropos">À propos</a>
            <a href="#" class="nav-link" data-panel="contact">Contact</a>
        </div>
    </nav>
`);

// ── DRAWER ──────────────────────────────────────────────────
const panels = {
    apropos: `
        <h2>L'histoire derrière la Pampa</h2>
        <p>Ce projet est né d'une envie personnelle d'apporter un nouveau regard sur la scène artistique française.</p>
        <p style="margin-top: 16px;">La Pampa est une plateforme de découverte collaborative, sans algorithme, construite autour du hasard et de l'exploration.</p>
    `,
    contact: `
        <h2>Contact</h2>
        <p>contact@lapampa.com</p>
    `,
};

const drawer        = document.getElementById("drawer");
const overlay       = document.getElementById("overlay");
const drawerContent = document.getElementById("drawer-content");

function openDrawer(key) {
    drawerContent.innerHTML = panels[key];
    drawer.classList.add("active");
    overlay.classList.add("active");
}

function closeDrawer() {
    drawer.classList.remove("active");
    overlay.classList.remove("active");
}

document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        openDrawer(e.currentTarget.dataset.panel);
    });
});

document.getElementById("drawer-close").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

// ── THEME TOGGLE ─────────────────────────────────────────────
const STORAGE_KEY = "lapampa-theme";

function getTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
    const logo = document.getElementById("nav-logo");
    if (logo) logo.src = theme === "dark" ? "img/Logo La Pampa PNG blanc.webp" : "img/Logo La Pampa PNG.webp";
    localStorage.setItem(STORAGE_KEY, theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
}

applyTheme(getTheme());

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
