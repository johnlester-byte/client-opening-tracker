import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "@/lib/client-hub";
import type { LocationStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: LocationStatus }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
