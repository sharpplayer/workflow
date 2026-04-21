package uk.co.matchboard.app.model.job;

public enum PhaseStatus {
    INITIALISED(1),
    MATCHED(2),
    UNMATCHED(3);

    private final int code;

    PhaseStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static PhaseStatus fromCode(int code) {
        for (PhaseStatus status : PhaseStatus.values()) {
            if (status.code == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown PhaseStatus code: " + code);
    }
}
