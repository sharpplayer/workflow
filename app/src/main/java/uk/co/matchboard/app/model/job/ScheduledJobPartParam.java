package uk.co.matchboard.app.model.job;

public record ScheduledJobPartParam(int jobId, long jobNumber, int jobParts, int jobPartId,
                                    int partNumber, String name, String oldName, int quantity,
                                    int status, String phaseDescription, int jobPartPhaseId,
                                    int jobPhaseId, int phaseNumber,
                                    String specialInstruction,
                                    int phaseStatus, Integer paramId, String paramName,
                                    String paramConfig,
                                    Integer paramInput) {

}

