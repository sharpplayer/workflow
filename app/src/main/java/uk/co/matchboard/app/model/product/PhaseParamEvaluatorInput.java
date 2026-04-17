package uk.co.matchboard.app.model.product;

import uk.co.matchboard.app.functional.OptionalResult;

public record PhaseParamEvaluatorInput(OptionalResult<Product> product, String paramConfig,
                                       int input, boolean perPack) {

}
