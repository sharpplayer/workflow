package uk.co.matchboard.app.model.product;

import java.util.Map;

public record PhaseSignOff(String user, String password, boolean pin, String role, Map<Integer, String> paramData) {

}
