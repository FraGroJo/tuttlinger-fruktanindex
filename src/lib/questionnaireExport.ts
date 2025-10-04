import { jsPDF } from "jspdf";

export const exportQuestionnaireToPDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Fragenkatalog: Weidestand-Erfassung", margin, yPos);
  yPos += lineHeight * 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Fruktan-Matrix Präzisionserfassung", margin, yPos);
  yPos += lineHeight * 2;

  // Section 1: Grasbestand
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. Grasbestand (20% Einfluss)", margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const questions1 = [
    "□ Welche Grasarten dominieren?",
    "   ○ Deutsches Weidelgras  ○ Wiesenrispe  ○ Wiesenschwingel",
    "   ○ Rotschwingel  ○ Mix",
    "",
    "□ Anteil Weißklee/Leguminosen?",
    "   ○ 0-10%  ○ 10-30%  ○ >30%",
    "",
    "□ Bestandsalter der Weide?",
    "   ○ <1 Jahr  ○ 1-3 Jahre  ○ 3-10 Jahre  ○ >10 Jahre",
  ];
  questions1.forEach(q => {
    doc.text(q, margin + 2, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight;

  // Section 2: Wachstumsstadium
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Wachstumsstadium (25% Einfluss)", margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const questions2 = [
    "□ Aktuelle Grashöhe?",
    "   ○ <5 cm  ○ 5-10 cm  ○ 10-15 cm  ○ 15-20 cm  ○ >20 cm",
    "",
    "□ Wachstumsphase?",
    "   ○ Ruhend  ○ Langsam  ○ Aktiv  ○ Sehr schnell",
    "",
    "□ Sind Blütenstände sichtbar?",
    "   ○ Ja  ○ Nein  ○ Teilweise",
  ];
  questions2.forEach(q => {
    doc.text(q, margin + 2, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight;

  // Section 3: Beweidungs-/Schnitthistorie
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Beweidungs-/Schnitthistorie (30% Einfluss)", margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const questions3 = [
    "□ Tage seit letzter Beweidung/Schnitt?",
    "   ○ 0-3  ○ 4-7  ○ 8-14  ○ 15-21  ○ 22-28  ○ >28",
    "",
    "□ Restaufwuchs nach letzter Nutzung?",
    "   ○ <3 cm  ○ 3-5 cm  ○ 5-8 cm  ○ >8 cm",
    "",
    "□ Beweidungsintensität?",
    "   ○ Stark abgeweidet  ○ Mittel  ○ Leicht  ○ Ungenutzt",
    "",
    "□ Rotationsweide oder Standweide?",
    "   ○ Rotation  ○ Stand  ○ Portionsweide",
  ];
  questions3.forEach(q => {
    doc.text(q, margin + 2, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight;

  // Section 4: Düngung & Nährstoffe
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Düngung & Nährstoffe (15% Einfluss)", margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const questions4 = [
    "□ Letzte N-Düngung?",
    "   ○ <2 Wochen  ○ 2-4 Wochen  ○ 4-8 Wochen",
    "   ○ >8 Wochen  ○ Keine",
    "",
    "□ N-Menge (kg/ha)?",
    "   ○ 0  ○ 1-40  ○ 40-80  ○ 80-120  ○ >120",
    "",
    "□ Organische Düngung (Mist/Gülle)?",
    "   ○ Ja, wann: _______________  ○ Nein",
  ];
  questions4.forEach(q => {
    doc.text(q, margin + 2, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight;

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Section 5: Bodenbedingungen
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("5. Bodenbedingungen (5% Einfluss)", margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const questions5 = [
    "□ Bodentyp?",
    "   ○ Sandig  ○ Lehmig  ○ Tonig  ○ Torf  ○ Mix",
    "",
    "□ Aktuelle Bodenfeuchte (visuell)?",
    "   ○ Trocken/rissig  ○ Normal  ○ Feucht  ○ Nass",
    "",
    "□ Drainage?",
    "   ○ Gut  ○ Mittel  ○ Schlecht  ○ Staunässe",
  ];
  questions5.forEach(q => {
    doc.text(q, margin + 2, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight;

  // Section 6: Stress-Indikatoren
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("6. Stress-Indikatoren (5% Einfluss)", margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const questions6 = [
    "□ Sichtbare Stresssymptome?",
    "   ○ Verfärbung  ○ Welke  ○ Flecken  ○ Keine",
    "",
    "□ Wurden Pferde bereits hufrehe-empfindlich?",
    "   ○ Ja, wann: _______________",
    "   ○ Nein  ○ Unbekannt",
    "",
    "□ Besondere Beobachtungen:",
    "   _________________________________________________",
    "   _________________________________________________",
  ];
  questions6.forEach(q => {
    doc.text(q, margin + 2, yPos);
    yPos += lineHeight;
  });
  yPos += lineHeight * 2;

  // Priority section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Priorisierung für schnelle Einschätzung (Top 5):", margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const priority = [
    "1. ✓ Tage seit letzter Nutzung",
    "2. ✓ Aktuelle Grashöhe",
    "3. ✓ Letzte N-Düngung (Zeitpunkt)",
    "4. ✓ Dominante Grasart",
    "5. ✓ Wachstumsphase",
  ];
  priority.forEach(p => {
    doc.text(p, margin + 2, yPos);
    yPos += lineHeight;
  });

  // Footer
  yPos += lineHeight * 2;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Dieser Katalog verbessert die Genauigkeit um geschätzt 40-60%.", margin, yPos);

  // Save PDF
  doc.save("Fruktan-Matrix-Fragenkatalog.pdf");
};
