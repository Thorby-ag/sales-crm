"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { axisTicks, valueAt, weeklyRows, type ForecastSeries, type Quarter, type Step } from "@/lib/forecast";
import { addDays, addMonths, daysBetween } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFormat } from "../use-format";
import { CARD } from "./styles";

const HEIGHT = 232;
const PAD = { top: 22, right: 8, bottom: 24 };

/** How each line is drawn, shared by the chart and its legend. */
const LINES = {
  closed: { color: "var(--status)", width: 2, dash: undefined },
  commit: { color: "var(--commit)", width: 2, dash: "6 4" },
  bestCase: { color: "var(--warning)", width: 2, dash: "0.5 4" },
  quota: { color: "var(--soft)", width: 1, dash: "3 3" },
} as const;

type Line = keyof typeof LINES;

/** Labels get a halo in the card's color, so lines passing behind them don't cut through the text. */
const LABEL = { stroke: "#181818", strokeWidth: 4, strokeLinejoin: "round", paintOrder: "stroke" } as const;

/** An element's width, kept up to date as it resizes; 0 until measured. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Path of a step series from its first step to day `end`. */
function stepPath(steps: readonly Step[], end: number, x: (day: number) => number, y: (value: number) => number): string {
  const [first, ...rest] = steps;
  if (!first) return "";
  let path = `M${x(first.day)},${y(first.value)}`;
  for (const step of rest) path += `H${x(step.day)}V${y(step.value)}`;
  return `${path}H${x(end)}`;
}

function LinePath({ line, d }: { line: Line; d: string }) {
  const { color, width, dash } = LINES[line];
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />;
}

function Swatch({ line }: { line: Line }) {
  const { color, width, dash } = LINES[line];
  return (
    <svg aria-hidden width="18" height="8" className="shrink-0 overflow-visible">
      <line x1="1" x2="17" y1="4" y2="4" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

export function ForecastChart({ series, quarter, quota, quarterLabel }: { series: ForecastSeries; quarter: Quarter; quota: number; quarterLabel: string }) {
  const t = useTranslations();
  const { compactMoney, money, date, month } = useFormat();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const rows = useMemo(() => weeklyRows(series, quarter), [series, quarter]);

  const { days, elapsed } = series;
  const wonSoFar = series.closed.at(-1)?.value ?? 0;
  const commitEnd = series.commit.at(-1)?.value ?? 0;
  const bestCaseEnd = series.bestCase.at(-1)?.value ?? 0;
  const ticks = axisTicks(Math.max(quota, bestCaseEnd) * 1.05);
  const top = ticks.at(-1)!;
  const plotWidth = Math.max(1, width - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (day: number) => (day / days) * plotWidth;
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
  const closedLine = elapsed > 0 ? stepPath(series.closed, elapsed, x, y) : "";
  const showToday = elapsed > 0;

  const summary = t("forecast.chart.summary", {
    quarter: quarterLabel,
    closed: money(wonSoFar),
    quota: money(quota),
    commit: money(commitEnd),
    bestCase: money(bestCaseEnd),
  });

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const day = Math.floor(((event.clientX - left) / plotWidth) * days);
    setHoverDay(day >= 0 && day < days ? day : null);
  };

  const noValue = t("common.noValue");
  const cell = (value: number | null) => (value === null ? noValue : money(value));

  return (
    <section aria-labelledby="forecast-chart-title" className={cn(CARD, "p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <h2 id="forecast-chart-title" className="type-lead font-medium">
          {t("forecast.chart.title")}
        </h2>
        <ul className="type-caption flex flex-wrap items-center gap-x-4 gap-y-2 text-soft">
          {(["closed", "commit", "bestCase", "quota"] as const).map((line) => (
            <li key={line} className="flex items-center gap-1.5">
              <Swatch line={line} />
              {t(`forecast.chart.${line}`)}
            </li>
          ))}
        </ul>
      </div>

      <div ref={ref} className="relative mt-3" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            role="img"
            aria-label={summary}
            width={width}
            height={HEIGHT}
            className="block touch-pan-y overflow-visible"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHoverDay(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={0} x2={plotWidth} y1={y(tick)} y2={y(tick)} stroke="#262626" />
                <text {...LABEL} x={0} y={y(tick) - 5} className="fill-muted-foreground text-[11px] tabular-nums">
                  {compactMoney(tick)}
                </text>
              </g>
            ))}
            {[0, 1, 2].map((offset) => {
              const first = addMonths(quarter.start, offset);
              const day = daysBetween(quarter.start, first);
              return (
                <g key={first}>
                  {day > 0 && <line x1={x(day)} x2={x(day)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#222" />}
                  <text {...LABEL} x={x(day) + 4} y={HEIGHT - 6} className="fill-muted-foreground text-[11px] capitalize">
                    {month(first)}
                  </text>
                </g>
              );
            })}

            <line x1={0} x2={plotWidth} y1={y(quota)} y2={y(quota)} stroke={LINES.quota.color} strokeDasharray={LINES.quota.dash} />
            <text {...LABEL} x={plotWidth} y={y(quota) - 6} textAnchor="end" className="fill-soft text-[11px]">
              {t("forecast.chart.quota")} {compactMoney(quota)}
            </text>

            {closedLine && <path d={`${closedLine}V${y(0)}H${x(0)}Z`} fill="var(--status)" fillOpacity={0.1} />}
            <LinePath line="bestCase" d={stepPath(series.bestCase, days, x, y)} />
            <LinePath line="commit" d={stepPath(series.commit, days, x, y)} />
            {closedLine && <LinePath line="closed" d={closedLine} />}

            {showToday && (
              <g>
                <line x1={x(elapsed)} x2={x(elapsed)} y1={PAD.top - 4} y2={HEIGHT - PAD.bottom} stroke="var(--subtle)" strokeDasharray="2 3" />
                <text
                  {...LABEL}
                  x={x(elapsed)}
                  y={PAD.top - 9}
                  textAnchor={elapsed / days > 0.9 ? "end" : elapsed / days < 0.1 ? "start" : "middle"}
                  className="fill-soft text-[11px]"
                >
                  {t("forecast.chart.today")}
                </text>
              </g>
            )}

            {hoverDay !== null && (
              <line x1={x(hoverDay + 0.5)} x2={x(hoverDay + 0.5)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#4a4a4a" />
            )}
          </svg>
        )}

        {hoverDay !== null && (
          <div
            aria-hidden
            className="type-caption pointer-events-none absolute top-6 z-10 flex min-w-[160px] flex-col gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#1f1f1f] px-2.5 py-2 shadow-overlay"
            style={x(hoverDay) > plotWidth * 0.6 ? { right: width - x(hoverDay) + 12 } : { left: x(hoverDay + 1) + 12 }}
          >
            <p className="text-soft">{date(addDays(quarter.start, hoverDay))}</p>
            {hoverDay < elapsed ? (
              <TooltipRow line="closed" label={t("forecast.chart.closed")} value={money(valueAt(series.closed, hoverDay))} />
            ) : (
              <>
                <TooltipRow line="commit" label={t("forecast.chart.commit")} value={money(valueAt(series.commit, hoverDay))} />
                <TooltipRow line="bestCase" label={t("forecast.chart.bestCase")} value={money(valueAt(series.bestCase, hoverDay))} />
              </>
            )}
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="type-caption w-fit cursor-pointer text-soft outline-none select-none hover:text-foreground focus-visible:underline">
          {t("forecast.chart.showData")}
        </summary>
        <div className="relative mt-3 overflow-x-auto">
          <table className="type-caption w-full min-w-[440px] border-separate border-spacing-0 tabular-nums">
            <caption className="sr-only">{t("forecast.chart.caption", { quarter: quarterLabel })}</caption>
            <thead>
              <tr className="text-muted-foreground">
                <th scope="col" className="py-2 pr-4 text-left font-normal">
                  {t("forecast.chart.week")}
                </th>
                {(["closed", "commit", "bestCase"] as const).map((line) => (
                  <th key={line} scope="col" className="py-2 pl-4 text-right font-normal">
                    {t(`forecast.chart.${line}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.start}>
                  <th scope="row" className="border-t py-2 pr-4 text-left font-normal text-soft">
                    {date(row.start)}
                  </th>
                  <td className="border-t py-2 pl-4 text-right">{cell(row.closed)}</td>
                  <td className="border-t py-2 pl-4 text-right">{cell(row.commit)}</td>
                  <td className="border-t py-2 pl-4 text-right">{cell(row.bestCase)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function TooltipRow({ line, label, value }: { line: Line; label: string; value: string }) {
  return (
    <p className="flex items-center gap-2">
      <Swatch line={line} />
      <span className="text-soft">{label}</span>
      <span className="ml-auto pl-3 tabular-nums">{value}</span>
    </p>
  );
}
