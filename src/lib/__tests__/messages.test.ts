import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

interface AstNode {
  type: number;
  value?: string;
  children?: AstNode[];
  options?: Record<string, { value: AstNode[] }>;
}

// Element types from @formatjs/icu-messageformat-parser: 0 literal, 1 argument, 2 number, 3 date,
// 4 time, 5 select, 6 plural, 7 pound, 8 tag.
function collect(nodes: AstNode[], names: Set<string>): void {
  for (const node of nodes) {
    if (node.type >= 1 && node.type <= 6 && node.value) names.add(node.value);
    if (node.type === 8 && node.value) names.add(`<${node.value}>`);
    if (node.children) collect(node.children, names);
    for (const option of Object.values(node.options ?? {})) collect(option.value, names);
  }
}

/** Placeholders and rich-text tags used by a message, read from its ICU syntax tree. */
function variables(message: string, locale: string): string[] {
  const names = new Set<string>();
  collect(new IntlMessageFormat(message, locale).getAst() as AstNode[], names);
  return [...names].sort();
}

const english = flatten(en);
const spanish = flatten(es);

describe("translations", () => {
  it("have the same keys in English and Spanish", () => {
    expect([...spanish.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("use the same placeholders in both languages", () => {
    for (const [key, message] of english) expect(variables(spanish.get(key) ?? "", "es"), key).toEqual(variables(message, "en"));
  });

  it("are valid ICU messages", () => {
    for (const [locale, messages] of [["en", english], ["es", spanish]] as const) {
      for (const [key, message] of messages) {
        expect(() => new IntlMessageFormat(message, locale), `${locale}: ${key}`).not.toThrow();
      }
    }
  });

  it("aren't left untranslated by accident", () => {
    // Sales jargon and proper names stay the same on purpose; anything else should differ.
    const sameOnPurpose = /^(meta\.title|brand\.name|common\.noValue|languages\.|teams\.mid-market|regions\.(emea|apac)|nav\.(forecast|pipelines)|views\.(deals|forecast)|interactions\.(discovery|demo|legal|partner)|detail\.(deals|emails|scoreCard)|profile\.(pipeline|statPipeline)|search\.(pipeline|enter)|table\.(openDeals|pipelineValue)|deals\.columnSummary|detail\.stageLine|filters\.showDeals|forecast\.quarter$|forecast\.(kpis|chart|reps)\.(commit|bestCase)$|forecast\.deals\.(deal|groupSummary)$|forecastCategories\.(commit|bestCase|pipeline)$|dealSheet\.(forecast|countsIn)$|buyingRoles\.champion$|contacts\.email$|contactDialog\.(namePlaceholder|email)$|activityTypes\.email$|activityDialog\.deal$)/;
    const identical = [...english].filter(([key, message]) => spanish.get(key) === message && !sameOnPurpose.test(key));
    expect(identical.map(([key]) => key)).toEqual([]);
  });
});
