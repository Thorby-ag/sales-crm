"use client";

import { useTranslations } from "next-intl";
import { personByName } from "@/lib/data/people";
import { bestCaseForecast, commitForecast, shareOfQuota, type RepForecast } from "@/lib/forecast";
import { cn } from "@/lib/utils";
import { Avatar } from "../visuals/avatar";
import { Money } from "../visuals/money";
import { CARD } from "./styles";

const TH = "border-b py-2.5 font-normal whitespace-nowrap";
const TD = "border-b py-2.5 group-last:border-b-0";

/** Won, Commit and Best case against the quota: a bar per rep. */
function AttainmentBar({ rep }: { rep: RepForecast }) {
  const commit = commitForecast(rep);
  const bestCase = bestCaseForecast(rep);
  const scale = Math.max(rep.quota, bestCase, 1);
  const width = (value: number) => `${Math.min(100, (value / scale) * 100)}%`;
  return (
    <span aria-hidden className="relative block h-2 min-w-[96px] flex-1 overflow-hidden rounded-full bg-[#2c2c2c]">
      <span className="absolute inset-y-0 left-0 bg-warning/75" style={{ width: width(bestCase) }} />
      <span className="absolute inset-y-0 left-0 bg-commit" style={{ width: width(commit) }} />
      <span className="absolute inset-y-0 left-0 bg-status" style={{ width: width(rep.closed) }} />
      {rep.quota < scale && <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: width(rep.quota) }} />}
    </span>
  );
}

export function RepTable({ reps, quarterLabel, onSelect }: { reps: RepForecast[]; quarterLabel: string; onSelect: (owner: string) => void }) {
  const t = useTranslations();
  return (
    <section aria-labelledby="forecast-reps-title" className={CARD}>
      <h2 id="forecast-reps-title" className="type-lead px-4 pt-4 pb-2 font-medium">
        {t("forecast.reps.title")}
      </h2>
      <div className="relative overflow-x-auto">
        <table className="type-lead w-full min-w-[760px] border-separate border-spacing-0">
          <caption className="sr-only">{t("forecast.reps.caption", { quarter: quarterLabel })}</caption>
          <thead className="type-caption text-muted-foreground">
            <tr>
              <th scope="col" className={cn(TH, "px-4 text-left")}>
                {t("forecast.reps.rep")}
              </th>
              <th scope="col" className={cn(TH, "px-3 text-right")}>
                {t("forecast.reps.quota")}
              </th>
              <th scope="col" className={cn(TH, "px-3 text-right")}>
                {t("forecast.reps.closed")}
              </th>
              <th scope="col" className={cn(TH, "px-3 text-right")}>
                {t("forecast.reps.commit")}
              </th>
              <th scope="col" className={cn(TH, "px-3 text-right")}>
                {t("forecast.reps.bestCase")}
              </th>
              <th scope="col" className={cn(TH, "w-[30%] px-4 text-left")}>
                {t("forecast.reps.attainment")}
              </th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep) => {
              const person = personByName(rep.owner);
              const share = shareOfQuota(commitForecast(rep), rep.quota);
              return (
                <tr key={rep.owner} className="group">
                  <th scope="row" className={cn(TD, "px-4 text-left font-normal")}>
                    <button
                      type="button"
                      onClick={() => onSelect(rep.owner)}
                      title={t("forecast.reps.filter", { name: rep.owner })}
                      className="-ml-1 flex items-center gap-2 rounded-full py-0.5 pr-2 pl-1 whitespace-nowrap outline-none transition-colors hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-white/25"
                    >
                      <Avatar src={person.avatar} size={20} />
                      {rep.owner}
                    </button>
                  </th>
                  <td className={cn(TD, "px-3 text-right text-soft")}>
                    <Money value={rep.quota} />
                  </td>
                  <td className={cn(TD, "px-3 text-right")}>
                    <Money value={rep.closed} />
                  </td>
                  <td className={cn(TD, "px-3 text-right")}>
                    <Money value={commitForecast(rep)} />
                  </td>
                  <td className={cn(TD, "px-3 text-right")}>
                    <Money value={bestCaseForecast(rep)} />
                  </td>
                  <td className={cn(TD, "px-4")}>
                    <div className="flex items-center gap-3">
                      <AttainmentBar rep={rep} />
                      <span className="w-11 text-right tabular-nums">{share === null ? t("common.noValue") : `${share}%`}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
