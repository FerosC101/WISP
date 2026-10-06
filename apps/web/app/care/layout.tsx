import { Suspense } from "react";
import { WispLine } from "@/components/WispLine";

// Care pages read the check they're about from `?s=`, which needs a Suspense boundary.
export default function CareLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="py-20" aria-busy>
          <WispLine variant="flow" className="mx-auto h-8 w-48 text-teal" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
