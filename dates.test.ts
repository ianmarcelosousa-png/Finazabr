import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysBetween,
  daysInMonth,
  formatDateOnly,
  monthRange,
  occurrenceDate,
  parseDateOnly,
} from "../../src/lib/dates.js";

describe("parseDateOnly / formatDateOnly", () => {
  it("não desloca o dia por causa de fuso horário", () => {
    // O bug clássico: `new Date("2026-08-05")` no Brasil (UTC-3) vira 04/08.
    const date = parseDateOnly("2026-08-05");
    expect(date.getUTCDate()).toBe(5);
    expect(formatDateOnly(date)).toBe("2026-08-05");
  });

  it("faz ida e volta sem perder informação", () => {
    for (const value of ["2026-01-01", "2026-12-31", "2028-02-29"]) {
      expect(formatDateOnly(parseDateOnly(value))).toBe(value);
    }
  });
});

describe("monthRange", () => {
  it("cobre o mês inteiro com fim exclusivo", () => {
    const { start, endExclusive } = monthRange("2026-08");
    expect(formatDateOnly(start)).toBe("2026-08-01");
    expect(formatDateOnly(endExclusive)).toBe("2026-09-01");
  });

  it("vira o ano corretamente em dezembro", () => {
    const { endExclusive } = monthRange("2026-12");
    expect(formatDateOnly(endExclusive)).toBe("2027-01-01");
  });
});

describe("occurrenceDate", () => {
  it("limita o dia ao último dia existente do mês", () => {
    // "Todo dia 31" em fevereiro precisa cair no 28, não transbordar para março.
    expect(formatDateOnly(occurrenceDate("2026-02", 31))).toBe("2026-02-28");
    expect(formatDateOnly(occurrenceDate("2028-02", 31))).toBe("2028-02-29");
    expect(formatDateOnly(occurrenceDate("2026-04", 31))).toBe("2026-04-30");
    expect(formatDateOnly(occurrenceDate("2026-08", 31))).toBe("2026-08-31");
  });

  it("mantém o dia quando ele existe", () => {
    expect(formatDateOnly(occurrenceDate("2026-08", 5))).toBe("2026-08-05");
  });
});

describe("daysInMonth", () => {
  it("conhece fevereiro bissexto", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2026-01")).toBe(31);
  });
});

describe("addMonths", () => {
  it("atravessa a virada de ano nos dois sentidos", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-08", 6)).toBe("2027-02");
  });
});

describe("daysBetween", () => {
  it("conta dias inteiros, independente da ordem", () => {
    const a = parseDateOnly("2026-08-05");
    const b = parseDateOnly("2026-08-08");
    expect(daysBetween(a, b)).toBe(3);
    expect(daysBetween(b, a)).toBe(3);
  });
});
