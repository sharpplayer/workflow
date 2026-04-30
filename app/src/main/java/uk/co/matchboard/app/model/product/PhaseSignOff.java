package uk.co.matchboard.app.model.product;

import java.util.Map;
import uk.co.matchboard.app.model.user.CredentialsProvider;

public record PhaseSignOff(String user, String password, boolean pin, String role,
                           Map<Integer, String> paramData, Integer operationId, Integer rpi) implements
        CredentialsProvider {

}
