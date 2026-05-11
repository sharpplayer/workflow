package uk.co.matchboard.app.model.job;

import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;

public record PhotoView(UrlResource resource, String mediaType) {

}
