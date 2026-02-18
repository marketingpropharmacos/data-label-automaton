// --- PPLA Parser & Grouped Diff Logic ---

export interface PPLALine {
  raw: string;
  type: "header" | "config" | "text" | "end" | "unknown";
  font?: number;
  rotation?: number;
  hmult?: number;
  vmult?: number;
  x?: number;
  y?: number;
  content?: string;
}

export interface DiffResult {
  left?: PPLALine;
  right?: PPLALine;
  status: "identical" | "similar" | "different" | "only-left" | "only-right";
  details?: string;
  section?: string;
  isSeparator?: boolean;
  sectionLabel?: string;
}

export interface DiffSummary {
  total: number;
  identical: number;
  similar: number;
  different: number;
  onlyLeft: number;
  onlyRight: number;
  coordDiffs: string[];
  fontDiffs: string[];
  configDiffs: string[];
}

interface GroupedLines {
  headers: PPLALine[];
  configs: PPLALine[];
  texts: PPLALine[];
  ends: PPLALine[];
  unknowns: PPLALine[];
}

// --- Parser ---

export function parsePPLACommands(raw: string): PPLALine[] {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  return lines.map((line) => {
    const trimmed = line.trim();

    if (
      /^(<STX>|[\x02])[fLeGMTsn]/i.test(trimmed) ||
      /^\^B/i.test(trimmed) ||
      /^<STX>/i.test(trimmed)
    ) {
      return { raw: trimmed, type: "header" as const };
    }

    if (/^(PA|D\d|H\d|S\d|q\d|C\d|c\d)/i.test(trimmed)) {
      return { raw: trimmed, type: "config" as const };
    }

    if (/^(Q\d+|E$|\^E)/i.test(trimmed)) {
      return { raw: trimmed, type: "end" as const };
    }

    const textMatch = trimmed.match(
      /^(\d)(\d)(\d)(\d)(\d{4,5})(\d{4,5})(.+)$/
    );
    if (textMatch) {
      return {
        raw: trimmed,
        type: "text" as const,
        font: parseInt(textMatch[1]),
        rotation: parseInt(textMatch[2]),
        hmult: parseInt(textMatch[3]),
        vmult: parseInt(textMatch[4]),
        y: parseInt(textMatch[5]),
        x: parseInt(textMatch[6]),
        content: textMatch[7],
      };
    }

    return { raw: trimmed, type: "unknown" as const };
  });
}

// --- Group by type ---

function groupByType(lines: PPLALine[]): GroupedLines {
  const groups: GroupedLines = { headers: [], configs: [], texts: [], ends: [], unknowns: [] };
  for (const line of lines) {
    switch (line.type) {
      case "header": groups.headers.push(line); break;
      case "config": groups.configs.push(line); break;
      case "text": groups.texts.push(line); break;
      case "end": groups.ends.push(line); break;
      default: groups.unknowns.push(line); break;
    }
  }
  return groups;
}

// --- Compare two lines ---

function compareLines(a: PPLALine, b: PPLALine): { status: DiffResult["status"]; details: string } {
  if (a.raw === b.raw) return { status: "identical", details: "" };

  if (a.type === "text" && b.type === "text") {
    const diffs: string[] = [];
    if (a.font !== b.font) diffs.push(`fonte: ${a.font}→${b.font}`);
    if (a.rotation !== b.rotation) diffs.push(`rot: ${a.rotation}→${b.rotation}`);
    if (a.hmult !== b.hmult) diffs.push(`hmult: ${a.hmult}→${b.hmult}`);
    if (a.vmult !== b.vmult) diffs.push(`vmult: ${a.vmult}→${b.vmult}`);
    if (a.x !== b.x) diffs.push(`X: ${a.x}→${b.x}`);
    if (a.y !== b.y) diffs.push(`Y: ${a.y}→${b.y}`);
    if (a.content !== b.content) diffs.push(`texto diferente`);
    return {
      status: diffs.length <= 2 ? "similar" : "different",
      details: diffs.join(", "),
    };
  }

  return { status: "different", details: `${a.raw} ≠ ${b.raw}` };
}

// --- Config prefix extraction ---

function configPrefix(line: PPLALine): string {
  const m = line.raw.match(/^([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : line.raw;
}

// --- Match configs by prefix ---

function matchConfigs(left: PPLALine[], right: PPLALine[]): DiffResult[] {
  const results: DiffResult[] = [];
  const rightUsed = new Set<number>();

  // Group right configs by prefix for fast lookup
  const rightByPrefix = new Map<string, number[]>();
  right.forEach((r, i) => {
    const p = configPrefix(r);
    if (!rightByPrefix.has(p)) rightByPrefix.set(p, []);
    rightByPrefix.get(p)!.push(i);
  });

  for (const lLine of left) {
    const prefix = configPrefix(lLine);
    const candidates = rightByPrefix.get(prefix) || [];
    const matchIdx = candidates.find((i) => !rightUsed.has(i));

    if (matchIdx !== undefined) {
      rightUsed.add(matchIdx);
      const { status, details } = compareLines(lLine, right[matchIdx]);
      results.push({ left: lLine, right: right[matchIdx], status, details, section: "config" });
    } else {
      results.push({ left: lLine, status: "only-left", details: "apenas no nosso sistema", section: "config" });
    }
  }

  // Remaining right configs
  right.forEach((r, i) => {
    if (!rightUsed.has(i)) {
      results.push({ right: r, status: "only-right", details: "apenas no Fórmula Certa", section: "config" });
    }
  });

  return results;
}

// --- Match text lines by content similarity ---

function textSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 0.95;
  
  // Check if one contains the other
  if (la.includes(lb) || lb.includes(la)) return 0.8;

  // Simple character overlap ratio
  const setA = new Set(la.split(""));
  const setB = new Set(lb.split(""));
  let common = 0;
  for (const c of setA) if (setB.has(c)) common++;
  const ratio = (2 * common) / (setA.size + setB.size);
  return ratio;
}

function matchTextLines(left: PPLALine[], right: PPLALine[]): DiffResult[] {
  const results: DiffResult[] = [];
  const rightUsed = new Set<number>();

  // Pass 1: exact content match
  for (let li = 0; li < left.length; li++) {
    if (!left[li].content) continue;
    for (let ri = 0; ri < right.length; ri++) {
      if (rightUsed.has(ri) || !right[ri].content) continue;
      if (left[li].content === right[ri].content) {
        const { status, details } = compareLines(left[li], right[ri]);
        results.push({ left: left[li], right: right[ri], status, details, section: "text" });
        rightUsed.add(ri);
        left[li] = { ...left[li], content: undefined }; // mark used
        break;
      }
    }
  }

  // Pass 2: best similarity match for remaining
  const leftRemaining = left.filter((l) => l.content !== undefined);
  for (const lLine of leftRemaining) {
    let bestIdx = -1;
    let bestScore = 0.4; // minimum threshold

    for (let ri = 0; ri < right.length; ri++) {
      if (rightUsed.has(ri) || !right[ri].content || !lLine.content) continue;
      const score = textSimilarity(lLine.content, right[ri].content);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = ri;
      }
    }

    if (bestIdx >= 0) {
      rightUsed.add(bestIdx);
      const { status, details } = compareLines(lLine, right[bestIdx]);
      results.push({ left: lLine, right: right[bestIdx], status, details, section: "text" });
    } else {
      results.push({ left: lLine, status: "only-left", details: "apenas no nosso sistema", section: "text" });
    }
  }

  // Remaining right text lines
  right.forEach((r, i) => {
    if (!rightUsed.has(i)) {
      results.push({ right: r, status: "only-right", details: "apenas no Fórmula Certa", section: "text" });
    }
  });

  return results;
}

// --- Match simple groups (headers, ends, unknowns) by raw value ---

function matchSimpleGroup(left: PPLALine[], right: PPLALine[], section: string): DiffResult[] {
  const results: DiffResult[] = [];
  const rightUsed = new Set<number>();

  for (const lLine of left) {
    let found = false;
    for (let ri = 0; ri < right.length; ri++) {
      if (rightUsed.has(ri)) continue;
      if (lLine.raw === right[ri].raw) {
        rightUsed.add(ri);
        results.push({ left: lLine, right: right[ri], status: "identical", details: "", section });
        found = true;
        break;
      }
    }
    if (!found) {
      // Try partial match for headers (same command letter)
      let partialIdx = -1;
      for (let ri = 0; ri < right.length; ri++) {
        if (rightUsed.has(ri)) continue;
        // Compare first few chars
        if (lLine.raw.substring(0, 5) === right[ri].raw.substring(0, 5)) {
          partialIdx = ri;
          break;
        }
      }
      if (partialIdx >= 0) {
        rightUsed.add(partialIdx);
        results.push({
          left: lLine,
          right: right[partialIdx],
          status: "different",
          details: `${lLine.raw} ≠ ${right[partialIdx].raw}`,
          section,
        });
      } else {
        results.push({ left: lLine, status: "only-left", details: "apenas no nosso sistema", section });
      }
    }
  }

  right.forEach((r, i) => {
    if (!rightUsed.has(i)) {
      results.push({ right: r, status: "only-right", details: "apenas no Fórmula Certa", section });
    }
  });

  return results;
}

// --- Build grouped diff ---

function makeSeparator(label: string): DiffResult {
  return { status: "identical", isSeparator: true, sectionLabel: label };
}

export function buildGroupedDiff(leftLines: PPLALine[], rightLines: PPLALine[]): DiffResult[] {
  const leftGroups = groupByType(leftLines);
  const rightGroups = groupByType(rightLines);

  const results: DiffResult[] = [];

  // Headers
  const headerResults = matchSimpleGroup(leftGroups.headers, rightGroups.headers, "header");
  if (headerResults.length > 0) {
    results.push(makeSeparator("CABEÇALHOS"));
    results.push(...headerResults);
  }

  // Configs
  const configResults = matchConfigs(leftGroups.configs, rightGroups.configs);
  if (configResults.length > 0) {
    results.push(makeSeparator("CONFIGURAÇÃO"));
    results.push(...configResults);
  }

  // Texts - clone to avoid mutation
  const leftTexts = leftGroups.texts.map((t) => ({ ...t }));
  const rightTexts = rightGroups.texts.map((t) => ({ ...t }));
  const textResults = matchTextLines(leftTexts, rightTexts);
  if (textResults.length > 0) {
    results.push(makeSeparator("TEXTO"));
    results.push(...textResults);
  }

  // Ends
  const endResults = matchSimpleGroup(leftGroups.ends, rightGroups.ends, "end");
  if (endResults.length > 0) {
    results.push(makeSeparator("FINALIZAÇÃO"));
    results.push(...endResults);
  }

  // Unknowns
  const unknownResults = matchSimpleGroup(leftGroups.unknowns, rightGroups.unknowns, "unknown");
  if (unknownResults.length > 0) {
    results.push(makeSeparator("OUTROS"));
    results.push(...unknownResults);
  }

  return results;
}

// --- Summary ---

export function summarizeDiffs(diffs: DiffResult[]): DiffSummary {
  const summary: DiffSummary = {
    total: 0,
    identical: 0,
    similar: 0,
    different: 0,
    onlyLeft: 0,
    onlyRight: 0,
    coordDiffs: [],
    fontDiffs: [],
    configDiffs: [],
  };

  diffs.forEach((d) => {
    if (d.isSeparator) return;
    summary.total++;

    switch (d.status) {
      case "identical": summary.identical++; break;
      case "similar": summary.similar++; break;
      case "different": summary.different++; break;
      case "only-left": summary.onlyLeft++; break;
      case "only-right": summary.onlyRight++; break;
    }

    if (d.details) {
      if (d.details.includes("X:") || d.details.includes("Y:")) {
        summary.coordDiffs.push(`[${d.section}] ${d.details}`);
      }
      if (d.details.includes("fonte") || d.details.includes("rot") || d.details.includes("mult")) {
        summary.fontDiffs.push(`[${d.section}] ${d.details}`);
      }
      if (d.section === "config" && d.status !== "identical") {
        summary.configDiffs.push(`${d.left?.raw || "∅"} vs ${d.right?.raw || "∅"}`);
      }
    }
  });

  return summary;
}

// --- Suggested Fixes ---

export interface CalibrationFix {
  atual: number;
  sugerido: number;
  motivo: string | null;
}

export interface SuggestedFixes {
  contraste: CalibrationFix;
  fonte: CalibrationFix;
  rotacao: CalibrationFix;
  margem_c: CalibrationFix;
  offset_r: CalibrationFix;
}

interface CurrentCalibration {
  margem_c: number;
  offset_r: number;
  contraste: number;
  fonte: number;
  rotacao: number;
}

export function extractCalibrationFromDiff(
  diffs: DiffResult[],
  currentCal: CurrentCalibration
): SuggestedFixes {
  // Extract contrast from FC config lines (H command)
  let fcContraste: number | null = null;
  for (const d of diffs) {
    if (d.right?.type === "config" && /^H\d+/i.test(d.right.raw)) {
      const m = d.right.raw.match(/^H(\d+)/i);
      if (m) fcContraste = parseInt(m[1]);
    }
  }

  // Extract most frequent font and rotation from FC text lines
  const fcFonts: number[] = [];
  const fcRotations: number[] = [];
  const xDiffs: number[] = [];
  const yDiffs: number[] = [];

  for (const d of diffs) {
    if (d.right?.type === "text") {
      if (d.right.font !== undefined) fcFonts.push(d.right.font);
      if (d.right.rotation !== undefined) fcRotations.push(d.right.rotation);
    }
    // Coordinate diffs from paired text lines
    if (d.left?.type === "text" && d.right?.type === "text") {
      if (d.left.x !== undefined && d.right.x !== undefined) {
        xDiffs.push(d.right.x - d.left.x);
      }
      if (d.left.y !== undefined && d.right.y !== undefined) {
        yDiffs.push(d.right.y - d.left.y);
      }
    }
  }

  const mostFrequent = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const counts = new Map<number, number>();
    for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
    let best = arr[0], bestCount = 0;
    for (const [v, c] of counts) {
      if (c > bestCount) { best = v; bestCount = c; }
    }
    return best;
  };

  const median = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const fcFonte = mostFrequent(fcFonts);
  const fcRotacao = mostFrequent(fcRotations);
  const medianX = xDiffs.length > 0 ? median(xDiffs) : 0;
  const medianY = yDiffs.length > 0 ? median(yDiffs) : 0;

  return {
    contraste: {
      atual: currentCal.contraste,
      sugerido: fcContraste ?? currentCal.contraste,
      motivo: fcContraste !== null && fcContraste !== currentCal.contraste
        ? `FC usa H${fcContraste}, sistema usa H${currentCal.contraste}`
        : null,
    },
    fonte: {
      atual: currentCal.fonte,
      sugerido: fcFonte ?? currentCal.fonte,
      motivo: fcFonte !== null && fcFonte !== currentCal.fonte
        ? `FC usa fonte ${fcFonte}, sistema usa fonte ${currentCal.fonte}`
        : null,
    },
    rotacao: {
      atual: currentCal.rotacao,
      sugerido: fcRotacao ?? currentCal.rotacao,
      motivo: fcRotacao !== null && fcRotacao !== currentCal.rotacao
        ? `FC usa rotação ${fcRotacao}, sistema usa rotação ${currentCal.rotacao}`
        : null,
    },
    margem_c: {
      atual: currentCal.margem_c,
      sugerido: medianX !== 0 ? currentCal.margem_c + medianX : currentCal.margem_c,
      motivo: medianX !== 0
        ? `Coords X do FC deslocadas ${medianX > 0 ? '+' : ''}${medianX} unidades`
        : null,
    },
    offset_r: {
      atual: currentCal.offset_r,
      sugerido: medianY !== 0 ? currentCal.offset_r + medianY : currentCal.offset_r,
      motivo: medianY !== 0
        ? `Coords Y do FC deslocadas ${medianY > 0 ? '+' : ''}${medianY} unidades`
        : null,
    },
  };
}
