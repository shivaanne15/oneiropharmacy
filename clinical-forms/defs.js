/* Oneiro Pharmacy clinical form definitions, transcribed from the official
   CLIN-ONE-* clinical forms (Rev 2026.C). */
(function () {
  const T = (name, label, span) => ({ type: "text", name, label, span });
  const D = (name, label) => ({ type: "date", name, label });
  const TA = (name, label, rows) => ({ type: "textarea", name, label, rows });

  const ORDER_ATTEST = "I am the treating practitioner for this patient and certify that the item(s) ordered above are reasonable and medically necessary. Signature stamps are NOT accepted.";
  const MN_ATTEST = "I certify that the above information is true, accurate and complete to the best of my knowledge, and that the item(s) are medically necessary for this patient. I understand that falsification may result in civil/criminal penalties. Signature stamps are NOT accepted.";

  function demographics(extra) {
    return {
      title: "Patient Demographics",
      fields: [
        [T("hospital", "Hospital/Clinic"), T("locationUnit", "Location/Unit")],
        [T("patientName", "Patient Name"), D("dob", "DOB"), T("sex", "Sex")],
        [T("address", "Address", 2), T("phone", "Phone")],
        [T("allergies", "Allergies"), T("weight", "Weight (kg)")],
        [T("insurance", "Insurance / Member ID #"), T("priorAuth", "Prior Auth # (if req.)")]
      ].concat(extra || [])
    };
  }

  function prescriberSection(attest) {
    return {
      title: "Prescriber Order & Authorization",
      note: attest,
      fields: [
        [T("prescriberName", "Prescriber Name"), T("prescriberNpi", "Prescriber NPI")],
        [T("caLicense", "CA License #"), T("dateTime", "Date / Time")],
        [T("orderingName", "Ordering Individual / RPh Name"), T("lengthOfNeed", "Length of Need")]
      ]
    };
  }

  function mnForm(title, itemLabel, docId, subject) {
    return {
      title: title + " — Medical Necessity",
      subtitle: "Letter of Medical Necessity — Clinical Justification",
      docId: docId,
      sections: [
        {
          title: "Patient & Item",
          fields: [
            [T("patientName", "Patient Name"), D("dob", "DOB")],
            [T("insurance", "Insurance / Member ID #"), T("lengthOfNeed", "Length of Need")],
            [T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")],
            [T("hcpcs", "HCPCS Code"), T("item", itemLabel)]
          ]
        },
        {
          title: "Narrative — Medical Necessity",
          note: "To Whom It May Concern: I am the treating practitioner for the patient named above. Based on my clinical evaluation, the " + subject + " ordered are medically necessary. My justification follows:",
          fields: [
            TA("narr1", "1. Diagnosis, functional limitations & relevant clinical history", 4),
            TA("narr2", "2. How the ordered item treats the condition / improves function", 4),
            TA("narr3", "3. Why less costly or alternative options are insufficient or have failed", 4),
            TA("narr4", "4. Expected duration of use and clinical goals / outcomes", 4)
          ]
        },
        {
          title: "Prescriber Attestation & Authorization",
          note: MN_ATTEST,
          fields: [
            [T("prescriberName", "Prescriber Name"), T("prescriberNpi", "Prescriber NPI")],
            [T("caLicense", "CA License #"), T("dateTime", "Date / Time")],
            [T("orderingName", "Ordering Individual Name", 2)]
          ]
        }
      ]
    };
  }

  window.FORM_DEFS = {

    /* ---------------- IV ANTIBIOTICS ---------------- */

    "iv-antibiotics-order": {
      title: "IV Antibiotics / Inotropes Order",
      subtitle: "Physician Order — IV Infusion Therapy",
      docId: "CLIN-ONE-IVABX-PO",
      sections: [
        demographics(),
        {
          title: "IV Access & Therapy Type",
          fields: [
            { type: "checks", name: "therapy", label: "Therapy", options: ["IV Antibiotic", "Inotrope", "Antifungal", "Antiviral", "Hydration"] },
            { type: "checks", name: "ivAccess", label: "IV Access", options: ["Peripheral", "PICC", "Midline", "Central", "Port"] }
          ]
        },
        {
          title: "Drug Order(s)",
          fields: [
            { type: "table", name: "drugs", columns: ["Drug / Solution", "Dose", "Route / Rate", "Frequency / Duration"], rows: 4 },
            [T("doses", "# of Doses / Refills"), T("lengthTherapy", "Length of Therapy")]
          ]
        },
        {
          title: "Diluent, Flushes & IV Supplies",
          fields: [
            { type: "checks", name: "diluent", label: "Diluent", options: ["NS 0.9%", "D5W", "Sterile Water", "1/2 NS"] },
            [T("diluentVolume", "Volume"), T("heparinFlushConc", "Heparin Flush Conc")],
            { type: "checks", name: "heparin", label: "Heparin", options: ["10 u/mL", "100 u/mL", "Saline Lock Only"] },
            { type: "checks", name: "flushes", label: "Flushes", options: ["Saline (0.9% NS) Prefilled", "Heparin Lock Flush", "SASH Protocol"] },
            { type: "checks", name: "ivSupplies", label: "IV Supplies", options: ["Tubing/Sets", "Needles/Syringes", "Dressing Kit", "Alcohol/Prep Pads", "Cassette", "Extension Set", "Caps/Connectors", "Sharps Container", "Gloves"] },
            { type: "checks", name: "pumpPole", label: "Pump / Pole", options: ["Infusion Pump", "IV Pole", "Ambulatory Pump", "Gravity (no pump)"] }
          ]
        },
        {
          title: "Labs & Monitoring",
          note: "CRITICAL PROTOCOL: For Vancomycin patients, Oneiro Pharmacy nurses must perform and draw all required labs. This requirement applies exclusively to Vancomycin therapy.",
          fields: [
            { type: "checks", name: "labs", label: "Required Labs", options: ["CBC", "LFTs", "CMP", "BMP", "CRP", "ESR", "Vanc Trough"], other: true },
            { type: "checks", name: "labFreq", label: "Lab Frequency", options: ["Every 3 Days", "Every 15 Days", "Weekly", "Monthly", "PRN"], other: true },
            TA("holdParams", "Hold Parameters", 2)
          ]
        },
        {
          title: "Diagnosis & Clinical",
          fields: [[T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")]]
        },
        prescriberSection(ORDER_ATTEST)
      ]
    },

    "iv-antibiotics-mn": mnForm("IV Antibiotics / Inotropes", "Drug / Solution", "CLIN-ONE-IVABX-MN", "medications"),

    /* ---------------- TPN ---------------- */

    "tpn-mn": mnForm("TPN / Parenteral Nutrition", "Formula / Additives", "CLIN-ONE-TPN-MN", "parenteral nutrition and additives"),

    /* ---------------- ENTERAL ---------------- */

    "enteral-order": {
      title: "Enteral Feeding Formula Order",
      subtitle: "Physician Order — Enteral / Tube Feeding",
      docId: "CLIN-ONE-ENT-PO",
      sections: [
        demographics(),
        {
          title: "Access & Method",
          fields: [
            { type: "checks", name: "access", label: "Access", options: ["NG", "NJ", "G-Tube", "GJ-Tube", "J-Tube"] },
            { type: "checks", name: "method", label: "Method", options: ["Bolus", "Gravity", "Pump/Continuous", "Cyclic"] }
          ]
        },
        {
          title: "Formula Ordered",
          fields: [
            { type: "table", name: "formulas", columns: ["Formula Name / Brand", "Cal Density", "Qty / Month", "Flush (mL/freq)"], rows: 4 },
            [T("rate", "Rate (mL/hr)"), T("volumeFeed", "Volume/Feed")],
            [T("feedsDay", "Feeds/Day"), T("totalDay", "Total/Day")],
            TA("specialInstructions", "Special Instructions", 2)
          ]
        },
        {
          title: "Diagnosis",
          fields: [[T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")]]
        },
        prescriberSection(ORDER_ATTEST)
      ]
    },

    "enteral-mn": mnForm("Enteral Feeding Formula", "Formula / Brand", "CLIN-ONE-ENT-MN", "enteral formula"),

    /* ---------------- INFANT FORMULA ---------------- */

    "infant-formula-order": {
      title: "Pediatric Infant Formula Order",
      subtitle: "Physician Order — Infant & Pediatric Nutrition",
      docId: "CLIN-ONE-IFO-PO",
      sections: [
        {
          title: "Patient Demographics",
          fields: [
            [T("hospital", "Hospital/Clinic"), T("locationUnit", "Location/Unit")],
            [T("patientName", "Patient Name"), D("dob", "DOB"), T("sex", "Sex")],
            [T("birthWeight", "Birth Weight"), T("currentWt", "Current Wt (kg)"), T("gestationalAge", "Gestational Age")],
            [T("parentGuardian", "Parent/Guardian"), T("phone", "Phone")],
            [T("allergies", "Allergies", 2)],
            { type: "checks", name: "feedingRoute", label: "Feeding Route", options: ["Oral", "NG", "G-Tube"] },
            [T("insurance", "Insurance / Member ID #"), T("wicMediCal", "WIC / Medi-Cal / Prior Auth #")]
          ]
        },
        {
          title: "Growth & Anthropometrics",
          fields: [
            [T("headCirc", "Head Circ (cm)"), T("length", "Length (cm)"), T("wtForAge", "Wt-for-Age %ile")]
          ]
        },
        {
          title: "Formula Selection",
          fields: [
            { type: "checks", name: "brand", label: "Brand (select)", options: ["Enfamil NeuroPro", "Enfamil Gentlease", "Nutramigen", "PurAmino", "Enfaport"], other: true },
            { type: "checks", name: "form", label: "Form", options: ["Powder", "Concentrate", "Ready-to-Feed"] },
            [T("mixing", "Mixing (cal/oz)"), T("qtyCans", "Qty / Cans per Month")],
            [T("feedsDay", "Feeds/Day"), T("volFeed", "Vol/Feed")]
          ]
        },
        {
          title: "Diagnosis & Indication",
          fields: [
            [T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx")],
            { type: "checks", name: "indication", label: "Indication", options: ["Prematurity", "Malabsorption", "MPA", "Metabolic", "FTT"] }
          ]
        },
        prescriberSection(ORDER_ATTEST)
      ]
    },

    "infant-formula-mn": mnForm("Pediatric Infant Formula", "Formula / Brand", "CLIN-ONE-IFO-MN", "infant formula"),

    /* ---------------- NEBULIZER ---------------- */

    "nebulizer-order": {
      title: "Nebulizer & Nebulizer Solutions Order",
      subtitle: "Physician Order — Respiratory Equipment & Drugs",
      docId: "CLIN-ONE-NEB-PO",
      sections: [
        demographics(),
        {
          title: "Equipment",
          fields: [
            { type: "checks", name: "device", label: "Device", options: ["Compressor Nebulizer", "Portable/Mesh", "Aerosol Mask", "Mouthpiece"] }
          ]
        },
        {
          title: "Nebulizer Solution(s) / Drugs",
          fields: [
            { type: "table", name: "drugs", columns: ["Drug / Solution", "Strength", "Dose / Freq", "Qty / Refills"], rows: 4 },
            { type: "checks", name: "common", label: "Common", options: ["Albuterol", "Ipratropium", "Budesonide", "DuoNeb", "Hypertonic Saline"] }
          ]
        },
        {
          title: "Diagnosis",
          fields: [[T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")]]
        },
        prescriberSection(ORDER_ATTEST)
      ]
    },

    "nebulizer-mn": mnForm("Nebulizer & Solutions", "Device / Drug", "CLIN-ONE-NEB-MN", "equipment and medications"),

    /* ---------------- SURGICAL DRESSINGS ---------------- */

    "surgical-dressings-order": {
      title: "Surgical Dressings Order",
      subtitle: "Physician Order — Wound Care Supplies",
      docId: "CLIN-ONE-DRS-PO",
      sections: [
        demographics(),
        {
          title: "Wound Assessment",
          fields: [
            [T("woundLocation", "Wound Location"), T("numWounds", "# of Wounds"), T("stage", "Stage")],
            [T("size", "Size (L x W x D)"), T("drainage", "Drainage"), T("woundType", "Wound Type")]
          ]
        },
        {
          title: "Dressing Ordered",
          fields: [
            { type: "table", name: "dressings", columns: ["Dressing Type / HCPCS", "Size", "Qty", "Change Frequency"], rows: 4 },
            { type: "checks", name: "type", label: "Type", options: ["Gauze", "Foam", "Hydrocolloid", "Alginate", "Transparent", "Collagen"] }
          ]
        },
        {
          title: "Diagnosis",
          fields: [[T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")]]
        },
        prescriberSection(ORDER_ATTEST)
      ]
    },

    "surgical-dressings-mn": mnForm("Surgical Dressings", "Dressing Type", "CLIN-ONE-DRS-MN", "dressings"),

    /* ---------------- DIABETIC SUPPLIES ---------------- */

    "diabetic-supplies-order": {
      title: "Diabetic Supplies Order",
      subtitle: "Physician Order — Test Strips, Lancets, Meter, CGM",
      docId: "CLIN-ONE-DM-PO",
      sections: [
        demographics(),
        {
          title: "Diabetes Profile",
          fields: [
            { type: "checks", name: "dmType", label: "Type", options: ["Type 1", "Type 2", "Gestational"] },
            { type: "radio", name: "insulinTreated", label: "Insulin Treated", options: ["Yes", "No"] },
            [T("testingFreq", "Testing Frequency (times/day)"), T("lastA1c", "Last A1c")]
          ]
        },
        {
          title: "Supplies Ordered",
          fields: [
            { type: "checks", name: "items", label: "Items", options: ["Test Strips", "Lancets", "Meter", "Control Solution", "CGM", "CGM Sensors", "CGM Transmitter", "Lancing Device"] },
            { type: "table", name: "supplies", columns: ["Item / HCPCS", "Brand / Model", "Qty / Month", "Refills"], rows: 4 }
          ]
        },
        {
          title: "Diagnosis",
          fields: [[T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")]]
        },
        prescriberSection(ORDER_ATTEST)
      ]
    },

    "diabetic-supplies-mn": mnForm("Diabetic Supplies", "Item / Supply", "CLIN-ONE-DM-MN", "supplies"),

    /* ---------------- GENERAL DMEPOS ---------------- */

    "dmepos-order": {
      title: "DMEPOS Physician Order",
      subtitle: "Detailed Written Order for DMEPOS",
      docId: "CLIN-ONE-PO",
      sections: [
        {
          title: "Patient Demographics",
          fields: [
            [T("hospital", "Hospital/Facility"), T("locationUnit", "Location/Unit")],
            [T("patientName", "Patient Name"), D("dob", "DOB"), T("sex", "Sex")],
            [T("address", "Address", 2), T("phone", "Phone")],
            [T("insurance", "Insurance / Member ID #"), T("priorAuth", "Prior Auth # (if req.)")]
          ]
        },
        {
          title: "Order Date & Delivery",
          fields: [
            [D("dateOfOrder", "Date of Order"), T("startDelivery", "Anticipated Start / Delivery Date")]
          ]
        },
        {
          title: "Item(s) Ordered",
          fields: [
            { type: "table", name: "items", columns: ["HCPCS Code", "Item / Equipment / Supply Description", "Qty", "Frequency / Refills"], rows: 5 },
            { type: "checks", name: "dispenseAs", label: "Dispense as", options: ["Purchase", "Rental", "Repair", "Replacement"] },
            [T("lengthOfNeedMonths", "Length of Need (months, 99 = lifetime)", 2)]
          ]
        },
        {
          title: "Diagnosis & Clinical",
          fields: [
            [T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")],
            { type: "radio", name: "faceToFace", label: "Face-to-face encounter within required timeframe?", options: ["Yes", "No"] },
            [D("f2fDate", "Face-to-face Date")]
          ]
        },
        {
          title: "Prescriber Order & Authorization",
          note: ORDER_ATTEST + " Retain per California Board of Pharmacy & Medicare DMEPOS Supplier Standards. Verify current requirements with the Pharmacist-in-Charge before use.",
          fields: [
            [T("prescriberName", "Prescriber Name"), T("prescriberNpi", "Prescriber NPI")],
            [T("caLicense", "CA License #"), T("dateTime", "Date / Time")],
            [T("orderingName", "Ordering RPh Name", 2)]
          ]
        }
      ]
    },

    "dmepos-lmn": mnForm("DMEPOS", "Item / Equipment / Supply", "CLIN-ONE-LMN", "item(s)"),

    /* ---------------- MISC DMEPOS ---------------- */

    "misc-dmepos-order": {
      title: "Miscellaneous DMEPOS Order",
      subtitle: "Physician Order — General / Other Supplies & Equipment",
      docId: "CLIN-ONE-MISC-PO",
      sections: [
        demographics(),
        {
          title: "Item(s) Ordered",
          fields: [
            { type: "table", name: "items", columns: ["HCPCS Code", "Item / Equipment / Supply Description", "Qty", "Frequency / Refills"], rows: 5 },
            { type: "checks", name: "dispenseAs", label: "Dispense as", options: ["Purchase", "Rental", "Repair", "Replacement"] }
          ]
        },
        {
          title: "Diagnosis & Justification",
          fields: [
            [T("primaryDx", "Primary Dx (ICD-10)"), T("secondaryDx", "Secondary Dx (ICD-10)")],
            TA("clinicalNotes", "Clinical Notes", 3)
          ]
        },
        prescriberSection(ORDER_ATTEST)
      ]
    },

    "misc-dmepos-mn": mnForm("Miscellaneous DMEPOS", "Item / Equipment", "CLIN-ONE-MISC-MN", "item(s)"),

    /* ---------------- INCONTINENCE ---------------- */

    "incontinence-mn": mnForm("Incontinence Supplies", "Item / Supply", "CLIN-ONE-INC-MN", "supplies")
  };
})();
