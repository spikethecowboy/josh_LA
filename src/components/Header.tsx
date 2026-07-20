import { useEffect, useState } from "react";
import Dropdown from "./Dropdown";

// Formats today's date, e.g. "July 8, 2026"
function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ----------------------------------------------------
// STYLES
// Static — don't depend on any props/state, so defined once outside the
// component instead of being recreated every render.
// ----------------------------------------------------

const styles = {
  header: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "12px 20px",
    backgroundColor: "#1c1c1c",
    borderBottom: "1px solid #3a3a3a",
    color: "#ffffff",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  },
  date: {
    fontSize: "13px",
    color: "#9a9a9a",
    whiteSpace: "nowrap",
    justifySelf: "end",
  },
} as const;

export default function Header() {
  // Initialized with formatToday() so the date is correct on first render.
  const [today, setToday] = useState(formatToday);

  // Re-check once a minute in case the date has rolled over
  // while the page has been left open.
  useEffect(() => {
    const interval = setInterval(() => {
      setToday(formatToday());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    // 3-column grid: title (left) | Dropdown (center) | date (right)
    <header slot="header" style={styles.header}>
      {/* Left: app title */}
      <span style={styles.title}>MMSP Land</span>

      {/* Center: package/type/station selector */}
      <Dropdown />

      {/* Right: live-updating current date */}
      <span style={styles.date}>{today}</span>
    </header>
  );
}