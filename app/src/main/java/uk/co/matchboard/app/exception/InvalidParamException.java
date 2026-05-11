package uk.co.matchboard.app.exception;

public class InvalidParamException extends Exception {

    public InvalidParamException(int paramId, long jobNumber, int jobPart, int phaseNumber,
            String config) {
        super("Invalid param data combination: " + paramId + " " + jobNumber + " " + jobPart + " "
                + phaseNumber + " " + config);
    }
}
