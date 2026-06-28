import { NodeResourceSample, RuntimeAlertRule } from "@/common";

import { NodeResourceAlertContext } from "./node-resource-alert-context.types";

/** Resource rules over a pod's self-reported host usage (source: node). */
export type NodeResourceAlertRule = RuntimeAlertRule<NodeResourceSample, NodeResourceAlertContext>;
