import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Post } from "@nestjs/common";

import { ReserveStreamDto } from "../dto";
import { StreamReservation } from "../domain";
import { StreamReservationService } from "../services";

/**
 * Publish-side API for the ingest cluster: reserve a load-balanced slot and get back the
 * coordinates to publish to. The sync loop relays the stream once media arrives.
 */
@ApiTags("ingest")
@Controller("api/ingest/streams")
export class IngestController {
    constructor(private readonly reservations: StreamReservationService) {}

    @Post()
    reserve(@Body() dto: ReserveStreamDto): Promise<StreamReservation> {
        return this.reservations.reserve(dto.name);
    }
}
