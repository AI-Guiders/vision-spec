/**
 * EnvironmentReadiness MFD page sketch (CIDE/Glass ADR 0023/0063 alignment).
 * Dark Cockpit: norm rows collapse to quiet summary — no "· OK" text noise.
 */

const LEVELS = new Set(["ok", "caution", "advisory", "critical"]);

/** @typedef {{ id: string, title: string, detail: string, level: string }} ReadinessRow */

/** @param {string[]} lines */
export function parseReadinessFixtureLines(lines) {
  /** @type {ReadinessRow[]} */
  const rows = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("repl:")) continue;

    const pipe = line.match(/^readiness\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*(\S+)\s*$/i);
    if (pipe) {
      const level = pipe[4].toLowerCase();
      if (LEVELS.has(level)) {
        rows.push({
          id: pipe[1].trim(),
          title: pipe[2].trim(),
          detail: pipe[3].trim(),
          level,
        });
      }
      continue;
    }

    let m = line.match(/^connector:\s*(.+)$/i);
    if (m) {
      const detail = m[1].replace(/\s*·\s*OK\s*$/i, "").trim();
      rows.push({ id: "connector", title: "Connector", detail, level: "ok" });
      continue;
    }
    m = line.match(/^schema:\s*(.+)$/i);
    if (m) {
      rows.push({ id: "schema", title: "Schema", detail: m[1].trim(), level: "ok" });
    }
  }
  return rows;
}

/** @param {ReadinessRow[]} rows */
function allOk(rows) {
  return rows.length > 0 && rows.every((r) => r.level === "ok");
}

/** @param {HTMLElement} container @param {ReadinessRow[]} rows */
export function renderEnvironmentReadinessPage(container, rows) {
  container.replaceChildren();
  container.className = "data-lab-pane-body readiness-page";

  const header = document.createElement("div");
  header.className = "readiness-header";
  header.textContent = "Готовность окружения";
  container.appendChild(header);

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "readiness-norm muted";
    empty.textContent = "нет источников";
    container.appendChild(empty);
    return;
  }

  if (allOk(rows)) {
    const quiet = document.createElement("div");
    quiet.className = "readiness-norm muted";
    quiet.textContent = `${rows.length} source${rows.length === 1 ? "" : "s"} · norm`;
    container.appendChild(quiet);
    return;
  }

  const list = document.createElement("div");
  list.className = "readiness-list";
  for (const row of rows) {
    if (row.level === "ok") continue;
    list.appendChild(renderReadinessCard(row));
  }
  container.appendChild(list);
}

/** @param {ReadinessRow} row */
function renderReadinessCard(row) {
  const card = document.createElement("div");
  card.className = `readiness-card readiness-${row.level}`;

  const lamp = document.createElement("span");
  lamp.className = `readiness-lamp lamp-${row.level}`;
  lamp.setAttribute("aria-hidden", "true");
  card.appendChild(lamp);

  const body = document.createElement("div");
  body.className = "readiness-card-body";

  const title = document.createElement("div");
  title.className = "readiness-title";
  title.textContent = row.title;
  body.appendChild(title);

  if (row.detail) {
    const detail = document.createElement("div");
    detail.className = "readiness-detail muted";
    detail.textContent = row.detail;
    body.appendChild(detail);
  }

  card.appendChild(body);
  return card;
}
