package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import uk.co.matchboard.app.model.config.Carrier;
import uk.co.matchboard.app.model.config.Customer;
import uk.co.matchboard.app.model.product.Product;

public record JobWithOnePart(int id, long number, OffsetDateTime due,
                             boolean callOff, JobPart part, int status, boolean paymentReceived,
                             int partNumber, int parts, Product product, Customer customer,
                             Carrier carrier) {

}
