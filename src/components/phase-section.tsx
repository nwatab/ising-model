import { CRITICAL_BETA_J } from "@/constants";

export default function PhaseSection({ betaJ }: { betaJ: number }) {
  return (
    <>
      <h2 className="text-base sm:text-lg font-bold mb-2 mt-4">Phase</h2>
      <div className="mb-4 ml-2">
        <p>
          {Math.abs(betaJ) < CRITICAL_BETA_J
            ? "Paramagnetism"
            : Math.abs(betaJ) === CRITICAL_BETA_J
              ? "Critical"
              : betaJ < 0
                ? "Antiferromagnetism"
                : "Ferromagnetism"}
        </p>
      </div>
    </>
  );
}
