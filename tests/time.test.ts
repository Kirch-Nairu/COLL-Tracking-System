import { describe, expect, it } from "vitest";
import { classifyAttendance, localDateAndTime } from "../src/server/lib/time";

describe("attendance classification", () => {
  it("marks scans at or before the threshold as PRESENT", () => {
    expect(classifyAttendance("08:03", "08:15")).toBe("PRESENT");
    expect(classifyAttendance("08:15", "08:15")).toBe("PRESENT");
  });

  it("marks scans after the threshold as LATE", () => {
    expect(classifyAttendance("08:16", "08:15")).toBe("LATE");
  });

  it("formats the Philippines local date/time deterministically", () => {
    expect(localDateAndTime(new Date("2026-09-04T00:04:00.000Z"), "Asia/Manila")).toEqual({
      date: "2026-09-04",
      time: "08:04"
    });
  });
});
