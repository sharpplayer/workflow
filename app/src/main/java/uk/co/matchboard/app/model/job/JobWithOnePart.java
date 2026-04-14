package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import java.util.List;
import uk.co.matchboard.app.model.product.Product;

public record JobWithOnePart(int id, long number, OffsetDateTime due, Integer customer,
                             Integer carrier,
                             boolean callOff, JobPart part, int status, boolean paymentReceived,
                             int partNumber, int parts, Product product) {

}
