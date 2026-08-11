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

// Static styles — defined once outside the component so they aren't
// recreated on every render.
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
  // Start with today's date already correct (no blank flash on first render)
  const [today, setToday] = useState(formatToday);

  // Refresh once a minute, so the date updates if left open past midnight
  useEffect(() => {
    const interval = setInterval(() => {
      setToday(formatToday());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    // 3-column layout: title (left) | Dropdown (center) | date (right)
    <header slot="header" style={styles.header}>
      <span style={styles.title}>MMSP Land</span>

      <Dropdown />

      <span style={styles.date}>{today}</span>
    </header>
  );
}