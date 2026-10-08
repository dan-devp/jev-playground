package com.devp.jevplay.api;

import java.util.List;

import com.devp.jevplay.api.PlaygroundDtos.BatchItem;
import com.devp.jevplay.api.PlaygroundDtos.BatchRequest;
import com.devp.jevplay.api.PlaygroundDtos.CompositeRequest;
import com.devp.jevplay.api.PlaygroundDtos.CompositeResult;
import com.devp.jevplay.api.PlaygroundDtos.ConsistencyRequest;
import com.devp.jevplay.api.PlaygroundDtos.ConsistencyResult;
import com.devp.jevplay.api.PlaygroundDtos.GateRequest;
import com.devp.jevplay.api.PlaygroundDtos.GateResult;
import com.devp.jevplay.api.PlaygroundDtos.ModelsResult;
import com.devp.jevplay.api.PlaygroundDtos.RunRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PlaygroundController {

	private final PlaygroundService service;

	public PlaygroundController(PlaygroundService service) {
		this.service = service;
	}

	@GetMapping("/models")
	public ModelsResult models() {
		return this.service.models();
	}

	@PostMapping("/system-one")
	public SystemOneResult run(@Valid @RequestBody RunRequest request) {
		return this.service.run(request);
	}

	@PostMapping("/batch")
	public List<BatchItem> batch(@Valid @RequestBody BatchRequest request) {
		return this.service.batch(request);
	}

	@PostMapping("/consistency")
	public ConsistencyResult consistency(@Valid @RequestBody ConsistencyRequest request) {
		return this.service.consistency(request);
	}

	@PostMapping("/confidence-gate")
	public GateResult gate(@Valid @RequestBody GateRequest request) {
		return this.service.gate(request);
	}

	@PostMapping("/composite")
	public CompositeResult composite(@Valid @RequestBody CompositeRequest request) {
		return this.service.composite(request);
	}

}
