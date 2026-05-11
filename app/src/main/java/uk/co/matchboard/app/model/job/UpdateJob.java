package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import java.util.List;

public record UpdateJob(int jobId, OffsetDateTime due, Integer customer, Integer carrier, boolean callOff,
                        OffsetDateTime paymentConfirmed,
                        List<CreateJobPart> parts) {

}
