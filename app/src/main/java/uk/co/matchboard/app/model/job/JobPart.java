package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import java.util.List;

public record JobPart(int jobPartId, int productId, int quantity, boolean fromCallOff,
                      boolean materialAvailable, OffsetDateTime scheduleFor, List<JobPartPhase> phases,
                      List<JobPartParam> params,
                      int status) {

}
