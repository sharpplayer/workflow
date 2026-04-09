package uk.co.matchboard.app.model.job;

public record SchedulableJobPartParam(long jobNumber, int jobParts, int jobPartId,
                                      int partNumber, String name, String oldName, int quantity,
                                      int status, String phaseDescription, int phaseNumber,
                                      String specialInstruction,
                                      int phaseStatus, int paramId, String paramName,
                                      String paramConfig,
                                      int paramInput) {

}

