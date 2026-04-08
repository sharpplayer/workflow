package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import java.util.List;

public record CreateJobPart(int productId, int quantity, boolean fromCallOff,
                            boolean materialAvailable, OffsetDateTime scheduleFor,
                            List<CreateJobPartPhase> phases, List<CreateJobPartParam> params) {

}
