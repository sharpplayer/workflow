package uk.co.matchboard.app.model.job;

public record ScheduledJobPhase(int jobId, long jobNumber, int jobParts, int jobPartId,
                                int partNumber, String name, String oldName, int quantity,
                                int status, String phaseDescription, int jobPartPhaseId,
                                int phaseNumber,
                                String specialInstruction,
                                int phaseStatus) {

}

