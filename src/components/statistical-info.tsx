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
    <div className="text-sm mt-4 space-y-2">
      <div>
        Energy (<span className="italic">E</span>/
        <span className="italic">
          k<sub>B</sub>T
        </span>
        ):
        <span className="ml-1">
          {energy.toFixed(3)}
          <span className="text-xs">
            <span className="mx-1">&plusmn;</span>
            {stdevEnergy.toFixed(2)}
          </span>
        </span>
      </div>
      <div title="±sqrt(3(T-Tc)/Tc) at T ~ Tc, h = 0">
        Magnetization (<span className="italic">M</span>):
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
