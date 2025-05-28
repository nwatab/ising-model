import { decomposeToScientific } from "@/utils";

function ShowScientific({
  co,
  errCo,
  pow,
}: {
  co: number;
  errCo: number;
  pow: number;
}) {
  if (pow === 0) {
    return (
      <span className="ml-1">
        {co.toFixed(3)}
        <span className="text-xs align-middle">
          <span className="mx-1">&plusmn;</span>
          {errCo.toFixed(2)}
        </span>
      </span>
    );
  }
  return (
    <span className="ml-1">
      ({co.toFixed(1)}
      <span className="text-xs align-middle">
        <span className="mx-1">&plusmn;</span>
        {errCo.toFixed(2)}
      </span>
      ) &times; 10<sup>{pow}</sup>
    </span>
  );
}

export default function StatisticalInfo({
  energyPerSite,
  stdevEnergyPerSite,
  magnetization,
  stdevMagnetization,
}: {
  energyPerSite: number;
  stdevEnergyPerSite: number;
  magnetization: number;
  stdevMagnetization: number;
}) {
  const [energyPerSiteCo, energyPerSiteErr, energyPerSitePow] =
    decomposeToScientific(energyPerSite, stdevEnergyPerSite);
  const [magnetizationCo, stdevMagnetizationErr, magnetizationPow] =
    decomposeToScientific(magnetization, stdevMagnetization);
  return (
    <div className="text-sm mt-4 space-y-4">
      <h2 className="text-base sm:text-lg font-bold mb-2">Statistics</h2>
      <div className="flex flex-col sm:flex-row sm:justify-between ml-2">
        <div className="font-medium mb-1 sm:mb-0">
          <span className="italic">E</span>
          <span className="ml-1">per site</span>:
        </div>
        <div>
          <ShowScientific
            co={energyPerSiteCo}
            errCo={energyPerSiteErr}
            pow={energyPerSitePow - 23} // ^-23 comes from BOlTZMANN_CONSTANT
          />
          <span className="ml-1">[J]</span>
        </div>
      </div>
      <div
        className="flex flex-col sm:flex-row sm:justify-between ml-2"
        title="±sqrt(3(T-Tc)/Tc) at T ~ Tc, h = 0"
      >
        <div className="font-medium mb-1 sm:mb-0">
          Magnetization (<span className="italic">M</span>):
        </div>
        <div>
          <ShowScientific
            co={magnetizationCo}
            errCo={stdevMagnetizationErr}
            pow={magnetizationPow}
          />
        </div>
      </div>
    </div>
  );
}
