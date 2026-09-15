import abc
import logging
import time

import torch
from PIL import Image
from transformers import AutoFeatureExtractor, AutoImageProcessor, AutoModelForImageClassification

logger = logging.getLogger(__name__)


class AIModelService(abc.ABC):
    """Base interface for AI image services.

    FoodClassificationService implements this today.
    A future FoodDetectionService (e.g. YOLO/segmentation) can implement the
    same interface without rewriting the application.
    """

    @abc.abstractmethod
    def predict(self, image: Image.Image):
        raise NotImplementedError


class FoodClassificationService(AIModelService):
    """ViT image classifier for Food-101 food categories."""

    def __init__(self, model_id: str, device: str = "auto"):
        self.model_id = model_id
        self.device = self._resolve_device(device)
        self.processor, self.model = self._load(model_id)
        self.model.to(self.device)
        self.model.eval()
        self.n_classes = self.model.config.num_labels
        self.id2label = {int(k): v for k, v in self.model.config.id2label.items()}
        logger.info(
            "Loaded food classifier '%s' on %s with %d classes",
            model_id,
            self.device,
            self.n_classes,
        )

    @staticmethod
    def _resolve_device(device: str) -> str:
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        if device in {"cuda", "cpu"}:
            return device
        logger.warning("Unknown device '%s', falling back to cpu", device)
        return "cpu"

    @staticmethod
    def _load(model_id: str):
        try:
            processor = AutoImageProcessor.from_pretrained(model_id)
        except Exception:
            processor = AutoFeatureExtractor.from_pretrained(model_id)
        model = AutoModelForImageClassification.from_pretrained(model_id)
        return processor, model

    def predict(self, image: Image.Image):
        """Run inference and return (ranked_predictions, inference_time_ms).

        ranked_predictions: [(label, score), ...] sorted descending by score
        (up to 3 entries).
        """
        start = time.perf_counter()
        inputs = self.processor(images=image.convert("RGB"), return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.model(**inputs)
        probs = torch.softmax(outputs.logits[0], dim=-1)
        topk = torch.topk(probs, k=min(3, self.n_classes))
        ranked = [
            (self.id2label[int(idx.item())], float(score.item()))
            for score, idx in zip(topk.values, topk.indices)
        ]
        inference_ms = (time.perf_counter() - start) * 1000.0
        return ranked, inference_ms