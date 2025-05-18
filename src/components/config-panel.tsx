"use client";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export default function ConfigPanel({
  betaJ,
  betaH,
}: {
  betaJ: number;
  betaH: number;
}) {
  const router = useRouter();

  // Single shared debounced callback for both parameters
  const handleParameterChange = useDebouncedCallback(
    (name: "beta_j" | "beta_h", value: string) => {
      switch (name) {
        case "beta_j":
          router.replace(
            `/${parseFloat(value).toFixed(1)}/${betaH.toFixed(1)}`
          );
          break;
        case "beta_h":
          router.replace(
            `/${betaJ.toFixed(1)}/${parseFloat(value).toFixed(1)}`
          );
          break;
        default:
          const _never: never = name;
          throw new Error(`Unexpected parameter name: ${_never}`);
      }
    },
    300
  );
  return (
    <form className="text-sm mb-2">
      <div className="mb-4">Parameters:</div>
      <div>
        <label className="block text-sm font-medium mb-1">
          J/k<sub>B</sub>T: {betaJ.toFixed(1)}
        </label>
        <input
          type="range"
          name="betaJ"
          min="-0.5"
          max="0.5"
          step="0.1"
          onChange={(e) => handleParameterChange("beta_j", e.target.value)}
          defaultValue={betaJ}
          className="w-full"
        />
        <div className="text-xs text-gray-400 mb-4">
          (Critical point ≈ 0.22)
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          h/k<sub>B</sub>T: {betaH.toFixed(1)}
        </label>
        <input
          type="range"
          name="betaH"
          min="-0.2"
          max="0.2"
          step="0.1"
          onChange={(e) => handleParameterChange("beta_h", e.target.value)}
          defaultValue={betaH}
          className="w-full"
        />
      </div>
    </form>
  );
}
