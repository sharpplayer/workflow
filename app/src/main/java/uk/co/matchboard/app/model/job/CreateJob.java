package uk.co.matchboard.app.model.job;

import java.time.LocalDateTime;
import java.util.List;

public record CreateJob(LocalDateTime due, Integer customer, Integer carrier, boolean callOff, List<CreateJobPart> parts, int status) {

}
