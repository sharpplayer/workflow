package uk.co.matchboard.app.model.job;

public record SchedulableJobPhase(long jobNumber, int jobParts, int jobPartId,
                                  int partNumber, String name, String oldName, int quantity,
                                  int status, String phaseDescription, int phaseNumber,
                                  String specialInstruction,
                                  int phaseStatus) {

}

