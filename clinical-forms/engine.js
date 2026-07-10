/* Oneiro Pharmacy clinical form engine.
   Renders a form from FORM_DEFS[?f=] and generates a fillable PDF via jsPDF. */
(function () {
  const params = new URLSearchParams(location.search);
  const formId = params.get("f");
  const def = window.FORM_DEFS && window.FORM_DEFS[formId];
  const root = document.getElementById("form-root");

  if (!def) {
    root.innerHTML = '<p style="padding:24px;">Form not found. <a href="index.html">See all forms</a>.</p>';
    return;
  }

  document.title = "Oneiro Pharmacy - " + def.title;
  document.getElementById("form-title").textContent = def.title;
  document.getElementById("form-subtitle").textContent = def.subtitle || "";

  const STORE_KEY = "oneiro-form-" + formId;

  /* ---------- render ---------- */

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => n.appendChild(c));
    return n;
  }

  function inputFor(f) {
    if (f.type === "textarea") return el("textarea", { name: f.name, rows: f.rows || 3 });
    const i = el("input", { name: f.name, type: f.type === "date" ? "date" : "text" });
    if (f.placeholder) i.placeholder = f.placeholder;
    return i;
  }

  function renderField(f) {
    if (f.type === "note") {
      return el("p", { class: "section-note", text: f.text });
    }

    if (f.type === "checks" || f.type === "radio") {
      const fs = el("fieldset", { class: "opts" });
      fs.appendChild(el("legend", { text: f.label }));
      const row = el("div", { class: "opt-row" });
      f.options.forEach(opt => {
        const lab = el("label");
        const box = el("input", {
          type: f.type === "radio" ? "radio" : "checkbox",
          name: f.name,
          value: opt
        });
        lab.appendChild(box);
        lab.appendChild(document.createTextNode(opt));
        row.appendChild(lab);
      });
      if (f.other) {
        const wrap = el("span", { class: "opt-other" });
        wrap.appendChild(document.createTextNode("Other:"));
        wrap.appendChild(el("input", { type: "text", name: f.name + "_other" }));
        row.appendChild(wrap);
      }
      fs.appendChild(row);
      return fs;
    }

    if (f.type === "table") {
      const wrap = el("div");
      const tbl = el("table", { class: "rows", "data-name": f.name });
      const thead = el("thead");
      const hr = el("tr");
      f.columns.forEach(c => hr.appendChild(el("th", { text: c })));
      thead.appendChild(hr);
      tbl.appendChild(thead);
      const tbody = el("tbody");
      tbl.appendChild(tbody);
      const addRow = () => {
        const tr = el("tr");
        f.columns.forEach((c, ci) => {
          const td = el("td");
          td.appendChild(el("input", { type: "text", "data-col": ci, "aria-label": c }));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      };
      for (let i = 0; i < (f.rows || 4); i++) addRow();
      wrap.appendChild(tbl);
      const btn = el("button", { type: "button", class: "add-row", text: "+ Add Row" });
      btn.addEventListener("click", () => { addRow(); save(); });
      wrap.appendChild(btn);
      return wrap;
    }

    const lab = el("label", { class: "f" });
    lab.appendChild(document.createTextNode(f.label));
    lab.appendChild(inputFor(f));
    if (f.span) lab.classList.add("span-" + f.span);
    return lab;
  }

  const formEl = el("form", { class: "clinical-form", id: "cf" });
  def.sections.forEach((sec, si) => {
    const s = el("section", { class: "form-section" });
    s.appendChild(el("h2", { text: (si + 1) + ". " + sec.title }));
    if (sec.note) s.appendChild(el("p", { class: "section-note", text: sec.note }));
    (sec.fields || []).forEach(item => {
      if (Array.isArray(item)) {
        const g = el("div", { class: "grid " + ["", "", "two", "three", "four"][item.length] || "grid" });
        item.forEach(f => g.appendChild(renderField(f)));
        s.appendChild(g);
      } else {
        s.appendChild(renderField(item));
      }
    });
    formEl.appendChild(s);
  });
  root.appendChild(formEl);

  const actions = el("div", { class: "actions" });
  const btnPdf = el("button", { type: "button", class: "btn-pdf", text: "Download PDF" });
  const btnPrint = el("button", { type: "button", class: "btn-print", text: "Print" });
  const btnClear = el("button", { type: "button", class: "btn-clear", text: "Clear form" });
  actions.appendChild(btnPdf);
  actions.appendChild(btnPrint);
  actions.appendChild(btnClear);
  root.appendChild(actions);
  root.appendChild(el("p", { class: "doc-id", text: "Document ID: " + def.docId + "  ·  Rev: 2026.C  ·  Confidential Clinical Record" }));

  /* ---------- autosave ---------- */

  function collect() {
    const data = { fields: {}, tables: {} };
    formEl.querySelectorAll("input[name], textarea[name]").forEach(i => {
      if (i.type === "checkbox" || i.type === "radio") {
        if (!data.fields[i.name]) data.fields[i.name] = [];
        if (i.checked) data.fields[i.name].push(i.value);
      } else {
        data.fields[i.name] = i.value;
      }
    });
    formEl.querySelectorAll("table.rows").forEach(t => {
      const rows = [];
      t.querySelectorAll("tbody tr").forEach(tr => {
        rows.push([...tr.querySelectorAll("input")].map(i => i.value));
      });
      data.tables[t.dataset.name] = rows;
    });
    return data;
  }

  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(collect())); } catch (e) {}
  }

  function restore() {
    let data;
    try { data = JSON.parse(sessionStorage.getItem(STORE_KEY)); } catch (e) {}
    if (!data) return;
    formEl.querySelectorAll("input[name], textarea[name]").forEach(i => {
      const v = data.fields[i.name];
      if (v === undefined) return;
      if (i.type === "checkbox" || i.type === "radio") i.checked = Array.isArray(v) && v.includes(i.value);
      else i.value = v;
    });
    formEl.querySelectorAll("table.rows").forEach(t => {
      const rows = data.tables[t.dataset.name] || [];
      const trs = t.querySelectorAll("tbody tr");
      rows.forEach((r, ri) => {
        if (!trs[ri]) return;
        [...trs[ri].querySelectorAll("input")].forEach((i, ci) => { i.value = r[ci] || ""; });
      });
    });
  }

  formEl.addEventListener("input", save);
  restore();

  btnClear.addEventListener("click", () => {
    if (!confirm("Clear all entered data?")) return;
    sessionStorage.removeItem(STORE_KEY);
    location.reload();
  });

  btnPrint.addEventListener("click", () => window.print());

  /* ---------- PDF ---------- */

  const PAGE_W = 612, PAGE_H = 792, M = 46;
  const CONTACT = [
    "8026 Lorraine Ave, Ste 207, Stockton, CA 95210",
    "PH: 209-898-7345  ·  FAX: 209-898-7347  ·  info@oneiromanagementgroup.com"
  ];

  btnPdf.addEventListener("click", () => {
    if (!window.jspdf) { alert("PDF library is still loading — try again in a second."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const data = collect();
    let y = M;

    function ensure(space) {
      if (y + space > PAGE_H - M) { doc.addPage(); y = M; }
    }

    function wrapText(text, size, style, x, maxW, lh) {
      doc.setFont("helvetica", style || "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(String(text), maxW);
      lines.forEach(line => {
        ensure(lh);
        doc.text(line, x, y);
        y += lh;
      });
    }

    // Header
    const logo = document.getElementById("pdf-logo");
    try { doc.addImage(logo, "PNG", PAGE_W - M - 58, y - 6, 58, 58); } catch (e) {}
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(23, 45, 93);
    doc.text("ONEIRO PHARMACY", M, y + 6);
    doc.setFontSize(13); doc.setTextColor(0);
    doc.text(def.title, M, y + 24);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text(def.subtitle || "", M, y + 38);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(CONTACT[0], M, y + 52);
    doc.text(CONTACT[1], M, y + 62);
    doc.setTextColor(0);
    y += 74;
    doc.setDrawColor(23, 45, 93); doc.setLineWidth(1.4);
    doc.line(M, y, PAGE_W - M, y);
    y += 16;

    const colW = (PAGE_W - 2 * M - 20) / 2;

    function fieldLine(label, value, x, w) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(23, 45, 93);
      doc.text(label.toUpperCase(), x, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(0);
      const v = value && String(value).trim() ? String(value) : "";
      const lines = doc.splitTextToSize(v, w);
      doc.text(lines[0] || "", x, y + 11);
      doc.setDrawColor(160); doc.setLineWidth(0.5);
      doc.line(x, y + 14, x + w, y + 14);
    }

    def.sections.forEach((sec, si) => {
      ensure(40);
      doc.setFillColor(234, 240, 251);
      doc.setDrawColor(183, 200, 223);
      const headW = doc.getTextWidth((si + 1) + ". " + sec.title.toUpperCase()) * 1.5 + 16;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.roundedRect(M, y - 9, Math.min(headW, PAGE_W - 2 * M), 15, 3, 3, "FD");
      doc.setTextColor(23, 45, 93);
      doc.text((si + 1) + ". " + sec.title.toUpperCase(), M + 6, y + 2);
      doc.setTextColor(0);
      y += 20;

      if (sec.note) { wrapText(sec.note, 7.5, "italic", M, PAGE_W - 2 * M, 9); y += 2; }

      const flat = [];
      (sec.fields || []).forEach(item => Array.isArray(item) ? flat.push(...item) : flat.push(item));

      let pair = [];
      function flushPair() {
        if (!pair.length) return;
        ensure(26);
        fieldLine(pair[0].label, data.fields[pair[0].name], M, pair.length === 1 ? PAGE_W - 2 * M : colW);
        if (pair[1]) fieldLine(pair[1].label, data.fields[pair[1].name], M + colW + 20, colW);
        y += 26;
        pair = [];
      }

      flat.forEach(f => {
        if (f.type === "note") { flushPair(); wrapText(f.text, 7.5, "italic", M, PAGE_W - 2 * M, 9); y += 3; return; }

        if (f.type === "checks" || f.type === "radio") {
          flushPair();
          ensure(14);
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(23, 45, 93);
          doc.text(f.label.toUpperCase() + ":", M, y);
          doc.setTextColor(0);
          const selected = data.fields[f.name] || [];
          let x = M + doc.getTextWidth(f.label.toUpperCase() + ":") * 1.35 + 8;
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
          f.options.forEach(opt => {
            const mark = "[" + (selected.includes(opt) ? "X" : "  ") + "] " + opt;
            const w = doc.getTextWidth(mark) + 12;
            if (x + w > PAGE_W - M) { y += 12; ensure(12); x = M + 14; }
            doc.text(mark, x, y);
            x += w;
          });
          const other = data.fields[f.name + "_other"];
          if (f.other) {
            const mark = "Other: " + (other || "________");
            const w = doc.getTextWidth(mark) + 12;
            if (x + w > PAGE_W - M) { y += 12; ensure(12); x = M + 14; }
            doc.text(mark, x, y);
          }
          y += 16;
          return;
        }

        if (f.type === "table") {
          flushPair();
          const rows = (data.tables[f.name] || []).filter(r => r.some(v => v && v.trim()));
          const printRows = rows.length ? rows : [["", "", "", ""].slice(0, f.columns.length)];
          const tW = PAGE_W - 2 * M;
          const cw = f.columns.map(() => tW / f.columns.length);
          ensure(16);
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(23, 45, 93);
          let x = M;
          f.columns.forEach((c, ci) => { doc.text(c.toUpperCase(), x + 2, y); x += cw[ci]; });
          doc.setTextColor(0);
          y += 4;
          doc.setDrawColor(120); doc.setLineWidth(0.6);
          doc.line(M, y, PAGE_W - M, y);
          y += 12;
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
          printRows.forEach(r => {
            ensure(14);
            let x2 = M;
            r.forEach((v, ci) => {
              const clipped = doc.splitTextToSize(v || "", cw[ci] - 6)[0] || "";
              doc.text(clipped, x2 + 2, y);
              x2 += cw[ci];
            });
            doc.setDrawColor(190); doc.setLineWidth(0.4);
            doc.line(M, y + 3, PAGE_W - M, y + 3);
            y += 14;
          });
          y += 6;
          return;
        }

        if (f.type === "textarea") {
          flushPair();
          ensure(24);
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(23, 45, 93);
          doc.text(f.label.toUpperCase(), M, y);
          doc.setTextColor(0);
          y += 11;
          const v = (data.fields[f.name] || "").trim();
          if (v) {
            wrapText(v, 9, "normal", M, PAGE_W - 2 * M, 12);
          } else {
            for (let i = 0; i < 2; i++) {
              ensure(14);
              doc.setDrawColor(160); doc.setLineWidth(0.5);
              doc.line(M, y + 6, PAGE_W - M, y + 6);
              y += 14;
            }
          }
          y += 8;
          return;
        }

        pair.push(f);
        if (pair.length === 2) flushPair();
      });
      flushPair();
      y += 6;
    });

    // Signature block
    ensure(64);
    y += 8;
    doc.setDrawColor(0); doc.setLineWidth(0.7);
    doc.line(M, y + 14, M + 220, y + 14);
    doc.line(PAGE_W - M - 180, y + 14, PAGE_W - M, y + 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.text("PRESCRIBER SIGNATURE (stamps NOT accepted)", M, y + 24);
    doc.text("DATE / TIME", PAGE_W - M - 180, y + 24);
    y += 40;

    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(110);
    doc.text("Document ID: " + def.docId + "  ·  Rev: 2026.C  ·  Confidential Clinical Record", PAGE_W / 2, PAGE_H - 24, { align: "center" });

    doc.save(formId + ".pdf");
  });
})();
