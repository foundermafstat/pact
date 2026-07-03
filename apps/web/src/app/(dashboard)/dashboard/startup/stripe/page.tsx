import { RoleGate } from "@/components/auth/role-gate";
import { FounderStripeProofWorkspace } from "@/features/marketplace/founder-stripe-proof-workspace";

export default function StartupStripeProofPage() {
  return (
    <RoleGate roles={["Project"]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Stripe MRR proof</h1>
          <p className="text-sm text-muted-foreground">
            Login with Stripe test mode, generate an MRR snapshot, prove the threshold and release a tranche.
          </p>
        </div>
        <FounderStripeProofWorkspace />
      </div>
    </RoleGate>
  );
}
