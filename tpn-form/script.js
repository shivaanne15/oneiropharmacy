const CONFIG = {
  // After you decide the hosting platform, set this to your backend route.
  // Example: "/api/send-tpn-order" or "send-email.php"
  emailEndpoint: "",

  // The backend should also store this securely server-side.
  recipientEmail: ""
};

const STORAGE_KEY = "oneiroTpnOrderFormData";

const form = document.getElementById("tpnForm");
const previewBtn = document.getElementById("previewBtn");
const downloadBtn = document.getElementById("downloadBtn");
const submitEmailBtn = document.getElementById("submitEmailBtn");
const backBtn = document.getElementById("backBtn");
const pdfPreview = document.getElementById("pdfPreview");
const statusMessage = document.getElementById("statusMessage");
const noticeModal = document.getElementById("noticeModal");
const noticeTitle = document.getElementById("noticeTitle");
const noticeMessage = document.getElementById("noticeMessage");
const noticeOkBtn = document.getElementById("noticeOkBtn");
const addElectrolyteBtn = document.getElementById("addElectrolyteBtn");
const addAdditiveBtn = document.getElementById("addAdditiveBtn");
const additionalElectrolytesList = document.getElementById("additionalElectrolytesList");
const additionalAdditivesList = document.getElementById("additionalAdditivesList");

let latestPdfBlobUrl = null;
let latestPdfBlob = null;
let lastMacroNoticeKey = "";

function setStatus(message, type = "") {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = type;
}

function showFormNotice(title, message) {
  if (!noticeModal || !noticeTitle || !noticeMessage) {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  noticeTitle.textContent = title;
  noticeMessage.textContent = message;
  noticeModal.hidden = false;
  if (noticeOkBtn) noticeOkBtn.focus();
}

function closeFormNotice() {
  if (noticeModal) noticeModal.hidden = true;
}

function hasFormValue(value) {
  return textOrBlank(value).trim().length > 0;
}

function getMacroRuleViolation(data) {
  const hasClinolipid = hasFormValue(data.clinolipidAmt);
  const hasSmoFlipid = hasFormValue(data.smoFlipidAmt);

  if (data.formulation === "2-in-1 TPN" && (hasClinolipid || hasSmoFlipid)) {
    return {
      key: "2in1-lipid",
      title: "2-in-1 TPN Macro Nutrient Guidance",
      message: "For a 2-in-1 TPN order, enter macro nutrient amounts only for Dextrose and Clinisol. Add any Clinolipid or SMOFlipid requests in the Additional Notes field below the Macro Nutrients table."
    };
  }

  if (data.formulation === "3-in-1 TPN" && hasClinolipid && hasSmoFlipid) {
    return {
      key: "3in1-two-lipids",
      title: "3-in-1 TPN Lipid Selection",
      message: "For a 3-in-1 TPN order, use only one lipid option: either Clinolipid or SMOFlipid. Clear one lipid field before entering the other. Add any extra explanation in the Additional Notes field."
    };
  }

  return null;
}

function validateMacroNutrientRules({ rememberNotice = false } = {}) {
  const violation = getMacroRuleViolation(getFormData());
  if (!violation) {
    lastMacroNoticeKey = "";
    return true;
  }

  if (!rememberNotice || lastMacroNoticeKey !== violation.key) {
    showFormNotice(violation.title, violation.message);
  }
  lastMacroNoticeKey = violation.key;
  return false;
}

function enforceMacroNutrientEntry(target) {
  if (!target || !["clinolipidAmt", "smoFlipidAmt"].includes(target.name)) return true;

  const data = getFormData();
  const enteredValue = textOrBlank(target.value).trim();
  if (!enteredValue) return true;

  const otherFieldName = target.name === "clinolipidAmt" ? "smoFlipidAmt" : "clinolipidAmt";
  const otherValue = form && form.elements[otherFieldName] ? form.elements[otherFieldName].value : data[otherFieldName];
  let violation = null;

  if (data.formulation === "2-in-1 TPN") {
    violation = {
      key: `2in1-${target.name}`,
      title: "2-in-1 TPN Macro Nutrient Guidance",
      message: "For a 2-in-1 TPN order, enter macro nutrient amounts only for Dextrose and Clinisol. Add any Clinolipid or SMOFlipid requests in the Additional Notes field below the Macro Nutrients table."
    };
  }

  if (data.formulation === "3-in-1 TPN" && hasFormValue(otherValue)) {
    violation = {
      key: `3in1-${target.name}`,
      title: "3-in-1 TPN Lipid Selection",
      message: "For a 3-in-1 TPN order, use only one lipid option: either Clinolipid or SMOFlipid. Clear one lipid field before entering the other. Add any extra explanation in the Additional Notes field."
    };
  }

  if (!violation) return true;

  target.value = "";
  showFormNotice(violation.title, violation.message);
  lastMacroNoticeKey = violation.key;
  saveFormData();
  return false;
}

function showFormulationGuidance(formulation) {
  if (formulation === "2-in-1 TPN") {
    showFormNotice(
      "2-in-1 TPN Macro Nutrient Guidance",
      "For 2-in-1 TPN, enter values only for Dextrose and Clinisol in the Macro Nutrients table. If lipid information is needed, use the Additional Notes field below the table."
    );
  }

  if (formulation === "3-in-1 TPN") {
    showFormNotice(
      "3-in-1 TPN Lipid Selection",
      "For 3-in-1 TPN, enter Dextrose and Clinisol, then use only one lipid option: either Clinolipid or SMOFlipid. Do not enter both lipid fields."
    );
  }
}

function createDynamicRow(container, item = {}) {
  if (!container) return;

  const row = document.createElement("div");
  row.className = "dynamic-row";

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Name";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Example: Sodium Bicarbonate";
  nameInput.dataset.dynamicField = "name";
  nameInput.value = textOrBlank(item.name);
  nameLabel.appendChild(nameInput);

  const amountLabel = document.createElement("label");
  amountLabel.textContent = "Amount";
  const amountInput = document.createElement("input");
  amountInput.type = "text";
  amountInput.inputMode = "decimal";
  amountInput.placeholder = "Example: 20 mEq";
  amountInput.dataset.dynamicField = "amount";
  amountInput.value = textOrBlank(item.amount);
  amountLabel.appendChild(amountInput);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-row";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    row.remove();
    saveFormData();
  });

  row.append(nameLabel, amountLabel, removeButton);
  container.appendChild(row);
}

function readDynamicRows(container) {
  if (!container) return [];

  return Array.from(container.querySelectorAll(".dynamic-row"))
    .map((row) => ({
      name: textOrBlank(row.querySelector('[data-dynamic-field="name"]')?.value).trim(),
      amount: textOrBlank(row.querySelector('[data-dynamic-field="amount"]')?.value).trim()
    }))
    .filter((row) => row.name || row.amount);
}

function renderDynamicRows(container, rows = []) {
  if (!container) return;
  container.innerHTML = "";
  rows.forEach((row) => createDynamicRow(container, row));
}

function updateElectrolyteModeView() {
  if (!form) return;

  const mode = form.elements.electrolyteMode?.value || "individual";
  const individualPanel = document.getElementById("individualElectrolytes");
  const combinedPanel = document.getElementById("combinedElectrolytes");

  if (individualPanel) individualPanel.hidden = mode !== "individual";
  if (combinedPanel) combinedPanel.hidden = mode !== "combined";
}

function readFormData(formElement) {
  const fd = new FormData(formElement);
  const data = {};

  for (const [key, value] of fd.entries()) {
    data[key] = typeof value === "string" ? value.trim() : value;
  }

  // Radio groups are absent if no option is selected. Normalize them.
  ["formulation", "ivAccess", "administration"].forEach((key) => {
    if (!data[key]) data[key] = "";
  });
  if (!data.electrolyteMode) data.electrolyteMode = "individual";

  data.additionalElectrolytes = readDynamicRows(additionalElectrolytesList);
  data.additionalAdditives = readDynamicRows(additionalAdditivesList);

  return data;
}

function getStoredFormData() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch (error) {
    console.warn("Unable to read saved form data", error);
    return {};
  }
}

function saveFormData() {
  if (!form) return;
  updateAgeFromDob();
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readFormData(form)));
  } catch (error) {
    console.warn("Unable to save form data", error);
  }
}

function restoreFormData() {
  if (!form) return;
  const data = getStoredFormData();

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) return;

    const field = form.elements[key];
    if (!field) return;

    if (field instanceof RadioNodeList) {
      Array.from(field).forEach((input) => {
        input.checked = input.value === value;
      });
      return;
    }

    if (field.type === "radio" || field.type === "checkbox") {
      field.checked = field.value === value || value === true;
      return;
    }

    field.value = value;
  });

  renderDynamicRows(additionalElectrolytesList, Array.isArray(data.additionalElectrolytes) ? data.additionalElectrolytes : []);
  renderDynamicRows(additionalAdditivesList, Array.isArray(data.additionalAdditives) ? data.additionalAdditives : []);
  updateElectrolyteModeView();
}

function getFormData() {
  return form ? readFormData(form) : getStoredFormData();
}

function formatDateForPdf(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTimeForPdf(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function calculateAgeFromDob(dobValue, asOf = new Date()) {
  if (!dobValue) return "";

  const parts = String(dobValue).split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return "";

  const [year, month, day] = parts;
  const birthDate = new Date(year, month - 1, day);
  if (Number.isNaN(birthDate.getTime()) || birthDate > asOf) return "";

  let age = asOf.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    asOf.getMonth() > birthDate.getMonth() ||
    (asOf.getMonth() === birthDate.getMonth() && asOf.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) age -= 1;
  return age >= 0 ? String(age) : "";
}

function updateAgeFromDob() {
  if (!form || !form.elements.dob || !form.elements.age) return;
  form.elements.age.value = calculateAgeFromDob(form.elements.dob.value);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function textOrBlank(value) {
  return value === undefined || value === null ? "" : String(value);
}

function displayUnit(unit) {
  const cleanUnit = textOrBlank(unit).trim();
  if (cleanUnit.toLowerCase() === "kg") return "Kg";
  return cleanUnit;
}

function valueWithUnit(value, unit) {
  const cleanValue = textOrBlank(value).trim();
  const cleanUnit = displayUnit(unit);
  if (cleanValue && cleanUnit) return `${cleanValue} ${cleanUnit}`;
  return cleanUnit || cleanValue;
}

function fileNameFromData(data) {
  const patient = (data.patientName || "patient").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  return `tpn-order-${patient || "patient"}-${stamp}.pdf`;
}

function fitTextToWidth(doc, value, maxWidth) {
  let text = textOrBlank(value).replace(/\s+/g, " ").trim();
  if (!text || maxWidth <= 0) return "";
  if (doc.getTextWidth(text) <= maxWidth) return text;

  const ellipsis = "...";
  while (text.length > 0 && doc.getTextWidth(`${text}${ellipsis}`) > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text.trimEnd()}${ellipsis}`;
}

function drawFittedText(doc, value, x, y, maxWidth, options = {}) {
  const text = fitTextToWidth(doc, value, maxWidth);
  if (!text) return;
  doc.text(text, x, y, options);
}

function drawWrappedValue(doc, value, x, y, maxWidth, maxLines = 2, lineGap = 9) {
  const text = textOrBlank(value).trim();
  if (!text) return;

  let lines = doc.splitTextToSize(text, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = fitTextToWidth(doc, `${lines[maxLines - 1]}...`, maxWidth);
  }

  lines.forEach((line, index) => {
    drawFittedText(doc, line, x, y + index * lineGap, maxWidth);
  });
}


function getWrappedLineCount(doc, value, maxWidth, minLines = 2) {
  const text = textOrBlank(value).trim();
  if (!text) return minLines;
  return Math.max(minLines, doc.splitTextToSize(text, maxWidth).length);
}

function multilineBlockHeight(lineCount, lineGap = 10) {
  // Extra padding accounts for the label baseline above the first rule and
  // keeps the next field from colliding with wrapped text.
  return Math.max(20, lineCount * lineGap + 8);
}

function setBodyFont(doc, size = 7.6, style = "normal") {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(28, 37, 51);
}

function drawLineField(doc, label, value, x, y, width, options = {}) {
  const labelWidth = options.labelWidth ?? Math.min(88, width * 0.45);
  const fontSize = options.fontSize ?? 7.6;
  const lineY = y + 2;
  const lineStart = x + labelWidth;
  const valueX = lineStart + 3;
  const valueMaxWidth = Math.max(0, x + width - valueX - 1);

  setBodyFont(doc, fontSize, "bold");
  if (label) drawFittedText(doc, label, x, y, Math.max(0, labelWidth - 4));

  doc.setDrawColor(125, 138, 154);
  doc.setLineWidth(0.45);
  doc.line(lineStart, lineY, x + width, lineY);

  setBodyFont(doc, fontSize, "normal");
  drawFittedText(doc, value, valueX, y - 1.5, valueMaxWidth);
}

function drawLineFieldWithUnit(doc, label, value, unit, x, y, width, options = {}) {
  const fontSize = options.fontSize ?? 7.6;
  const unitText = displayUnit(unit);
  setBodyFont(doc, fontSize, "normal");
  const unitWidth = unitText ? Math.max(20, doc.getTextWidth(unitText) + 5) : 0;
  const fieldWidth = Math.max(36, width - unitWidth - 5);

  drawLineField(doc, label, value, x, y, fieldWidth, options);

  if (unitText) {
    setBodyFont(doc, fontSize, "normal");
    drawFittedText(doc, unitText, x + fieldWidth + 5, y - 1.5, unitWidth);
  }
}

function drawMultilineField(doc, label, value, x, y, width, options = {}) {
  const labelWidth = options.labelWidth ?? Math.min(120, width * 0.45);
  const fontSize = options.fontSize ?? 7.4;
  const lineCount = options.lineCount ?? 2;
  const lineGap = options.lineGap ?? 10;
  const lineStart = x + labelWidth;
  const valueX = lineStart + 3;
  const valueMaxWidth = Math.max(0, x + width - valueX - 1);

  setBodyFont(doc, fontSize, "bold");
  drawFittedText(doc, label, x, y, Math.max(0, labelWidth - 4));

  doc.setDrawColor(125, 138, 154);
  doc.setLineWidth(0.45);
  for (let i = 0; i < lineCount; i += 1) {
    doc.line(lineStart, y + 2 + i * lineGap, x + width, y + 2 + i * lineGap);
  }

  setBodyFont(doc, fontSize, "normal");
  drawWrappedValue(doc, value, valueX, y - 1.5, valueMaxWidth, lineCount, lineGap);
}

function textBaselineFromCenter(centerY, fontSize) {
  // jsPDF's baseline:"middle" renders inconsistently in some PDF viewers.
  // Use one calculated baseline for the field label, checkbox, and option text
  // so every item in a row sits on the same horizontal axis.
  return centerY + fontSize * 0.34;
}

function drawInlineText(doc, value, x, centerY, maxWidth, options = {}) {
  const size = options.size ?? 7.6;
  const style = options.style ?? "normal";
  setBodyFont(doc, size, style);
  drawFittedText(doc, value, x, textBaselineFromCenter(centerY, size), maxWidth);
}

function drawCheckbox(doc, label, checked, x, centerY, labelMaxWidth = 75) {
  const size = 6.4;
  const boxTop = centerY - size / 2;
  const labelX = x + size + 4;

  doc.setDrawColor(70, 82, 100);
  doc.setLineWidth(0.55);
  doc.rect(x, boxTop, size, size);

  if (checked) {
    doc.setLineWidth(0.8);
    doc.line(x + 1.1, centerY - 0.1, x + 2.8, centerY + 1.8);
    doc.line(x + 2.8, centerY + 1.8, x + 5.8, centerY - 2.5);
  }

  drawInlineText(doc, label, labelX, centerY, labelMaxWidth, { size: 7.7, style: "bold" });
}

function drawAmountWithUnit(doc, amount, unit, x, y, width) {
  const cleanAmount = textOrBlank(amount).trim();
  const cleanUnit = displayUnit(unit) || "g";
  const unitWidth = Math.max(20, doc.getTextWidth(cleanUnit) + 5);
  const lineStart = x;
  const lineEnd = x + width - unitWidth - 6;
  const valueMaxWidth = Math.max(0, lineEnd - lineStart - 4);

  doc.setDrawColor(125, 138, 154);
  doc.setLineWidth(0.45);
  doc.line(lineStart, y + 2, lineEnd, y + 2);

  setBodyFont(doc, 7.6, "normal");
  drawFittedText(doc, cleanAmount, lineStart + 2, y - 1.5, valueMaxWidth);
  // Always print the selected unit, even when the numeric amount is blank.
  drawFittedText(doc, cleanUnit, lineEnd + 5, y - 1.5, unitWidth);
}

function drawSectionTitle(doc, number, title, x, y, maxWidth) {
  const fullTitle = `${number}. ${title}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  const pillWidth = Math.min(doc.getTextWidth(fullTitle) + 17, maxWidth);

  doc.setFillColor(235, 242, 251);
  doc.setDrawColor(150, 179, 210);
  doc.roundedRect(x, y - 12.5, pillWidth, 16, 2.5, 2.5, "FD");

  doc.setTextColor(23, 45, 93);
  drawFittedText(doc, fullTitle, x + 7, y - 1.5, pillWidth - 12);
  doc.setTextColor(28, 37, 51);
}

function drawSectionBox(doc, number, title, x, y, width, height) {
  doc.setDrawColor(184, 196, 211);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.65);
  doc.roundedRect(x, y, width, height, 6, 6, "S");
  drawSectionTitle(doc, number, title, x + 9, y + 14, width - 18);
}

function drawDivider(doc, x1, y1, x2, y2) {
  doc.setDrawColor(164, 178, 197);
  doc.setLineWidth(0.45);
  doc.line(x1, y1, x2, y2);
}

function drawHeaderLine(doc, x1, y, x2) {
  doc.setDrawColor(122, 136, 154);
  doc.setLineWidth(0.45);
  doc.line(x1, y, x2, y);
}

function drawAmountField(doc, value, x, y, width) {
  drawLineField(doc, "", value, x, y, width, { labelWidth: 0, fontSize: 7.6 });
}

function drawSectionInstruction(doc, text, x, y, maxWidth) {
  setBodyFont(doc, 7.15, "bold");
  doc.setTextColor(23, 45, 93);
  drawFittedText(doc, text, x, y, maxWidth);
  doc.setTextColor(28, 37, 51);
}

function drawTwoColumnTableHeaders(doc, leftX, rightX, amountLeftX, amountRightX, y) {
  setBodyFont(doc, 7.6, "bold");
  doc.text("Component", leftX, y);
  doc.text("Ordered Amount", amountLeftX, y);
  doc.text("Component", rightX, y);
  doc.text("Ordered Amount", amountRightX, y);
}

function normalizedDynamicRows(rows, fallbackLabel = "Additional") {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const name = textOrBlank(row?.name).trim();
      const amount = textOrBlank(row?.amount).trim();
      if (!name && !amount) return null;
      return [name || fallbackLabel, amount];
    })
    .filter(Boolean);
}

function splitRowsForPdf(rows) {
  const midpoint = Math.ceil(rows.length / 2);
  return [rows.slice(0, midpoint), rows.slice(midpoint)];
}

function getElectrolyteRowsForPdf(data) {
  const mode = data.electrolyteMode || "individual";
  const commonRows = mode === "combined"
    ? [
        ["Na Acetate", data.sodiumAcetate],
        ["Na Chloride", data.sodiumChloride],
        ["Na Phosphate", data.sodiumPhosphate],
        ["K Acetate", data.potassiumAcetate],
        ["K Chloride", data.potassiumChloride],
        ["K Phosphate", data.potassiumPhosphate]
      ]
    : [
        ["Sodium", data.sodium],
        ["Phosphate", data.phosphate],
        ["Magnesium", data.magnesium],
        ["Chloride", data.chloride],
        ["Potassium", data.potassium],
        ["Calcium", data.calcium],
        ["Cl: Acetate Ratio", data.chlorideAcetateRatio]
      ];

  return commonRows.concat(normalizedDynamicRows(data.additionalElectrolytes, "Additional Electrolyte"));
}

function getAdditiveRowsForPdf(data) {
  const commonRows = [
    ["Infuvite Adult", data.infuviteAdult],
    ["Zinc Sulfate", data.zincSulfate],
    ["Tralement", data.tralement],
    ["Regular Insulin", data.regularInsulin]
  ];

  // Preserve values from earlier versions if the user had already filled the old static Other fields.
  const legacyRows = [];
  if (data.vitaminOtherName || data.vitaminOtherAmt) {
    legacyRows.push([data.vitaminOtherName ? `Other: ${data.vitaminOtherName}` : "Other", data.vitaminOtherAmt]);
  }
  if (data.additiveOtherName || data.additiveOtherAmt) {
    legacyRows.push([data.additiveOtherName ? `Other: ${data.additiveOtherName}` : "Other", data.additiveOtherAmt]);
  }

  return commonRows
    .concat(legacyRows)
    .concat(normalizedDynamicRows(data.additionalAdditives, "Additional Item"));
}

function drawNamedAmountRows(doc, rows, yStart, layout) {
  const [leftRows, rightRows] = splitRowsForPdf(rows);
  const rowGap = layout.rowGap || 15;

  leftRows.forEach((row, i) => {
    const rowY = yStart + i * rowGap;
    setBodyFont(doc, 7.6, "bold");
    drawFittedText(doc, row[0], layout.leftNameX, rowY, layout.leftNameWidth);
    drawAmountField(doc, row[1], layout.leftAmountX, rowY, layout.leftAmountWidth);
  });

  rightRows.forEach((row, i) => {
    const rowY = yStart + i * rowGap;
    setBodyFont(doc, 7.6, "bold");
    drawFittedText(doc, row[0], layout.rightNameX, rowY, layout.rightNameWidth);
    drawAmountField(doc, row[1], layout.rightAmountX, rowY, layout.rightAmountWidth);
  });
}

async function buildPdf(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const logo = await loadImage("assets/oneiro-logo.png");

  const blue = [23, 45, 93];
  const green = [103, 201, 133];
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const rightEdge = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;

  doc.setProperties({
    title: "CLINICAL FORM - TPN Order Form",
    subject: "TPN Order Form",
    author: "Oneiro Pharmacy"
  });

  // Header
  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CLINICAL FORM", margin, 44);
  doc.setFontSize(11);
  doc.text("TPN Order Form", margin, 61);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.4);
  doc.text("(Total Parenteral Nutrition)", margin, 74);

  if (logo) {
    const logoW = 88;
    const logoH = 70;
    doc.addImage(logo, "PNG", pageWidth / 2 - logoW / 2, 13, logoW, logoH);
  } else {
    doc.setTextColor(...green);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("ONEIRO", pageWidth / 2 - 38, 52);
    doc.setTextColor(...blue);
    doc.text("PHARMACY", pageWidth / 2 - 38, 67);
  }

  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ONEIRO PHARMACY", rightEdge, 42, { align: "right" });
  doc.setFontSize(7.4);
  doc.text("8026 Lorraine Ave, Ste 207, Stockton, CA 95210", rightEdge, 55, { align: "right" });
  doc.text("PH: 209-898-7345 - FAX: 209-898-7347", rightEdge, 66, { align: "right" });
  doc.text("info@oneiromanagementgroup.com", rightEdge, 77, { align: "right" });

  doc.setDrawColor(...blue);
  doc.setLineWidth(1.2);
  doc.line(margin, 94, rightEdge, 94);

  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - 34;

  function drawContinuationHeader() {
    doc.setTextColor(...blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CLINICAL FORM - TPN Order Form", margin, 42);
    doc.setFontSize(8);
    doc.text("Continued", rightEdge, 42, { align: "right" });
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.9);
    doc.line(margin, 56, rightEdge, 56);
    return 70;
  }

  function ensureSectionFits(requiredHeight) {
    if (y + requiredHeight <= bottomLimit) return;
    doc.addPage();
    y = drawContinuationHeader();
  }

  // Section 1
  let y = 106;
  const allergyLabelWidth = 55;
  const diagnosisLabelWidth = 148;
  const multilineWidth = 508;
  const multilineLineGap = 10;
  const allergyValueWidth = multilineWidth - allergyLabelWidth - 4;
  const diagnosisValueWidth = multilineWidth - diagnosisLabelWidth - 4;
  const allergyLines = getWrappedLineCount(doc, data.allergies, allergyValueWidth, 2);
  const diagnosisLines = getWrappedLineCount(doc, data.diagnosis, diagnosisValueWidth, 2);
  const allergyY = y + 90;
  const diagnosisY = allergyY + multilineBlockHeight(allergyLines, multilineLineGap) + 8;
  const section1Height = Math.max(130, diagnosisY + multilineBlockHeight(diagnosisLines, multilineLineGap) + 12 - y);

  drawSectionBox(doc, "1", "PATIENT DEMOGRAPHICS & METRICS", margin, y, contentWidth, section1Height);
  drawLineField(doc, "Hospital/Facility:", data.hospitalFacility, margin + 10, y + 30, 178, { labelWidth: 78 });
  drawLineField(doc, "Location/Unit:", data.locationUnit, margin + 205, y + 30, 148, { labelWidth: 66 });
  drawLineField(doc, "Room/Bed:", data.roomBed, margin + 378, y + 30, 140, { labelWidth: 55 });
  drawLineField(doc, "Patient Name:", data.patientName, margin + 10, y + 48, 245, { labelWidth: 66 });
  drawLineField(doc, "DOB:", formatDateForPdf(data.dob), margin + 274, y + 48, 90, { labelWidth: 28 });
  drawLineField(doc, "Age:", data.age || calculateAgeFromDob(data.dob), margin + 378, y + 48, 60, { labelWidth: 25 });
  drawLineField(doc, "Sex:", data.sex, margin + 452, y + 48, 66, { labelWidth: 24 });
  drawLineFieldWithUnit(doc, "Weight:", data.weightValue, data.weightUnit || "kg", margin + 10, y + 66, 190, { labelWidth: 45 });
  drawLineFieldWithUnit(doc, "Height:", data.heightValue, data.heightUnit || "cm", margin + 218, y + 66, 194, { labelWidth: 45 });
  drawMultilineField(doc, "Allergies:", data.allergies, margin + 10, allergyY, multilineWidth, { labelWidth: allergyLabelWidth, lineCount: allergyLines, lineGap: multilineLineGap });
  drawMultilineField(doc, "Diagnosis / Indication for TPN:", data.diagnosis, margin + 10, diagnosisY, multilineWidth, { labelWidth: diagnosisLabelWidth, lineCount: diagnosisLines, lineGap: multilineLineGap });

  // Section 2
  y = y + section1Height + 10;
  ensureSectionFits(145);
  drawSectionBox(doc, "2", "TPN PROFILE & NUTRITIONAL GOALS", margin, y, contentWidth, 145);
  const choiceCenterY = y + 33;
  drawInlineText(doc, "Formulation:", margin + 10, choiceCenterY, 74, { size: 7.6, style: "bold" });
  drawCheckbox(doc, "2-in-1 TPN", data.formulation === "2-in-1 TPN", margin + 86, choiceCenterY, 72);
  drawCheckbox(doc, "3-in-1 TPN", data.formulation === "3-in-1 TPN", margin + 174, choiceCenterY, 72);

  drawInlineText(doc, "IV Access:", margin + 292, choiceCenterY, 54, { size: 7.6, style: "bold" });
  drawCheckbox(doc, "Central Line", data.ivAccess === "Central Line", margin + 350, choiceCenterY, 68);
  drawCheckbox(doc, "PICC", data.ivAccess === "PICC", margin + 430, choiceCenterY, 34);
  drawCheckbox(doc, "Peripheral", data.ivAccess === "Peripheral", margin + 470, choiceCenterY, 42);

  drawLineField(doc, "Total Vol:", data.totalVolume, margin + 10, y + 53, 238, { labelWidth: 55 });
  setBodyFont(doc, 7.6, "normal");
  doc.text("mL", margin + 254, y + 53);
  drawLineField(doc, "Overfill:", data.overfill, margin + 312, y + 53, 185, { labelWidth: 48 });
  setBodyFont(doc, 7.6, "normal");
  doc.text("mL", margin + 502, y + 53);

  drawInlineText(doc, "TPN Administration:", margin + 10, y + 74, 118, { size: 7.6, style: "bold" });
  drawCheckbox(doc, "Continuous", data.administration === "Continuous", margin + 10, y + 91, 80);
  drawCheckbox(doc, "Cyclic", data.administration === "Cyclic", margin + 10, y + 108, 80);
  drawLineField(doc, "Rate:", data.rate, margin + 122, y + 91, 176, { labelWidth: 34 });
  setBodyFont(doc, 7.6, "normal");
  doc.text("mL/hr", margin + 303, y + 91);
  drawLineField(doc, "Ramp Up:", data.rampUpRate, margin + 122, y + 108, 92, { labelWidth: 56 });
  setBodyFont(doc, 7.6, "normal");
  doc.text("mL/hr x", margin + 219, y + 108);
  drawAmountField(doc, data.rampUpHours, margin + 261, y + 108, 52);
  doc.text("hrs", margin + 318, y + 108);
  drawLineField(doc, "Taper Rate:", data.taperRate, margin + 122, y + 125, 92, { labelWidth: 56 });
  setBodyFont(doc, 7.6, "normal");
  doc.text("mL/hr x", margin + 219, y + 125);
  drawAmountField(doc, data.taperHours, margin + 261, y + 125, 52);
  doc.text("hrs", margin + 318, y + 125);
  drawLineField(doc, "Goal Rate:", data.goalRate, margin + 344, y + 108, 92, { labelWidth: 54 });
  setBodyFont(doc, 7.4, "normal");
  doc.text("mL/hr x", margin + 441, y + 108);
  drawAmountField(doc, data.goalHours, margin + 484, y + 108, 26);
  doc.text("hrs", margin + 514, y + 108);

  drawLineField(doc, "Protein Req:", data.proteinReq, margin + 10, y + 140, 143, { labelWidth: 64 });
  setBodyFont(doc, 7.4, "normal");
  doc.text("g/day", margin + 158, y + 140);
  drawLineField(doc, "Calorie Req:", data.calorieReq, margin + 206, y + 140, 139, { labelWidth: 64 });
  doc.text("kcal/day", margin + 350, y + 140);
  drawLineField(doc, "Fluid Req:", data.fluidReq, margin + 385, y + 140, 104, { labelWidth: 53 });
  doc.text("mL/day", margin + 495, y + 140);

  // Section 3
  y = y + 145 + 10;
  const macroNotesLabelWidth = 92;
  const macroNotesWidth = 508;
  const macroNotesLineGap = 10;
  const macroNotesValueWidth = macroNotesWidth - macroNotesLabelWidth - 4;
  const macroNotesLines = getWrappedLineCount(doc, data.macroAdditionalNotes, macroNotesValueWidth, 2);
  const macroSectionHeight = Math.max(116, 91 + multilineBlockHeight(macroNotesLines, macroNotesLineGap) + 12);

  ensureSectionFits(macroSectionHeight);
  const macroNotesY = y + 91;
  drawSectionBox(doc, "3", "MACRO NUTRIENTS", margin, y, contentWidth, macroSectionHeight);
  const tableTop = y + 28;
  const leftX = margin + 10;
  const dividerX = margin + 266;
  const rightX = margin + 282;
  const leftAmountX = margin + 136;
  const rightAmountX = margin + 420;
  drawTwoColumnTableHeaders(doc, leftX, rightX, leftAmountX, rightAmountX, tableTop);
  drawHeaderLine(doc, margin + 10, tableTop + 5, rightEdge - 10);
  drawDivider(doc, dividerX, tableTop - 17, dividerX, y + 73);
  setBodyFont(doc, 7.7, "bold");
  doc.text("Dextrose 70%", leftX, tableTop + 21);
  drawAmountWithUnit(doc, data.dextrose70Amt, data.dextrose70Unit, leftAmountX, tableTop + 21, 112);
  setBodyFont(doc, 7.7, "bold");
  doc.text("Clinolipid", leftX, tableTop + 47);
  drawAmountWithUnit(doc, data.clinolipidAmt, data.clinolipidUnit, leftAmountX, tableTop + 47, 112);
  setBodyFont(doc, 7.7, "bold");
  doc.text("Amino Acids (Clinisol", rightX, tableTop + 17);
  doc.text("15%)", rightX, tableTop + 27);
  drawAmountWithUnit(doc, data.aminoAcidsAmt, data.aminoAcidsUnit, rightAmountX, tableTop + 21, 82);
  setBodyFont(doc, 7.7, "bold");
  doc.text("SMOFlipid 20%", rightX, tableTop + 47);
  drawAmountWithUnit(doc, data.smoFlipidAmt, data.smoFlipidUnit, rightAmountX, tableTop + 47, 82);
  drawMultilineField(doc, "Additional Notes:", data.macroAdditionalNotes, margin + 10, macroNotesY, macroNotesWidth, {
    labelWidth: macroNotesLabelWidth,
    lineCount: macroNotesLines,
    lineGap: macroNotesLineGap
  });

  // Section 4
  y = y + macroSectionHeight + 10;
  const unitInstruction = "(Please include units of measurement alongside the amounts)";
  const electrolyteRows = getElectrolyteRowsForPdf(data);
  const electrolyteRowCount = Math.max(1, Math.ceil(electrolyteRows.length / 2));
  const electrolyteSectionHeight = Math.max(128, 82 + electrolyteRowCount * 15);
  ensureSectionFits(electrolyteSectionHeight);
  drawSectionBox(doc, "4", "ELECTROLYTES", margin, y, contentWidth, electrolyteSectionHeight);
  drawSectionInstruction(doc, unitInstruction, margin + 10, y + 33, contentWidth - 20);
  const electrolyteModeLabel = (data.electrolyteMode || "individual") === "combined"
    ? "Entry Format: Combined electrolyte forms"
    : "Entry Format: Individual electrolyte concentrations";
  drawSectionInstruction(doc, electrolyteModeLabel, margin + 10, y + 46, contentWidth - 20);
  let sy = y + 63;
  setBodyFont(doc, 7.6, "bold");
  doc.text("Electrolyte", margin + 10, sy);
  doc.text("Ordered Amount", margin + 130, sy);
  doc.text("Electrolyte", margin + 282, sy);
  doc.text("Ordered Amount", margin + 412, sy);
  drawHeaderLine(doc, margin + 10, sy + 5, rightEdge - 10);
  drawDivider(doc, dividerX, sy - 17, dividerX, y + electrolyteSectionHeight - 13);
  sy += 19;
  drawNamedAmountRows(doc, electrolyteRows, sy, {
    leftNameX: margin + 10,
    leftNameWidth: 112,
    leftAmountX: margin + 130,
    leftAmountWidth: 126,
    rightNameX: margin + 282,
    rightNameWidth: 120,
    rightAmountX: margin + 412,
    rightAmountWidth: 132,
    rowGap: 15
  });

  // Section 5
  y = y + electrolyteSectionHeight + 10;
  const additiveRows = getAdditiveRowsForPdf(data);
  const additiveRowCount = Math.max(1, Math.ceil(additiveRows.length / 2));
  const additivesSectionHeight = Math.max(104, 66 + additiveRowCount * 16);
  ensureSectionFits(additivesSectionHeight);
  drawSectionBox(doc, "5", "VITAMINS, TRACE ELEMENTS & ADDITIVES", margin, y, contentWidth, additivesSectionHeight);
  drawSectionInstruction(doc, unitInstruction, margin + 10, y + 33, contentWidth - 20);
  sy = y + 50;
  setBodyFont(doc, 7.6, "bold");
  doc.text("Additive", margin + 10, sy);
  doc.text("Ordered Amount", margin + 130, sy);
  doc.text("Additive", margin + 282, sy);
  doc.text("Ordered Amount", margin + 412, sy);
  drawHeaderLine(doc, margin + 10, sy + 5, rightEdge - 10);
  drawDivider(doc, dividerX, sy - 17, dividerX, y + additivesSectionHeight - 13);
  sy += 19;
  drawNamedAmountRows(doc, additiveRows, sy, {
    leftNameX: margin + 10,
    leftNameWidth: 112,
    leftAmountX: margin + 130,
    leftAmountWidth: 126,
    rightNameX: margin + 282,
    rightNameWidth: 120,
    rightAmountX: margin + 412,
    rightAmountWidth: 132,
    rowGap: 16
  });

  // Section 6
  y = y + additivesSectionHeight + 10;
  ensureSectionFits(78);
  drawSectionBox(doc, "6", "PRESCRIBER ORDER & AUTHORIZATION", margin, y, contentWidth, 78);
  drawLineField(doc, "Prescriber Name:", data.prescriberName, margin + 10, y + 32, 295, { labelWidth: 91 });
  drawLineField(doc, "Prescriber NPI:", data.prescriberNpi, margin + 322, y + 32, 196, { labelWidth: 82 });
  drawLineField(doc, "Ordering RPh Name:", data.orderingRphName, margin + 10, y + 52, 295, { labelWidth: 98 });
  drawLineField(doc, "Date / Time:", formatDateTimeForPdf(data.orderDateTime), margin + 322, y + 52, 196, { labelWidth: 67 });
  drawLineField(doc, "Prescriber Signature:", data.prescriberSignature, margin + 10, y + 71, 508, { labelWidth: 110 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  doc.setTextColor(80, 90, 105);

  return doc;
}

async function createPdfBlob(dataOverride = null) {
  const data = dataOverride || getFormData();
  const doc = await buildPdf(data);
  return {
    blob: doc.output("blob"),
    filename: fileNameFromData(data),
    data
  };
}

function openPreviewPage() {
  if (form && !form.reportValidity()) return;
  if (!validateMacroNutrientRules()) return;
  saveFormData();
  window.location.href = "preview.html";
}

async function renderPreviewPage() {
  if (!pdfPreview) return;

  setStatus("Generating PDF preview...");
  try {
    const data = getStoredFormData();
    const violation = getMacroRuleViolation(data);
    if (violation) {
      showFormNotice(violation.title, violation.message);
      setStatus("Please go back to the form and correct the Macro Nutrients section before previewing the PDF.", "error");
      return;
    }
    const { blob } = await createPdfBlob(data);
    latestPdfBlob = blob;

    if (latestPdfBlobUrl) URL.revokeObjectURL(latestPdfBlobUrl);
    latestPdfBlobUrl = URL.createObjectURL(blob);
    pdfPreview.src = latestPdfBlobUrl;

    setStatus("PDF preview generated.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not generate the PDF preview. Check the browser console for details.", "error");
  }
}

async function downloadPdf() {
  if (form) {
    if (!validateMacroNutrientRules()) return;
    saveFormData();
  } else if (!validateMacroNutrientRules()) {
    return;
  }
  setStatus("Preparing PDF download...");
  try {
    const { blob, filename } = await createPdfBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("PDF downloaded.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not download the PDF. Check the browser console for details.", "error");
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function submitAndEmail(event) {
  if (event) event.preventDefault();

  if (form) {
    if (!form.reportValidity()) return;
    if (!validateMacroNutrientRules()) return;
    saveFormData();
  } else if (!validateMacroNutrientRules()) {
    return;
  }

  if (!CONFIG.emailEndpoint) {
    setStatus("Email backend is not configured yet. Tell me your hosting platform and I can generate the matching backend file.", "error");
    return;
  }

  setStatus("Generating PDF and sending email...");

  try {
    const { blob, filename, data } = await createPdfBlob();
    const pdfBase64 = await blobToBase64(blob);

    const response = await fetch(CONFIG.emailEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        formData: data,
        pdfBase64,
        recipientEmail: CONFIG.recipientEmail
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    setStatus("PDF emailed successfully.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not send the email. Check the backend endpoint and browser console.", "error");
  }
}

if (form) {
  restoreFormData();
  updateAgeFromDob();
  saveFormData();

  form.addEventListener("input", (event) => {
    if (event.target && ["clinolipidAmt", "smoFlipidAmt"].includes(event.target.name)) {
      if (!enforceMacroNutrientEntry(event.target)) return;
    }
    saveFormData();
  });

  form.addEventListener("change", (event) => {
    if (event.target && event.target.name === "formulation") {
      lastMacroNoticeKey = "";
    }

    if (event.target && event.target.name === "electrolyteMode") {
      updateElectrolyteModeView();
    }

    if (event.target && ["clinolipidAmt", "smoFlipidAmt"].includes(event.target.name)) {
      if (!enforceMacroNutrientEntry(event.target)) return;
    }

    saveFormData();
  });

  form.addEventListener("submit", submitAndEmail);
}

if (addElectrolyteBtn) {
  addElectrolyteBtn.addEventListener("click", () => {
    createDynamicRow(additionalElectrolytesList);
    saveFormData();
  });
}

if (addAdditiveBtn) {
  addAdditiveBtn.addEventListener("click", () => {
    createDynamicRow(additionalAdditivesList);
    saveFormData();
  });
}

if (additionalElectrolytesList) additionalElectrolytesList.addEventListener("input", saveFormData);
if (additionalAdditivesList) additionalAdditivesList.addEventListener("input", saveFormData);

if (noticeOkBtn) noticeOkBtn.addEventListener("click", closeFormNotice);
if (noticeModal) {
  noticeModal.addEventListener("click", (event) => {
    if (event.target === noticeModal) closeFormNotice();
  });
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeFormNotice();
});

if (previewBtn) previewBtn.addEventListener("click", openPreviewPage);
if (downloadBtn) downloadBtn.addEventListener("click", downloadPdf);
if (submitEmailBtn) submitEmailBtn.addEventListener("click", submitAndEmail);
if (backBtn) {
  backBtn.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "index.html";
    }
  });
}

renderPreviewPage();
