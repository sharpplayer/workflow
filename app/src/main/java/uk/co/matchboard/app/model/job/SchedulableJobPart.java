package uk.co.matchboard.app.model.job;

public record SchedulableJobPart(int jobPartId, String product, String oldName, int quantity,
                                 boolean fromCallOff,
                                 int jobId, long jobNumber, int partStatus, int jobStatus,
                                 int partNo, int jobParts, Integer order) {

}
