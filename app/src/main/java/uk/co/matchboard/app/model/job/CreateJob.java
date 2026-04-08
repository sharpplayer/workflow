package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import java.util.List;

public record CreateJob(OffsetDateTime due, Integer customer, Integer carrier, boolean callOff,
                        List<CreateJobPart> parts) {

}
