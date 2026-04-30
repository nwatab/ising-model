export default function StatisticalInfo({
  energyPerSite,
  magnetization,
  neelOrderParam,
  sweeps,
  phase,
}: {
  energyPerSite: number;
  magnetization: number;
  neelOrderParam: number;
  sweeps: number;
  phase: string;
}) {
  return (
    <div className="text-sm mt-4 space-y-1">
      <h2 className="text-base sm:text-lg font-bold mb-2">Statistics</h2>
      <div className="flex justify-between ml-2">
        <span className="font-medium">Phase:</span>
        <span className="text-orange-300">{phase}</span>
      </div>
      <div className="flex justify-between ml-2">
        <span className="font-medium">Energy per site:</span>
        <span>
          {energyPerSite.toFixed(4)}{" "}
          <span className="text-gray-400 text-xs">|J<sub>1</sub>|</span>
        </span>
      </div>
      <div className="flex justify-between ml-2">
        <span className="font-medium">M:</span>
        <span>{magnetization.toFixed(4)}</span>
      </div>
      <div className="flex justify-between ml-2">
        <span className="font-medium">M<sub>AFM</sub>:</span>
        <span>{(neelOrderParam ?? 0).toFixed(4)}</span>
      </div>
      <div className="flex justify-between ml-2">
        <span className="font-medium">Sweeps:</span>
        <span>{sweeps}</span>
      </div>
    </div>
  );
}
