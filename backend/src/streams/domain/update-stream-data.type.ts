import { StreamStatus } from "../../common/domain";

export interface UpdateStreamData {
    source?: string;
    isEnabled?: boolean;
    status?: StreamStatus;
}
