import { useState } from "react";
import { ArrowLeftRight, ClipboardPaste, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// --- PPLA Parser ---

interface PPLALine {
  raw: string;
  type: "header" | "config" | "text" | "end" | "unknown";
  // For text lines:
  font?: number;
  rotation?: number;
  hmult?: number;
  vmult?: number;
  x?: number;
  y?: number;
  content?: string;
}

function parsePPLACommands(raw: string): PPLALine[] {
  // Normalize: split by \r\n or \n, remove empty trailing
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  return lines.map((line) => {
    const trimmed = line.trim();

    // Headers: <STX>f, <STX>L, <STX>e, STX commands or ^B style
    if (
      /^(<STX>|[\x02])[fLeGMTsn]/i.test(trimmed) ||
      /^\^B/i.test(trimmed) ||
      /^<STX>/i.test(trimmed)
    ) {
      return { raw: trimmed, type: "header" as const };
    }

    // Config: PA, D\d+, H\d+, S\d+, q\d+, C\d+, c\d+
    if (/^(PA|D\d|H\d|S\d|q\d|C\d|c\d)/i.test(trimmed)) {
      return { raw: trimmed, type: "config" as const };
    }

    // End: Q\d+, E, ^E
    if (/^(Q\d+|E$|\^E)/i.test(trimmed)) {
      return { raw: trimmed, type: "end" as const };
    }

    // Text line: format is typically like: 1A1100000100020text
    // Pattern: font(1) rotation(1) hmult(1) vmult(1) y(4-5) x(4-5) content
    // More flexible: digit digit digit digit + digits for coords + text
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

// --- Diff logic ---

interface DiffResult {
  lineNum: number;
  left?: PPLALine;
  right?: PPLALine;
  status: "identical" | "similar" | "different" | "only-left" | "only-right";
  details?: string;
}

function compareTextLines(a: PPLALine, b: PPLALine): { status: DiffResult["status"]; details: string } {
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

  return { status: "different", details: "comandos diferentes" };
}

function buildDiff(leftLines: PPLALine[], rightLines: PPLALine[]): DiffResult[] {
  const results: DiffResult[] = [];
  const maxLen = Math.max(leftLines.length, rightLines.length);

  for (let i = 0; i < maxLen; i++) {
    const left = leftLines[i];
    const right = rightLines[i];

    if (left && right) {
      const { status, details } = compareTextLines(left, right);
      results.push({ lineNum: i, left, right, status, details });
    } else if (left && !right) {
      results.push({ lineNum: i, left, status: "only-left", details: "apenas no nosso sistema" });
    } else if (!left && right) {
      results.push({ lineNum: i, right, status: "only-right", details: "apenas no Fórmula Certa" });
    }
  }

  return results;
}

// --- Summary ---

interface DiffSummary {
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

function summarizeDiffs(diffs: DiffResult[]): DiffSummary {
  const summary: DiffSummary = {
    total: diffs.length,
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
    switch (d.status) {
      case "identical": summary.identical++; break;
      case "similar": summary.similar++; break;
      case "different": summary.different++; break;
      case "only-left": summary.onlyLeft++; break;
      case "only-right": summary.onlyRight++; break;
    }

    if (d.details) {
      if (d.details.includes("X:") || d.details.includes("Y:")) {
        summary.coordDiffs.push(`L${d.lineNum}: ${d.details}`);
      }
      if (d.details.includes("fonte") || d.details.includes("rot") || d.details.includes("mult")) {
        summary.fontDiffs.push(`L${d.lineNum}: ${d.details}`);
      }
      if (d.left?.type === "config" || d.right?.type === "config") {
        summary.configDiffs.push(`L${d.lineNum}: ${d.left?.raw || "∅"} vs ${d.right?.raw || "∅"}`);
      }
    }
  });

  return summary;
}

// --- Status colors ---

function statusBg(status: DiffResult["status"]): string {
  switch (status) {
    case "identical": return "bg-green-50 dark:bg-green-950/30";
    case "similar": return "bg-yellow-50 dark:bg-yellow-950/30";
    case "different": return "bg-red-50 dark:bg-red-950/30";
    case "only-left": return "bg-blue-50 dark:bg-blue-950/30";
    case "only-right": return "bg-purple-50 dark:bg-purple-950/30";
  }
}

function statusBadge(status: DiffResult["status"]) {
  switch (status) {
    case "identical": return <Badge className="bg-green-600 text-xs">✓</Badge>;
    case "similar": return <Badge className="bg-yellow-600 text-xs">~</Badge>;
    case "different": return <Badge variant="destructive" className="text-xs">✗</Badge>;
    case "only-left": return <Badge className="bg-blue-600 text-xs">←</Badge>;
    case "only-right": return <Badge className="bg-purple-600 text-xs">→</Badge>;
  }
}

// --- Component ---

interface PPLAComparerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemCommands: string[];  // from diagnosticResult.comandos_ppla
  systemRaw?: string;        // from diagnosticResult.comandos_raw
  capturedCommands?: string[]; // from captureResult.comandos (optional, pre-fill)
  capturedRaw?: string;
}

const PPLAComparer = ({
  open,
  onOpenChange,
  systemCommands,
  systemRaw,
  capturedCommands,
  capturedRaw,
}: PPLAComparerProps) => {
  const [pastedText, setPastedText] = useState("");
  const [diffResults, setDiffResults] = useState<DiffResult[] | null>(null);
  const [summary, setSummary] = useState<DiffSummary | null>(null);

  // Pre-fill from captured data if available
  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !pastedText && (capturedRaw || capturedCommands)) {
      setPastedText(capturedRaw || capturedCommands?.join("\n") || "");
    }
    if (!isOpen) {
      setDiffResults(null);
      setSummary(null);
    }
    onOpenChange(isOpen);
  };

  const handleAnalyze = () => {
    const leftRaw = systemRaw || systemCommands.join("\n");
    const rightRaw = pastedText;

    const leftParsed = parsePPLACommands(leftRaw);
    const rightParsed = parsePPLACommands(rightRaw);

    const diffs = buildDiff(leftParsed, rightParsed);
    setDiffResults(diffs);
    setSummary(summarizeDiffs(diffs));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Comparador PPLA: Nosso Sistema vs Fórmula Certa
          </DialogTitle>
          <DialogDescription>
            Cole os comandos do arquivo .prn (Notepad++) e clique "Analisar" para ver as diferenças.
          </DialogDescription>
        </DialogHeader>

        {/* Textarea for pasting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              <ClipboardPaste className="h-4 w-4 inline mr-1" />
              Comandos do Fórmula Certa (cole aqui)
            </label>
            <Button size="sm" onClick={handleAnalyze} disabled={!pastedText.trim()}>
              <Search className="h-3 w-3 mr-1" />
              Analisar
            </Button>
          </div>
          <Textarea
            placeholder="Cole aqui o conteúdo do arquivo .prn aberto no Notepad++ (Ctrl+A, Ctrl+C)..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            className="font-mono text-xs min-h-[100px]"
          />
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-green-100 dark:bg-green-950/40">
              <div className="font-bold text-green-700 dark:text-green-400">{summary.identical}</div>
              <div className="text-muted-foreground">Idênticos</div>
            </div>
            <div className="p-2 rounded bg-yellow-100 dark:bg-yellow-950/40">
              <div className="font-bold text-yellow-700 dark:text-yellow-400">{summary.similar}</div>
              <div className="text-muted-foreground">Similares</div>
            </div>
            <div className="p-2 rounded bg-red-100 dark:bg-red-950/40">
              <div className="font-bold text-red-700 dark:text-red-400">{summary.different}</div>
              <div className="text-muted-foreground">Diferentes</div>
            </div>
            <div className="p-2 rounded bg-blue-100 dark:bg-blue-950/40">
              <div className="font-bold text-blue-700 dark:text-blue-400">{summary.onlyLeft}</div>
              <div className="text-muted-foreground">Só nosso</div>
            </div>
            <div className="p-2 rounded bg-purple-100 dark:bg-purple-950/40">
              <div className="font-bold text-purple-700 dark:text-purple-400">{summary.onlyRight}</div>
              <div className="text-muted-foreground">Só FC</div>
            </div>
          </div>
        )}

        {/* Detailed diff alerts */}
        {summary && (summary.coordDiffs.length > 0 || summary.fontDiffs.length > 0 || summary.configDiffs.length > 0) && (
          <div className="space-y-2 text-xs">
            {summary.coordDiffs.length > 0 && (
              <div className="p-2 rounded border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700">
                <span className="font-semibold">📐 Diferenças de coordenadas:</span>
                <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                  {summary.coordDiffs.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {summary.fontDiffs.length > 0 && (
              <div className="p-2 rounded border border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-700">
                <span className="font-semibold">🔤 Diferenças de fonte/rotação:</span>
                <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                  {summary.fontDiffs.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {summary.configDiffs.length > 0 && (
              <div className="p-2 rounded border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700">
                <span className="font-semibold">⚙️ Diferenças de calibração:</span>
                <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                  {summary.configDiffs.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Side-by-side diff */}
        {diffResults && (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border rounded overflow-hidden">
            {/* Headers */}
            <div className="p-2 bg-muted font-semibold text-xs text-center border-b">
              🟢 Nosso Sistema
            </div>
            <div className="p-2 bg-muted border-b border-x w-10 text-center text-xs font-semibold">
              ≡
            </div>
            <div className="p-2 bg-muted font-semibold text-xs text-center border-b">
              🔵 Fórmula Certa
            </div>

            {/* Rows */}
            <ScrollArea className="h-[350px] col-span-3">
              <div className="grid grid-cols-[1fr_auto_1fr]">
                {diffResults.map((diff, i) => (
                  <div key={i} className="contents">
                    <div className={`px-2 py-1 text-xs font-mono border-b ${statusBg(diff.status)} ${!diff.left ? 'opacity-30' : ''}`}>
                      <span className="text-muted-foreground mr-1">[{String(i).padStart(2, '0')}]</span>
                      {diff.left?.raw || "—"}
                    </div>
                    <div className={`px-1 py-1 border-b border-x flex items-center justify-center ${statusBg(diff.status)}`}>
                      {statusBadge(diff.status)}
                    </div>
                    <div className={`px-2 py-1 text-xs font-mono border-b ${statusBg(diff.status)} ${!diff.right ? 'opacity-30' : ''}`}>
                      <span className="text-muted-foreground mr-1">[{String(i).padStart(2, '0')}]</span>
                      {diff.right?.raw || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PPLAComparer;
