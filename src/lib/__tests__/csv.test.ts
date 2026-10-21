import { describe, expect, it } from "vitest";
import { companiesToCsv, toCsv, type CompanyCsvLabels } from "../csv";
import { row } from "./fixtures";

describe("toCsv", () => {
  it("starts with a BOM and separates rows with CRLF", () => {
    expect(toCsv([["a", 1], ["b", 2]])).toBe("﻿a,1\r\nb,2");
  });

  it("quotes cells with commas, quotes or line breaks", () => {
    expect(toCsv([['Acme, Inc.', 'Say "hi"', "two\nlines"]])).toBe('﻿"Acme, Inc.","Say ""hi""","two\nlines"');
  });

  it("neutralizes values that a spreadsheet would run as formulas", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "@x", -5]])).toBe("﻿'=HYPERLINK(1),'+1,'@x,-5");
  });
});

describe("companiesToCsv", () => {
  const labels: CompanyCsvLabels = {
    headers: ["Empresa", "Segmento y etapa", "Owner", "Región", "Deals abiertos", "Pipeline", "Probabilidad (%)", "Fecha", "Interacción"],
    region: (r) => (r.region === "emea" ? "EMEA" : r.region),
    interaction: (r) => (r.lastInteraction.type === "demo" ? "Demo" : r.lastInteraction.type),
  };

  it("exports translated headers with machine-friendly values", () => {
    const lines = companiesToCsv(
      [
        row({ id: "a", name: "Lumenfold", tags: ["Pilot", "SMB"], owner: "Lucas Ferreira", openDeals: 4, pipelineValue: 548200, winProbability: 82 }),
        row({ id: "b", name: "Empty", openDeals: 0, pipelineValue: 0, winProbability: null }),
      ],
      labels,
    )
      .replace("﻿", "")
      .split("\r\n");
    expect(lines[0]).toBe("Empresa,Segmento y etapa,Owner,Región,Deals abiertos,Pipeline,Probabilidad (%),Fecha,Interacción");
    expect(lines[1]).toBe("Lumenfold,Pilot; SMB,Lucas Ferreira,EMEA,4,548200,82,2026-10-10,Demo");
    expect(lines[2]).toBe("Empty,Enterprise,Ada,EMEA,0,0,,2026-10-10,Demo");
  });
});
