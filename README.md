# 💎 Financely – Life-Cost Finance Tracker

[![PWA](https://img.shields.io/badge/PWA-Ready-7c7ef7?style=for-the-badge&logo=pwa)](https://github.com/)
[![No Build](https://img.shields.io/badge/Build-None-22d3ee?style=for-the-badge)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-05c46b?style=for-the-badge)](https://github.com/)

> **„Bezahle nicht mit Geld, sondern mit deiner Lebenszeit."**
> Financely rechnet jeden Preis in die **Arbeitsstunden** um, die du dafür brauchst – oder in **Döner**. Dazu ein vollwertiger, offline-fähiger Budget-Tracker mit Diagrammen, Budgets und Sparzielen. **Kein Server, kein Tracking, nur lokaler Speicher.**

---

## ✨ Features

| | |
|---|---|
| 🥙 **Life-Cost & Döner-Index** | Käufe in Arbeitsstunden oder Döner umrechnen – Stundenlohn, Wochenstunden & Döner-Preis konfigurierbar. |
| 📊 **Statistik & Diagramme** | Ausgaben nach Kategorie (Balken), 6-Monats-Trend (Linie), Einnahmen-vs-Ausgaben, Vormonatsvergleich, Sparkline. Alles handgebaute SVGs, 100 % offline. |
| 💸 **Ausgaben-Verwaltung** | Hinzufügen, **bearbeiten, löschen**, suchen, nach Kategorie filtern, sortieren, Notizen, **wiederkehrende Ausgaben**. |
| 💼 **Mehrere Einkommen** | Beliebig viele Einnahmequellen mit Zahltag, aktiv/inaktiv. |
| 🔁 **Abos** | Fixkosten mit Kategorie, Abrechnungstag & Aktiv-Schalter – fließen automatisch ins Budget. |
| 🎯 **Budgets & Warnungen** | Limits pro Kategorie, Fortschrittsbalken, Warnung bei ~90 % und Überschreitung. |
| 🐖 **Sparziele** | Ziele mit Emoji, Fortschritt & Einzahlungen. |
| 💾 **Backup** | Export/Import als **JSON**, Ausgaben-Export als **CSV**. |
| 🎨 **Hell/Dunkel-Theme** | Umschaltbar, folgt dem System. |
| 🏷️ **Eigene Kategorien** | Kategorien mit Emoji & Farbe anlegen/bearbeiten. |
| 🌍 **Dreisprachig** | Deutsch · English · Türkçe – durchgehend übersetzt. |

---

## 🚀 Tech & Architektur

- **Zero-Build, rein statisch.** Kein npm, kein Bundler – einfach Dateien ausliefern.
- **Modular:** `index.html` + `css/styles.css` + `js/*.js` (klassische, geordnete Scripts).
- **Offline-first PWA:** Service Worker (App-Shell-Cache + sicherer Update-Flow), Web-App-Manifest.
- **Daten** liegen ausschließlich im `localStorage` (versioniertes Schema mit automatischer Migration).

```
index.html          css/styles.css
js/ i18n · state · charts · ui · calc · expenses · subscriptions
    income · goals · budgets · dashboard · stats · settings · app
sw.js · manifest.json
```

---

## 🛠️ Installation

### GitHub Pages (empfohlen)
1. Repo-Settings → **Pages** → *Deploy from a branch* → Branch wählen, Ordner **`/ (root)`**.
2. Fertig: `https://<user>.github.io/Financely/` öffnen. Alle Pfade sind relativ, läuft auch im Unterordner.

### Lokal
- Einen kleinen Server starten (Service Worker braucht HTTP):
  ```bash
  python3 -m http.server 8000
  ```
  Dann `http://localhost:8000/` öffnen.

### Mobile
Im Browser öffnen → **„Zum Home-Bildschirm hinzufügen"** → native App mit Fullscreen.

---

## 🎨 Design
Premium **Liquid-Glass**: nativer Dark-Mode, Glas-Karten, Micro-Interactions, Haptik, Mobile-First für einhändige Bedienung.

---

## 📄 Lizenz
**MIT** – forke, passe an, nutze es. *Erstellt mit ❤️ für finanzielle Freiheit.*
