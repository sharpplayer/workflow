package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import java.util.List;

public record CreateJob(OffsetDateTime due, Integer customer, Integer carrier, boolean callOff, boolean paymentReceived,
                        List<CreateJobPart> parts) {

}
