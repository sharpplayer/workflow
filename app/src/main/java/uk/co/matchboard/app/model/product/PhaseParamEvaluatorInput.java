package uk.co.matchboard.app.model.product;

public record PhaseParamEvaluatorInput(Product product, String paramConfig,
                                       int input, int quantity, Long pack) {

}
