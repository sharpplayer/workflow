package uk.co.matchboard.app.model.wastage;

public record CreateWastage(
        int jobPhaseId,
        int rpi,
        int quantity,
        String reportedBy,
        String reason) {

}
