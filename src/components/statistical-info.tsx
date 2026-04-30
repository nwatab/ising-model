export default function StatisticalInfo({
  energyPerSite,
  magnetization,
  sweeps,
}: {
  energyPerSite: number;
  magnetization: number;
  sweeps: number;
}) {
  return (
    <div className="text-sm mt-4 space-y-1">
      <h2 className="text-base sm:text-lg font-bold mb-2">Statistics</h2>
      <div className="flex flex-col sm:flex-row sm:justify-between ml-2">
        <div className="font-medium mb-1 sm:mb-0">
          Energy per site:
        </div>
        <div>
          {energyPerSite.toFixed(4)}{" "}
          <span className="text-gray-400 text-xs">|J<sub>1</sub>|</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between ml-2">
        <div className="font-medium mb-1 sm:mb-0">
          Magnetization:
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
