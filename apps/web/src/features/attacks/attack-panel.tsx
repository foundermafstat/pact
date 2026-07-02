"use client";

import { useState } from "react";

import { attackCases } from "./attack-model";

export function AttackPanel() {
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="attack-panel">
      {attackCases.map((attack) => (
        <button
          className="secondary-button"
          key={attack.key}
          onClick={() => setResult(attack.expectedCode)}
          type="button"
        >
          {attack.label}
        </button>
      ))}
      {result ? <span className="error-text">Expected rejection: {result}</span> : null}
    </div>
  );
}
