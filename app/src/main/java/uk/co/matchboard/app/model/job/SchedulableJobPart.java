package uk.co.matchboard.app.model.job;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SchedulableJobPart(int jobPartId, int jobId, long jobNumber, String product,
                                 String oldName,
                                 int machineId, int quantity,
                                 int stepNumber, int length, int width, int thickness,
                                 int partStatus, int jobStatus,
                                 int partNo, int jobParts, OffsetDateTime dueDate,
                                 int timeOnMachineSeconds, int timeForPacksSeconds,
                                 int steps, int productId) {

}
