import { DigitRoll } from "@/components/life/digit-roll";

export interface Reading {
  /** 英文标签，mono 全大写，像进口仪器 */
  label: string;
  value: string;
  /** 中文说明，可选 */
  unit?: string;
  /** 没有数据源时显示 NOT AVAILABLE，不显示 0 */
  available: boolean;
}

/**
 * 观测条：页面头部下方一整条读数。
 * 它是首页唯一的横幅，也是 --data 唯一大面积出现的地方。
 *
 * 没有数据源时只显示 NOT AVAILABLE，不显示 0、不显示占位数字——
 * 一个假的 0 比一句「取不到」更糟。
 */
export function ObservBar({ readings }: { readings: Reading[] }) {
  return (
    <dl className="grid grid-cols-2 divide-y divide-rule border-b border-rule sm:grid-cols-5 sm:divide-x sm:divide-y-0">
      {/* 手机奇数格贴齐左缘；桌面所有格统一 px-3，只有首格归零 */}
      {readings.map((r) => (
        <div key={r.label} className="px-3 py-4 max-sm:odd:pl-0 sm:first:pl-0">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {r.label}
          </dt>
          <dd className="mt-1.5">
            {r.available ? (
              <>
                <span className="sr-only">{r.value}</span>
                <span className="font-mono text-[24px] leading-none tabular-nums text-data">
                  <DigitRoll text={r.value} />
                </span>
              </>
            ) : (
              <span className="font-mono text-[11px] leading-none text-muted-foreground">
                NOT AVAILABLE
              </span>
            )}
            {r.available && r.unit && (
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                {r.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
