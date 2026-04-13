package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record SchedulableJobPart(int jobPartId, String product, String oldName, int quantity,
                                 boolean fromCallOff,
                                 int jobId, long jobNumber, int partStatus, int jobStatus,
                                 int partNo, int jobParts, Integer order, OffsetDateTime dueDate) {

}
