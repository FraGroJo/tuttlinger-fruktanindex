/**
 * Export-Utility-Funktionen
 * Exportiert Fruktan-Matrix-Daten als CSV oder PDF
 */

import { type DayMatrix } from "@/types/fruktan";

/**
 * Exportiert die Matrix-Daten als CSV-Datei
 */
export function exportToCSV(matrices: DayMatrix[], locationName: string) {
  // CSV-Header
  const headers = [
    "Datum",
    "Zeitfenster",
    "Uhrzeit",
    "Score",
    "Risiko-Level",
    "Begründung",
  ];

  // CSV-Zeilen
  const rows: string[][] = [];
  
  matrices.forEach((matrix) => {
    const date = new Date(matrix.date).toLocaleDateString("de-DE");
    
    // Morgens
    rows.push([
      date,
      "Morgens",
      "05:00–11:00",
      matrix.morning.score.toString(),
      getLevelText(matrix.morning.level),
      matrix.morning.reason,
    ]);
    
    // Mittags
    rows.push([
      date,
      "Mittags",
      "11:00–16:00",
      matrix.noon.score.toString(),
      getLevelText(matrix.noon.level),
      matrix.noon.reason,
    ]);
    
    // Abends
    rows.push([
      date,
      "Abends",
      "16:00–21:00",
      matrix.evening.score.toString(),
      getLevelText(matrix.evening.level),
      matrix.evening.reason,
    ]);
  });

  // CSV-String erstellen
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
  ].join("\n");

  // BOM für Excel UTF-8 Unterstützung
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Download triggern
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `fruktan-matrix-${locationName}-${timestamp}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generiert einen einfachen PDF-Bericht (als HTML-to-Print)
 */
export function exportToPDF(matrices: DayMatrix[], locationName: string, emsMode: boolean) {
  // Erstelle ein neues Fenster mit druckbarer HTML-Seite
  const printWindow = window.open("", "_blank");
  
  if (!printWindow) {
    alert("Popup wurde blockiert. Bitte erlaube Popups für diese Seite.");
    return;
  }

  const timestamp = new Date().toLocaleString("de-DE");
  const thresholds = emsMode
    ? "Strenger Modus (EMS): 0–29 Grün | 30–59 Gelb | 60–100 Rot"
    : "Standard: 0–39 Grün | 40–69 Gelb | 70–100 Rot";

  // HTML-Inhalt für PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Fruktan-Matrix Bericht - ${locationName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          background: white;
          color: #333;
        }
        h1 {
          color: #1a202c;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .subtitle {
          color: #718096;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .metadata {
          background: #f7fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid #4299e1;
        }
        .metadata p {
          margin: 5px 0;
          font-size: 13px;
          color: #4a5568;
        }
        .day-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .day-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #2d3748;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .time-slot {
          margin-bottom: 20px;
          padding: 15px;
          background: #f7fafc;
          border-radius: 8px;
          border-left: 4px solid #cbd5e0;
        }
        .time-slot.safe {
          border-left-color: #48bb78;
          background: #f0fff4;
        }
        .time-slot.moderate {
          border-left-color: #ed8936;
          background: #fffaf0;
        }
        .time-slot.high {
          border-left-color: #f56565;
          background: #fff5f5;
        }
        .slot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .slot-title {
          font-weight: 600;
          font-size: 16px;
          color: #2d3748;
        }
        .slot-time {
          font-size: 12px;
          color: #718096;
        }
        .score-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
        }
        .score-badge.safe {
          background: #48bb78;
          color: white;
        }
        .score-badge.moderate {
          background: #ed8936;
          color: white;
        }
        .score-badge.high {
          background: #f56565;
          color: white;
        }
        .reason {
          margin-top: 10px;
          font-size: 13px;
          color: #4a5568;
          line-height: 1.6;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #a0aec0;
          text-align: center;
        }
        @media print {
          body {
            padding: 20px;
          }
          .day-section {
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      <h1>🐴 Fruktan-Matrix für Pferdeweiden</h1>
      <p class="subtitle">Standort: ${locationName}</p>
      
      <div class="metadata">
        <p><strong>Erstellt am:</strong> ${timestamp}</p>
        <p><strong>Bewertungssystem:</strong> ${thresholds}</p>
        <p><strong>Datenquelle:</strong> Open-Meteo API</p>
      </div>

      ${matrices
        .map((matrix) => {
          const date = new Date(matrix.date);
          const formattedDate = date.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          let dayLabel = formattedDate;
          if (diffDays === 0) dayLabel = `Heute – ${formattedDate}`;
          else if (diffDays === 1) dayLabel = `Morgen – ${formattedDate}`;
          else if (diffDays === 2) dayLabel = `Übermorgen – ${formattedDate}`;
          else if (diffDays === 3) dayLabel = `In 3 Tagen – ${formattedDate}`;

          return `
            <div class="day-section">
              <h2 class="day-title">${dayLabel}</h2>
              
              <div class="time-slot ${matrix.morning.level}">
                <div class="slot-header">
                  <div>
                    <div class="slot-title">🌅 Morgens</div>
                    <div class="slot-time">05:00–11:00 Uhr</div>
                  </div>
                  <span class="score-badge ${matrix.morning.level}">
                    Score: ${matrix.morning.score}
                  </span>
                </div>
                <p class="reason">${matrix.morning.reason}</p>
              </div>
              
              <div class="time-slot ${matrix.noon.level}">
                <div class="slot-header">
                  <div>
                    <div class="slot-title">☀️ Mittags</div>
                    <div class="slot-time">11:00–16:00 Uhr</div>
                  </div>
                  <span class="score-badge ${matrix.noon.level}">
                    Score: ${matrix.noon.score}
                  </span>
                </div>
                <p class="reason">${matrix.noon.reason}</p>
              </div>
              
              <div class="time-slot ${matrix.evening.level}">
                <div class="slot-header">
                  <div>
                    <div class="slot-title">🌆 Abends</div>
                    <div class="slot-time">16:00–21:00 Uhr</div>
                  </div>
                  <span class="score-badge ${matrix.evening.level}">
                    Score: ${matrix.evening.score}
                  </span>
                </div>
                <p class="reason">${matrix.evening.reason}</p>
              </div>
            </div>
          `;
        })
        .join("")}

      <div class="footer">
        <p>Dieser Bericht dient als Orientierungshilfe. Individuelle Faktoren müssen zusätzlich berücksichtigt werden.</p>
        <p>Fruktan-Matrix © ${new Date().getFullYear()} – Generiert mit Open-Meteo Wetterdaten</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Warte auf Laden und öffne dann Druckdialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

/**
 * Hilfsfunktion: Konvertiert Level zu deutschem Text
 */
function getLevelText(level: string): string {
  switch (level) {
    case "safe":
      return "Gering";
    case "moderate":
      return "Erhöht";
    case "high":
      return "Hoch";
    default:
      return "Unbekannt";
  }
}
