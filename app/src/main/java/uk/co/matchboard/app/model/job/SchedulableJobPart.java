package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record SchedulableJobPart(int jobPartId, int jobId, long jobNumber, String product,
                                 String oldName,
                                 int machineId, int quantity,
                                 int stepNumber, int length, int width, int thickness,
                                 String edge, String pitch, String profile,
                                 int partStatus, int jobStatus,
                                 int partNo, int jobParts, OffsetDateTime dueDate,
                                 int timeOnMachineSeconds, int timeForPacksSeconds,
                                 int steps, int productId) {

}
