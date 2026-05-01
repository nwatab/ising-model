import { IsingPage } from "@/components/ising-page";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense>
      <IsingPage latticeSize={64} />
    </Suspense>
  );
}
