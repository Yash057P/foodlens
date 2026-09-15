import abc
import io
import logging
import time

DTYPE_ALIASES = {
    "float16": "float16",
    "fp16": "float16",
    "bfloat16": "bfloat16",
    "bf16": "bfloat16",
    "float32": "float32",
    "fp32": "float32",
}

logger = logging.getLogger(__name__)


def _import_local_deps():
    """Heavy torch/transformers deps are imported lazily so that the
    hf_api inference provider never pays their memory cost."""
    import torch  # noqa: F401
    from transformers import (  # noqa: F401
        AutoFeatureExtractor,
        AutoImageProcessor,
        AutoModelForImageClassification,
    )

    return torch, AutoFeatureExtractor, AutoImageProcessor, AutoModelForImageClassification


class HFInferenceError(Exception):
    """Raised when the hosted Hugging Face inference API is unavailable."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(f"HF inference error {status_code}: {message}")


class AIModelService(abc.ABC):
    """Base interface for AI image services.

    FoodClassificationService implements local inference; HFApiClassificationService
    uses the Hugging Face hosted inference API for the same model. Both produce the
    same (label, score) predictions.
    """

    @abc.abstractmethod
    def predict(self, image):
        raise NotImplementedError


class FoodClassificationService(AIModelService):
    """Local ViT image classifier for Food-101 food categories."""

    def __init__(self, model_id: str, device: str = "auto", dtype: str = "auto"):
        torch, AutoFeatureExtractor, AutoImageProcessor, AutoModelForImageClassification = _import_local_deps()
        self.model_id = model_id
        self.device = self._resolve_device(device)
        self.model_dtype = self._resolve_dtype(dtype)
        self.processor, self.model = self._load(
            model_id,
            AutoFeatureExtractor,
            AutoImageProcessor,
            AutoModelForImageClassification,
            self.model_dtype,
            low_cpu_mem_usage=self.device == "cpu",
        )
        self.model.to(self.device)
        self.model.eval()
        self.n_classes = self.model.config.num_labels
        self.id2label = {int(k): v for k, v in self.model.config.id2label.items()}
        logger.info(
            "Loaded food classifier '%s' on %s with %d classes (dtype=%s)",
            model_id,
            self.device,
            self.n_classes,
            self.model_dtype or "default",
        )

    @staticmethod
    def _resolve_device(device: str) -> str:
        if device == "auto":
            return "cuda" if _import_local_deps()[0].cuda.is_available() else "cpu"
        if device in {"cuda", "cpu"}:
            return device
        logger.warning("Unknown device '%s', falling back to cpu", device)
        return "cpu"

    @staticmethod
    def _resolve_dtype(dtype: str) -> str | None:
        if dtype in ("auto", "", None):
            return None
        key = dtype.strip().lower()
        resolved = DTYPE_ALIASES.get(key)
        if resolved:
            return resolved
        logger.warning("Unknown dtype '%s', using model default", dtype)
        return None

    @staticmethod
    def _load(
        model_id: str,
        AutoFeatureExtractor,
        AutoImageProcessor,
        AutoModelForImageClassification,
        model_dtype=None,
        low_cpu_mem_usage: bool = False,
    ):
        try:
            processor = AutoImageProcessor.from_pretrained(model_id)
        except Exception:
            processor = AutoFeatureExtractor.from_pretrained(model_id)
        kwargs = {"low_cpu_mem_usage": True} if low_cpu_mem_usage else {}
        if model_dtype:
            kwargs["torch_dtype"] = model_dtype
        model = AutoModelForImageClassification.from_pretrained(model_id, **kwargs)
        return processor, model

    def predict(self, image):
        """Run inference locally, returning (ranked, inference_ms).

        ranked: list of (label, score) tuples, descending by score, up to 3 entries.
        """
        from PIL import Image  # noqa: F401

        start = time.perf_counter()
        inputs = self.processor(images=image.convert("RGB"), return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with __import__("torch").no_grad():
            outputs = self.model(**inputs)
        probs = __import__("torch").softmax(outputs.logits[0], dim=-1)
        topk = __import__("torch").topk(probs, k=min(3, self.n_classes))
        ranked = [
            (self.id2label[int(idx.item())], float(score.item()))
            for score, idx in zip(topk.values, topk.indices)
        ]
        inference_ms = (time.perf_counter() - start) * 1000.0
        return ranked, inference_ms


class HFApiClassificationService(AIModelService):
    """Classifies via Hugging Face's hosted inference API for the SAME model id.

    This lets the backend run on tiny hosts (e.g. Render free 512 MB) because torch
    is never imported; predictions come from HF's serverless workers running the
    exact same checkpoint ('nateraw/food'), so labels and scores match the local path.
    """

    ROUTER_URL = "https://router.huggingface.co/hf-inference/models/{model_id}"
    MAX_RETRIES = 4

    def __init__(self, model_id: str, token: str = "", timeout: int = 180):
        import requests

        self.model_id = model_id
        self.token = token
        self.timeout = timeout
        self._session = requests.Session()

    def predict(self, image):
        buf = io.BytesIO()
        image.convert("RGB").save(buf, format="JPEG")
        payload = buf.getvalue()

        start = time.perf_counter()
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                resp = self._session.post(
                    self.ROUTER_URL.format(model_id=self.model_id),
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "Content-Type": "image/jpeg",
                    },
                    timeout=self.timeout,
                )
            except Exception as exc:  # network errors: retry with backoff
                last_error = exc
                time.sleep(min(2 ** (attempt + 1), 10))
                continue

            if resp.status_code == 503:  # model cold-starting on HF workers
                time.sleep(min(2 ** (attempt + 1), 10))
                continue

            if resp.status_code != 200:
                try:
                    msg = resp.json().get("error", resp.text[:200])
                except Exception:
                    msg = resp.text[:200]
                raise HFInferenceError(resp.status_code, msg)

            data = resp.json()
            ranked = [
                (str(item["label"]), float(item["score"]))
                for item in data
                if isinstance(item, dict) and "label" in item
            ]
            ranked.sort(key=lambda t: t[1], reverse=True)
            ranked = ranked[:3]
            inference_ms = (time.perf_counter() - start) * 1000.0
            return ranked, inference_ms

        raise HFInferenceError(503, f"Hosted model unavailable after retries: {last_error}")

    def close(self):
        self._session.close()


def create_model_service(
    model_id: str,
    provider: str = "local",
    device: str = "auto",
    dtype: str = "auto",
    hf_token: str = "",
):
    if provider == "hf_api":
        if not hf_token:
            raise RuntimeError("HF_TOKEN is required when FOODLENS_INFERENCE_PROVIDER=hf_api")
        logger.info("Using Hugging Face hosted inference for '%s'", model_id)
        return HFApiClassificationService(model_id, hf_token)
    if provider == "local":
        logger.info("Using local inference for '%s'", model_id)
        return FoodClassificationService(model_id, device, dtype)
    raise RuntimeError(f"Unknown FOODLENS_INFERENCE_PROVIDER '{provider}' (expected local|hf_api)")