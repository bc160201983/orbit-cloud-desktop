import { useState } from "react";
export function calculate(expression: string): number {
  const tokens = expression.match(/(?:\d*\.)?\d+|[+\-*/()]/g) || [];
  if (tokens.join("") !== expression.replace(/\s/g, ""))
    throw Error("Invalid expression");
  let i = 0;
  const atom = (): number => {
    const t = tokens[i++];
    if (t === "-") return -atom();
    if (t === "+") return atom();
    if (t === "(") {
      const n = sum();
      if (tokens[i++] !== ")") throw Error("Missing parenthesis");
      return n;
    }
    if (t === undefined || !/^\d|^\./.test(t))
      throw Error("Invalid expression");
    return Number(t);
  };
  const product = (): number => {
    let n = atom();
    while (tokens[i] === "*" || tokens[i] === "/") {
      const op = tokens[i++];
      const rhs = atom();
      n = op === "*" ? n * rhs : n / rhs;
    }
    return n;
  };
  const sum = (): number => {
    let n = product();
    while (tokens[i] === "+" || tokens[i] === "-") {
      const op = tokens[i++];
      const rhs = product();
      n = op === "+" ? n + rhs : n - rhs;
    }
    return n;
  };
  const n = sum();
  if (i < tokens.length || !Number.isFinite(n)) throw Error("Cannot calculate");
  return Number(n.toPrecision(12));
}
export default function Calculator() {
  const [value, setValue] = useState("0");
  const [previous, setPrevious] = useState("");
  const [finished, setFinished] = useState(false);
  const press = (k: string) => {
    if (k === "AC") {
      setValue("0");
      setPrevious("");
      return;
    }
    if (k === "⌫") {
      setValue((v) => (v.length > 1 ? v.slice(0, -1) : "0"));
      return;
    }
    if (k === "=") {
      try {
        setPrevious(value + " =");
        setValue(
          String(calculate(value.replace(/×/g, "*").replace(/÷/g, "/"))),
        );
        setFinished(true);
      } catch {
        setValue("Error");
        setFinished(true);
      }
      return;
    }
    if (k === "%") {
      try {
        setValue(String(calculate(value) / 100));
      } catch {
        setValue("Error");
      }
      return;
    }
    setValue(
      (v) =>
        (v === "0" ||
        v === "Error" ||
        (finished && !["+", "−", "×", "÷"].includes(k))
          ? ""
          : v) + (k === "−" ? "-" : k),
    );
    setFinished(false);
  };
  return (
    <div className="calculator-app">
      <div className="eyebrow">STANDARD</div>
      <div className="calc-output">
        <small>{previous || "A little clarity."}</small>
        <span>{value}</span>
      </div>
      <div className="calc-keys">
        {[
          "AC",
          "⌫",
          "%",
          "÷",
          "7",
          "8",
          "9",
          "×",
          "4",
          "5",
          "6",
          "−",
          "1",
          "2",
          "3",
          "+",
          "0",
          ".",
          "=",
        ].map((k) => (
          <button
            key={k}
            className={`${k === "0" ? "zero" : ""} ${k === "=" ? "equals" : ""} ${["÷", "×", "−", "+"].includes(k) ? "operator" : ""}`}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
