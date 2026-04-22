package uk.co.matchboard.app.model.job;

public enum ParamStatus {
    INITIALISED(1),
    MATCHED(2),
    UNMATCHED(3);

    private final int code;

    ParamStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static ParamStatus fromCode(int code) {
        for (ParamStatus status : ParamStatus.values()) {
            if (status.code == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown PhaseStatus code: " + code);
    }
}
