"use client";

import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { attackCases } from "./attack-model";

export function AttackPanel() {
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
      {attackCases.map((attack) => (
        <Button
          key={attack.key}
          onClick={() => setResult(attack.expectedCode)}
          type="button"
          variant="outline"
        >
          {attack.label}
        </Button>
      ))}
      </div>
      {result ? (
        <Alert variant="destructive">
          <AlertTitle>Expected rejection</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
