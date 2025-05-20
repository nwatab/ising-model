import { decomposeToScientific } from "@/utils";

function ShowScientific({ value, error }: { value: number; error: number }) {
  const [co, errCo, pow] = decomposeToScientific(value, error);
  if (pow === 0) {
    return (
      <span className="ml-1">
        {co.toFixed(3)}
        <span className="text-xs">
          <span className="mx-1">&plusmn;</span>
          {errCo.toFixed(2)}
        </span>
      </span>
    );
  }
  return (
    <span className="ml-1">
      ({co.toFixed(2)}
      <span className="text-xs">
        <span className="mx-1">&plusmn;</span>
        {errCo.toFixed(2)}
      </span>
      ) &times; 10<sup>{pow}</sup>
    </span>
  );
}

export default function StatisticalInfo({
  energy,
  magnetization,
  stdevEnergy,
  stdevMagnetization,
}: {
  energy: number;
  magnetization: number;
  stdevEnergy: number;
  stdevMagnetization: number;
}) {
  return (
    <div className="text-sm mt-8 space-y-4">
      <h2 className="text-lg font-bold mb-4">Statistics</h2>
      <div className="flex">
        <div className="w-36">
          Energy (<span className="italic">E</span>/
          <span className="italic">k</span>
          <sub>B</sub>
          <span className="italic">T</span>
          ):
        </div>
        <ShowScientific value={energy} error={stdevEnergy} />
      </div>
      <div className="flex" title="±sqrt(3(T-Tc)/Tc) at T ~ Tc, h = 0">
        <div className="w-36">
          Magnetization (<span className="italic">M</span>):
        </div>
        <ShowScientific value={magnetization} error={stdevMagnetization} />
      </div>
    </div>
  );
}
