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
          <span className="italic">
            k<sub>B</sub>T
          </span>
          ):
        </div>
        <span className="ml-1">
          {energy.toFixed(3)}
          <span className="text-xs">
            <span className="mx-1">&plusmn;</span>
            {stdevEnergy.toFixed(2)}
          </span>
        </span>
      </div>
      <div className="flex" title="±sqrt(3(T-Tc)/Tc) at T ~ Tc, h = 0">
        <div className="w-36">
          Magnetization (<span className="italic">M</span>):
        </div>
        <span className="ml-1">
          {magnetization.toFixed(3)}
          <span className="text-xs">
            <span className="mx-1">&plusmn;</span>
            {stdevMagnetization.toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
