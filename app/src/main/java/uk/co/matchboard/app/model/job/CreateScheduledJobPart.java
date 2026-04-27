package uk.co.matchboard.app.model.job;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record CreateScheduledJobPart(int jobId, int jobPartId, int machineId, int stepNumber,
                                     int quantity, int setupMinutes, int plannedMinutes,
                                     int breakMinutes, int packMinutes,
                                     OffsetDateTime plannedStartAt,
                                     OffsetDateTime plannedFinishAt,
                                     LocalDate scheduledDate,
                                     int position, int productId) {

}
