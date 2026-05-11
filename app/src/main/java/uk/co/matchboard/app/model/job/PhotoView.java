package uk.co.matchboard.app.model.job;

import org.springframework.core.io.UrlResource;

public record PhotoView(UrlResource resource, String mediaType) {

}
