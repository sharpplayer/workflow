package uk.co.matchboard.app.model.job;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record CreateScheduledJobPart(int jobId, int jobPartId, int machineId, int stepNumber,
                                     int quantity, BigDecimal setupMinutes, BigDecimal plannedMinutes,
                                     OffsetDateTime plannedStartAt,
                                     OffsetDateTime plannedFinishAt,
                                     LocalDate scheduledDate,
                                     int position, int productId) {

}
