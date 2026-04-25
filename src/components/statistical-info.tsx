export default function StatisticalInfo({
  betaEnergyPerSite,
  magnetization,
  sweeps,
}: {
  betaEnergyPerSite: number;
  magnetization: number;
  sweeps: number;
}) {
  return (
    <div className="text-sm mt-4 space-y-1">
      <h2 className="text-base sm:text-lg font-bold mb-2">Statistics</h2>
      <div className="flex flex-col sm:flex-row sm:justify-between ml-2">
        <div className="font-medium mb-1 sm:mb-0">
          <span className="italic">βE</span> per site:
        </div>
        <div>{betaEnergyPerSite.toFixed(4)}</div>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between ml-2">
        <div className="font-medium mb-1 sm:mb-0">
          Magnetization (<span className="italic">M</span>):
        </div>
        <div>{magnetization.toFixed(4)}</div>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between ml-2">
        <div className="font-medium mb-1 sm:mb-0">Sweeps:</div>
        <div>{sweeps}</div>
      </div>
    </div>
  );
}
