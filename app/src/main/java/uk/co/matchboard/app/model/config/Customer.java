package uk.co.matchboard.app.model.config;

public record Customer(int id, String code, String name, String zone, String contact,
                       String contactNumber, boolean proforma, boolean enabled) {

}
