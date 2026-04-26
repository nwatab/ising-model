import { T_STAR_CRITICAL } from "@/constants";

export default function PhaseSection({
  tStar,
  jSign,
}: {
  tStar: number;
  jSign: 1 | -1;
}) {
  const phase =
    tStar > T_STAR_CRITICAL
      ? "Paramagnetism"
      : tStar < T_STAR_CRITICAL
        ? jSign > 0
          ? "Ferromagnetism"
          : "Antiferromagnetism"
        : "Critical";

  return (
    <>
      <h2 className="text-base sm:text-lg font-bold mb-2 mt-4">Phase</h2>
      <div className="mb-4 ml-2">
        <p>{phase}</p>
      </div>
    </>
  );
}
