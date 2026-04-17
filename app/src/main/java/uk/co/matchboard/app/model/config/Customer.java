package uk.co.matchboard.app.model.config;

public record Customer(int id, String code, String name, String zone, String contact,
                       String contactNumber, boolean proforma, boolean enabled) {

    public boolean equalsApartFromId(Customer e) {
        if (this == e) {
            return true;
        }
        if (e == null) {
            return false;
        }

        return java.util.Objects.equals(code, e.code)
                && java.util.Objects.equals(name, e.name)
                && java.util.Objects.equals(zone, e.zone)
                && java.util.Objects.equals(contact, e.contact)
                && java.util.Objects.equals(contactNumber, e.contactNumber)
                && proforma == e.proforma
                && enabled == e.enabled;
    }

    public Customer copyWithId(int id) {
        return new Customer(
                id,
                code,
                name,
                zone,
                contact,
                contactNumber,
                proforma,
                enabled
        );
    }
}
