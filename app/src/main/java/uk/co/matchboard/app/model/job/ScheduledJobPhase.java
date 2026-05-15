package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record ScheduledJobPhase(int jobId, long jobNumber, int jobParts, int jobPartId,
                                int partNumber, String name, String oldName, int quantity,
                                int status, String phaseDescription, int jobPartPhaseId,
                                int phaseNumber,
                                String specialInstruction,
                                int phaseStatus,
                                OffsetDateTime plannedStartAt,
                                OffsetDateTime actualStartAt) {

}

