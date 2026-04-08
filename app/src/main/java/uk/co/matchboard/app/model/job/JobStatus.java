package uk.co.matchboard.app.model.job;

public enum JobStatus {
    SAVED(1),
    READY(2),
    PARTIALLY_SCHEDULABLE(3),
    SCHEDULABLE(4),
    PARTIALLY_SCHEDULED(5),
    SCHEDULED(6),
    COMPLETED(7),
    PARTIALLY_COMPLETED(8),
    AWAITING(9),
    STARTED(10);

    private final int code;

    JobStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static JobStatus fromCode(int code) {
        for (JobStatus status : JobStatus.values()) {
            if (status.code == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown JobStatus code: " + code);
    }
}